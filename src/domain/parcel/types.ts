import type { StatusRef } from '../status/types';

export type LocationSource = 'gps' | 'map' | 'manual';

export interface ParcelLocation {
  label?: string;
  address?: string;
  lat: number;
  lng: number;
  mapsUrl?: string;
  source: LocationSource;
  updatedAt: string;
}

/** One piece of a multi-piece shipment (Yalidine group). */
export interface SubPiece {
  tracking: string;
  pin?: string;
}

/** `true` = opening allowed, `false` = forbidden, `null` = unknown (older labels). */
export type OpeningAllowed = boolean | null;

/**
 * A delivery parcel. Identity is `tracking` (trimmed, non-empty): it is also the
 * Firestore document id. UI-only state (e.g. expanded) never lives here.
 */
export interface Parcel {
  tracking: string;
  receiver: string;
  phone: string;
  phone2?: string;
  address?: string;
  municipality: string;
  wilaya?: string;
  amount: number;
  content?: string;
  /** Label type from the carrier (e.g. E-COMMERCE); free text, not translated. */
  type: string;
  pin?: string;
  status: StatusRef;
  statusUpdatedAt: string;
  notes?: string;
  /** Tag name (without the '@' prefix); must match `TagDef.name`. */
  tag?: string;
  sender?: string;
  senderPhone?: string;
  senderPhone2?: string;
  senderAddress?: string;
  /** Date printed on the label, `YYYY-MM-DD`. */
  createdDate?: string;
  createdAt: string;
  updatedAt: string;
  /** Manual drag-reorder index (ascending). */
  sortOrder: number;
  /** SMS sent to the receiver. */
  smsSent: boolean;
  /** SMS sent to the sender (used by the wrong-number flow). */
  senderSmsSent: boolean;
  isMultiPiece: boolean;
  piecesCount: number;
  subTrackings: SubPiece[];
  openingAllowed: OpeningAllowed;
  location?: ParcelLocation;
  /** ISO timestamp of the reminder shown on the card. */
  reminderTime?: string;
  reminderTriggered?: boolean;
}
