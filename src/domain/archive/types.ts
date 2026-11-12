import type { ParcelLocation, OpeningAllowed, SubPiece } from '../parcel/types';
import type { StatusRef } from '../status/types';

/** One day's snapshot of a parcel, appended when the working day is archived. */
export interface ArchiveEvent {
  /** ISO timestamp of this event (used for ordering newest-first). */
  lastUpdate: string;
  /** Date the event belongs to, `YYYY-MM-DD`. */
  archivedDate: string;
  status: StatusRef;
  statusUpdatedAt: string;
  notes?: string;
  tag?: string;
  location?: ParcelLocation;
  amount: number;
  municipality: string;
  wilaya?: string;
  receiver?: string;
  phone?: string;
  phone2?: string;
  smsSent: boolean;
  senderSmsSent: boolean;
  sender?: string;
  senderPhone?: string;
  type?: string;
  content?: string;
  createdDate?: string;
  isMultiPiece: boolean;
  piecesCount: number;
  subTrackings: SubPiece[];
  openingAllowed: OpeningAllowed;
}

/** Per-tracking archive record: full history plus the newest event for fast access. */
export interface ArchiveEntry {
  tracking: string;
  /** Newest first. */
  events: ArchiveEvent[];
  latest: ArchiveEvent;
}
