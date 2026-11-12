import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';
import { moveParcel, nextSortOrder, sortParcels } from '@/domain/parcel/order';
import { deleteParcels, patchParcel, saveReorder, subscribeParcels, upsertParcel } from '@/lib/firebase/parcelsRepo';
import { useUser } from '@/features/auth/AuthProvider';

export type ParcelsStatus = 'loading' | 'ready' | 'error';

interface ParcelsContextValue {
  status: ParcelsStatus;
  /** Always sorted by manual order (same array reference until data changes). */
  parcels: Parcel[];
  addParcel: (parcel: Parcel) => void;
  /**
   * Partial update. When `patch.tracking` changes the identity, the parcel is
   * moved to a new document (upsert + immediate delete of the old one) because
   * the Firestore document id IS the tracking number.
   */
  updateParcel: (tracking: string, patch: Partial<Parcel>) => void;
  removeParcels: (trackings: string[]) => void;
  /** Writes only `status` + `statusUpdatedAt`. */
  changeStatus: (tracking: string, status: StatusRef) => void;
  /** Manual drag-reorder: moves `tracking` to `toIndex` and renumbers. */
  reorder: (tracking: string, toIndex: number) => void;
}

const ParcelsContext = createContext<ParcelsContextValue | null>(null);

const FLUSH_DELAY_MS = 400;

