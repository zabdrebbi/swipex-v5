import type { Parcel } from '../parcel/types';
import type { ArchiveEvent } from './types';

/**
 * Snapshots one parcel into an archive event. Called inside the new-day
 * writeBatch: `lastUpdate`/`archivedDate` come from the caller so a whole day
 * gets one consistent timestamp.
 */
export function buildArchiveEvent(parcel: Parcel, archivedDate: string, now: string): ArchiveEvent {
  const event: ArchiveEvent = {
    lastUpdate: now,
    archivedDate,
    status: parcel.status,
    statusUpdatedAt: parcel.statusUpdatedAt,
    amount: parcel.amount,
    municipality: parcel.municipality,
    smsSent: parcel.smsSent,
    senderSmsSent: parcel.senderSmsSent,
    isMultiPiece: parcel.isMultiPiece,
    piecesCount: parcel.piecesCount,
    subTrackings: parcel.subTrackings,
    openingAllowed: parcel.openingAllowed,
  };

  const optional = {
    notes: parcel.notes,
    tag: parcel.tag,
    location: parcel.location,
    wilaya: parcel.wilaya,
    receiver: parcel.receiver,
    phone: parcel.phone,
    phone2: parcel.phone2,
    sender: parcel.sender,
    senderPhone: parcel.senderPhone,
    type: parcel.type,
    content: parcel.content,
    createdDate: parcel.createdDate,
  } as const;
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined && value !== '') {
      (event as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return event;
}
