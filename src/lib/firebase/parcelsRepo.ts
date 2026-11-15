import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from './index';
import { parcelsCollection } from '@/domain/firestore/paths';
import { parcelFromDoc, parcelToDoc } from '@/domain/firestore/convertParcel';
import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';

/** Creates a full document (add) or overwrites one (edit of an existing tracking). */
export async function upsertParcel(uid: string, parcel: Parcel): Promise<void> {
  const { db } = getFirebase();
  await setDoc(doc(db, parcelsCollection(uid), parcel.tracking), parcelToDoc(parcel));
}

/** Writes only the listed fields (partial update with merge). */
export async function patchParcel(
  uid: string,
  tracking: string,
  patch: Partial<Parcel>,
): Promise<void> {
  const { db } = getFirebase();
  await setDoc(doc(db, parcelsCollection(uid), tracking), parcelToDoc(patch as Parcel), {
    merge: true,
  });
}

/** Atomic multi-delete: one batch per call (keeps Spark writes predictable). */
export async function deleteParcels(uid: string, trackings: string[]): Promise<void> {
  if (trackings.length === 0) return;
  const { db } = getFirebase();
  const batch = writeBatch(db);
  for (const tracking of trackings) {
    batch.delete(doc(db, parcelsCollection(uid), tracking));
  }
  await batch.commit();
}

/** Firestore caps a batch at 500 operations; one parcel costs exactly one. */
const MAX_STATUS_RESETS_PER_BATCH = 400;

/**
 * Atomic status reset for many parcels at once (used when a custom status is
 * deleted): only `status`/timestamps are written, one batch per chunk.
 */
export async function resetParcelsStatus(
  uid: string,
  trackings: string[],
  status: StatusRef,
): Promise<void> {
  if (trackings.length === 0) return;
  const { db } = getFirebase();
  const now = new Date().toISOString();
  for (let start = 0; start < trackings.length; start += MAX_STATUS_RESETS_PER_BATCH) {
    const batch = writeBatch(db);
    for (const tracking of trackings.slice(start, start + MAX_STATUS_RESETS_PER_BATCH)) {
      batch.set(
        doc(db, parcelsCollection(uid), tracking),
        { status, statusUpdatedAt: now, updatedAt: now },
        { merge: true },
      );
    }
    await batch.commit();
  }
}

/** Atomic reorder: only documents whose sortOrder actually changed are written. */
export async function saveReorder(
  uid: string,
  ordered: Parcel[],
  previous: Map<string, number>,
): Promise<void> {
  const changed = ordered.filter((p) => previous.get(p.tracking) !== p.sortOrder);
  if (changed.length === 0) return;
  const { db } = getFirebase();
  const batch = writeBatch(db);
  for (const parcel of changed) {
    batch.set(
      doc(db, parcelsCollection(uid), parcel.tracking),
      { sortOrder: parcel.sortOrder },
      { merge: true },
    );
  }
  await batch.commit();
}

export type ParcelsLoad = { status: 'loading' } | { status: 'ready' } | { status: 'error' };

/**
 * The single realtime listener over `parcels_v2` (architecture rule: exactly
 * one active-parcels listener; the archive never gets one). Emits `loading`
 * first, then the full sorted-ready state on every local/remote change; the
 * persistent IndexedDB cache makes the first emit work offline.
 */
export function subscribeParcels(
  uid: string,
  onLoad: (load: ParcelsLoad) => void,
  onParcels: (parcels: Parcel[]) => void,
  onError: () => void,
): Unsubscribe {
  const { db } = getFirebase();
  const now = new Date().toISOString();
  onLoad({ status: 'loading' });
  return onSnapshot(
    collection(db, parcelsCollection(uid)),
    (snapshot) => {
      const parcels = snapshot.docs.map((d) => parcelFromDoc(d.id, d.data(), now));
      onParcels(parcels);
      onLoad({ status: 'ready' });
    },
    () => onError(),
  );
}