export function ParcelsProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const uid = user.uid;
  const [status, setStatus] = useState<ParcelsStatus>('loading');
  const [parcels, setParcels] = useState<Parcel[]>([]);

  /** Full upserts queued for the next flush (latest wins per tracking). */
  const pendingUpserts = useRef(new Map<string, Parcel>());
  /** Partial field patches queued per tracking (merged across flushes). */
  const pendingPatches = useRef(new Map<string, Partial<Parcel>>());
  /**
   * Trackings whose LOCAL state is authoritative until the cloud echoes it:
   * pending upserts/patches (so a pre-write snapshot cannot flash stale data)
   * and pending deletes (so a snapshot taken before the delete lands cannot
   * resurrect the parcel).
   */
  const localOnly = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const upserts = [...pendingUpserts.current.values()];
    const superseded = new Set(upserts.map((p) => p.tracking));
    // A queued full upsert already contains the latest fields: drop its patches.
    const patches = [...pendingPatches.current.entries()].filter(
      ([tracking]) => !superseded.has(tracking),
    );
    pendingUpserts.current = new Map();
    pendingPatches.current = new Map();
    for (const parcel of upserts) {
      void upsertParcel(uid, parcel).catch(() => {
        // The listener will never echo our change: release local authority so
        // the next snapshot restores the true (server) state.
        localOnly.current.delete(parcel.tracking);
      });
    }
    for (const [tracking, patch] of patches) {
      void patchParcel(uid, tracking, patch).catch(() => {
        localOnly.current.delete(tracking);
      });
    }
  }, [uid]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
  }, [flush]);

  // The one and only realtime listener for active parcels.
  useEffect(() => {
    const unsubscribe = subscribeParcels(
      uid,
      (load) => {
        if (load.status === 'loading') setStatus('loading');
        else if (load.status === 'ready') setStatus('ready');
        else setStatus('error');
      },
      (incoming) => {
        setParcels((current) => {
          const incomingByTracking = new Map(incoming.map((p) => [p.tracking, p]));
          const localByTracking = new Map(current.map((p) => [p.tracking, p]));

          // Release local authority once the server confirms (or the parcel is
          // gone after a successful delete); before that our copy wins.
          for (const tracking of [...localOnly.current]) {
            const local = localByTracking.get(tracking);
            const remote = incomingByTracking.get(tracking);
            if (local === undefined && remote === undefined) {
              localOnly.current.delete(tracking); // delete echoed
            } else if (local !== undefined && remote !== undefined && remote.updatedAt >= local.updatedAt) {
              localOnly.current.delete(tracking); // our write echoed
            }
          }

          const merged = new Map(incomingByTracking);
          for (const tracking of localOnly.current) {
            const local = localByTracking.get(tracking);
            if (local !== undefined) merged.set(tracking, local);
            else merged.delete(tracking); // pending delete: keep hidden
          }
          return sortParcels([...merged.values()]);
        });
      },
      () => setStatus('error'),
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const addParcel = useCallback(
    (parcel: Parcel) => {
      const withOrder: Parcel = { ...parcel, sortOrder: nextSortOrder(parcels) };
      setParcels(sortParcels([...parcels, withOrder]));
      localOnly.current.add(withOrder.tracking);
      pendingUpserts.current.set(withOrder.tracking, withOrder);
      scheduleFlush();
    },
    [parcels, scheduleFlush],
  );

  const updateParcel = useCallback(
    (tracking: string, patch: Partial<Parcel>) => {
      const now = new Date().toISOString();
      const current = parcels.find((p) => p.tracking === tracking);
      if (current === undefined) return;
      const renamed = typeof patch.tracking === 'string' && patch.tracking !== tracking;
      const updated: Parcel = { ...current, ...patch, updatedAt: patch.updatedAt ?? now };

      setParcels(sortParcels(parcels.map((p) => (p.tracking === tracking ? updated : p))));

      if (renamed) {
        // Identity change = new document id: upsert the new doc, delete the old.
        localOnly.current.add(updated.tracking);
        localOnly.current.add(tracking);
        pendingPatches.current.delete(tracking);
        pendingUpserts.current.delete(tracking);
        pendingUpserts.current.set(updated.tracking, updated);
        void deleteParcels(uid, [tracking]).catch(() => {
          localOnly.current.delete(tracking);
        });
        scheduleFlush();
        return;
      }

      localOnly.current.add(tracking);
      pendingPatches.current.set(tracking, { ...pendingPatches.current.get(tracking), ...patch });
      scheduleFlush();
    },
    [parcels, scheduleFlush, uid],
  );

  const removeParcels = useCallback(
    (trackings: string[]) => {
      const ids = new Set(trackings);
      setParcels(sortParcels(parcels.filter((p) => !ids.has(p.tracking))));
      // Deletes are written immediately: an optimistically hidden parcel that
      // reappears would feel broken, unlike a value change.
      trackings.forEach((t) => {
        localOnly.current.add(t);
        pendingUpserts.current.delete(t);
        pendingPatches.current.delete(t);
      });
      void deleteParcels(uid, trackings).catch(() =>
        trackings.forEach((t) => localOnly.current.delete(t)),
      );
    },
    [parcels, uid],
  );

  const changeStatus = useCallback(
    (tracking: string, status: StatusRef) => {
      const now = new Date().toISOString();
      updateParcel(tracking, { status, statusUpdatedAt: now, updatedAt: now });
    },
    [updateParcel],
  );

  const reorder = useCallback(
    (tracking: string, toIndex: number) => {
      const ordered = sortParcels(parcels);
      const previousOrder = new Map(ordered.map((p) => [p.tracking, p.sortOrder]));
      const next = moveParcel(ordered, tracking, toIndex);
      if (next === ordered) return;
      setParcels(next);
      void saveReorder(uid, next, previousOrder).catch(() => undefined);
    },
    [parcels, uid],
  );

  const value = useMemo<ParcelsContextValue>(
    () => ({ status, parcels, addParcel, updateParcel, removeParcels, changeStatus, reorder }),
    [status, parcels, addParcel, updateParcel, removeParcels, changeStatus, reorder],
  );

  return <ParcelsContext.Provider value={value}>{children}</ParcelsContext.Provider>;
}

export function useParcels(): ParcelsContextValue {
  const ctx = useContext(ParcelsContext);
  if (!ctx) throw new Error('useParcels must be used inside <ParcelsProvider>');
  return ctx;
}
