import {
  arrayUnion,
  collection,
  doc,
  documentId,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebase } from './index';
import { archiveCollection, archiveDoc, parcelDoc, settingsDoc } from '@/domain/firestore/paths';
import { buildArchiveEvent } from '@/domain/archive/buildArchiveEvent';
import { archiveEntryFromDoc } from '@/domain/firestore/convertParcel';
import type { ArchiveEntry } from '@/domain/archive/types';
import type { Parcel } from '@/domain/parcel/types';

/**
 * Firestore hard-caps a batch at 500 operations; one parcel costs 2
 * (archive write + parcel delete), so a day is split into chunks of 249.
 * The settings `sessionDate` update rides in the LAST chunk: if anything
 * fails midway, the date never advances and the next launch retries only
 * the parcels that are still present (already-archived ones are gone).
 */
const MAX_PARCELS_PER_BATCH = 249;

/**
 * Archives the whole working day and clears it in one atomic pass per chunk:
 * per parcel -> append one event to `archive_v2/{tracking}` (arrayUnion, no
 * read needed) and delete the active parcel document.
 */
export async function archiveDayParcels(
  uid: string,
  parcels: Parcel[],
  archivedDate: string,
  nextSessionDate: string,
): Promise<void> {
  if (parcels.length === 0) {
    await writeSessionDate(uid, nextSessionDate);
    return;
  }

  const { db } = getFirebase();
  const now = new Date().toISOString();

  for (let start = 0; start < parcels.length; start += MAX_PARCELS_PER_BATCH) {
    const chunk = parcels.slice(start, start + MAX_PARCELS_PER_BATCH);
    const isLastChunk = start + chunk.length >= parcels.length;
    const batch = writeBatch(db);

    for (const parcel of chunk) {
      const event = buildArchiveEvent(parcel, archivedDate, now);
      const archiveRef = doc(db, archiveDoc(uid, parcel.tracking));
      // arrayUnion appends without reading the existing events array.
      batch.set(archiveRef, { events: arrayUnion(event), latest: event }, { merge: true });
      batch.delete(doc(db, parcelDoc(uid, parcel.tracking)));
    }

    if (isLastChunk) {
      batch.set(doc(db, settingsDoc(uid)), { sessionDate: nextSessionDate }, { merge: true });
    }

    await batch.commit();
  }
}

async function writeSessionDate(uid: string, sessionDate: string): Promise<void> {
  const { db } = getFirebase();
  await writeBatch(db)
    .set(doc(db, settingsDoc(uid)), { sessionDate }, { merge: true })
    .commit();
}

/**
 * Reads archive entries for a set of trackings in chunks of 30 (Firestore `in`
 * limit). Used by PDF import to restore sms/notes/history for re-imported
 * labels without subscribing to the archive.
 */
export async function getArchiveEntries(
  uid: string,
  trackings: string[],
): Promise<Map<string, ArchiveEntry>> {
  const result = new Map<string, ArchiveEntry>();
  if (trackings.length === 0) return result;

  const { db } = getFirebase();
  const CHUNK = 30;
  for (let start = 0; start < trackings.length; start += CHUNK) {
    const chunk = trackings.slice(start, start + CHUNK);
    const snapshot = await getDocs(
      query(collection(db, archiveCollection(uid)), where(documentId(), 'in', chunk)),
    );
    for (const d of snapshot.docs) {
      const entry = archiveEntryFromDoc(d.id, d.data());
      if (entry !== null) result.set(d.id, entry);
    }
  }
  return result;
}
