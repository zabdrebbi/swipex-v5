import { useSettings } from '@/features/settings/SettingsProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useUser } from '@/features/auth/AuthProvider';
import { archiveDayParcels } from '@/lib/firebase/archiveRepo';
import type { Parcel } from '@/domain/parcel/types';
import { useEffect, useRef } from 'react';

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * In-flight guard: the mount effect and a PDF import may both notice a stale
 * `sessionDate`; sharing one promise guarantees the day is archived exactly
 * once (double archiving would append duplicate events).
 */
let inFlight: Promise<void> | null = null;

/**
 * v4's `ensureCurrentWorkDay`: archives the whole active list when the stored
 * `sessionDate` belongs to an older day, then advances the date. Resolves
 * immediately when the day is already current.
 */
export function ensureWorkDay(
  uid: string,
  sessionDate: string,
  parcels: Parcel[],
  today = todayString(),
): Promise<void> {
  if (inFlight !== null) return inFlight;
  if (sessionDate === today) return Promise.resolve();
  inFlight = archiveDayParcels(uid, parcels, sessionDate, today).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Runs `ensureWorkDay` once the first settings+parcels load completes, then
 * syncs the in-memory `sessionDate` (the batch already persisted it).
 * Writing earlier could archive a half-loaded list — hence both guards.
 */
export function useNewDayArchive(): void {
  const { status: settingsStatus, settings, updateSettings } = useSettings();
  const { status: parcelsStatus, parcels } = useParcels();
  const user = useUser();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (settingsStatus !== 'ready' || parcelsStatus !== 'ready') return;
    startedRef.current = true;

    const today = todayString();
    ensureWorkDay(user.uid, settings.sessionDate, parcels, today)
      .then(() => {
        if (settings.sessionDate !== today) {
          // Patch writes only this key (never the whole settings document).
          updateSettings({ sessionDate: today });
        }
      })
      .catch(() => {
        // Nothing persisted for the failed chunk (batches are atomic) and the
        // date stayed stale, so the next launch retries with the full list.
        startedRef.current = false;
      });
  }, [settingsStatus, parcelsStatus, settings.sessionDate, parcels, user.uid, updateSettings]);
}
