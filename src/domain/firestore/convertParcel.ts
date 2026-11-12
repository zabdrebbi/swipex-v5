import type { ArchiveEvent, ArchiveEntry } from '../archive/types';
import type { Parcel, ParcelLocation, SubPiece, OpeningAllowed, LocationSource } from '../parcel/types';
import { DEFAULT_STATUS } from '../status/statuses';
import type { StatusRef } from '../status/types';
import { sanitizeRecord } from './serialize';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value === '') return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

const LOCATION_SOURCES: readonly LocationSource[] = ['gps', 'map', 'manual'];

export function normalizeLocation(value: unknown): ParcelLocation | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  const lat = num(raw.lat, Number.NaN);
  const lng = num(raw.lng, Number.NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const source = LOCATION_SOURCES.includes(raw.source as LocationSource)
    ? (raw.source as LocationSource)
    : 'manual';
  const location: ParcelLocation = { lat, lng, source, updatedAt: isoDate(raw.updatedAt, '') };
  const label = optStr(raw.label);
  const address = optStr(raw.address);
  const mapsUrl = optStr(raw.mapsUrl);
  if (label !== undefined) location.label = label;
  if (address !== undefined) location.address = address;
  if (mapsUrl !== undefined) location.mapsUrl = mapsUrl;
  return location;
}

export function normalizeSubPieces(value: unknown): SubPiece[] {
  if (!Array.isArray(value)) return [];
  const pieces: SubPiece[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const tracking = str(raw.tracking).trim();
    if (tracking === '') continue;
    const piece: SubPiece = { tracking };
    const pin = optStr(raw.pin);
    if (pin !== undefined) piece.pin = pin;
    pieces.push(piece);
  }
  return pieces;
}

function normalizeOpeningAllowed(value: unknown): OpeningAllowed {
  return typeof value === 'boolean' ? value : null;
}

function normalizeStatus(value: unknown): StatusRef {
  return typeof value === 'string' && value !== '' ? (value as StatusRef) : DEFAULT_STATUS;
}

/** Builds the domain model from any stored shape; unknown fields are ignored. */
export function parcelFromDoc(id: string, data: Record<string, unknown>, now: string): Parcel {
  const tracking = str(data.tracking, id).trim() || id;
  const parcel: Parcel = {
    tracking,
    receiver: str(data.receiver),
    phone: str(data.phone),
    municipality: str(data.municipality),
    amount: num(data.amount),
    type: str(data.type),
    status: normalizeStatus(data.status),
    statusUpdatedAt: isoDate(data.statusUpdatedAt, now),
    createdAt: isoDate(data.createdAt, now),
    updatedAt: isoDate(data.updatedAt, now),
    sortOrder: num(data.sortOrder),
    smsSent: bool(data.smsSent),
    senderSmsSent: bool(data.senderSmsSent),
    isMultiPiece: bool(data.isMultiPiece),
    piecesCount: num(data.piecesCount, 1),
    subTrackings: normalizeSubPieces(data.subTrackings),
    openingAllowed: normalizeOpeningAllowed(data.openingAllowed),
  };
  const fields = {
    phone2: optStr(data.phone2),
    address: optStr(data.address),
    wilaya: optStr(data.wilaya),
    content: optStr(data.content),
    pin: optStr(data.pin),
    notes: optStr(data.notes),
    tag: optStr(data.tag),
    sender: optStr(data.sender),
    senderPhone: optStr(data.senderPhone),
    senderPhone2: optStr(data.senderPhone2),
    senderAddress: optStr(data.senderAddress),
    createdDate: optStr(data.createdDate),
    reminderTime: optStr(data.reminderTime),
  } as const;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) (parcel as unknown as Record<string, unknown>)[key] = value;
  }
  if (bool(data.reminderTriggered)) parcel.reminderTriggered = true;
  const location = normalizeLocation(data.location);
  if (location !== undefined) parcel.location = location;
  return parcel;
}

/** Domain model -> sanitised Firestore document body (id lives in the path). */
export function parcelToDoc(parcel: Parcel): Record<string, unknown> {
  return sanitizeRecord(parcel as unknown as Record<string, unknown>) as Record<string, unknown>;
}

function archiveEventFromRaw(data: Record<string, unknown>, fallbackDate: string): ArchiveEvent | null {
  const lastUpdate = optStr(data.lastUpdate);
  const status = data.status;
  if (lastUpdate === undefined || typeof status !== 'string') return null;
  const event: ArchiveEvent = {
    lastUpdate,
    archivedDate: str(data.archivedDate, fallbackDate),
    status: normalizeStatus(status),
    statusUpdatedAt: isoDate(data.statusUpdatedAt, lastUpdate),
    amount: num(data.amount),
    municipality: str(data.municipality),
    smsSent: bool(data.smsSent),
    senderSmsSent: bool(data.senderSmsSent),
    isMultiPiece: bool(data.isMultiPiece),
    piecesCount: num(data.piecesCount, 1),
    subTrackings: normalizeSubPieces(data.subTrackings),
    openingAllowed: normalizeOpeningAllowed(data.openingAllowed),
  };
  const optional = {
    notes: optStr(data.notes),
    tag: optStr(data.tag),
    wilaya: optStr(data.wilaya),
    receiver: optStr(data.receiver),
    phone: optStr(data.phone),
    phone2: optStr(data.phone2),
    sender: optStr(data.sender),
    senderPhone: optStr(data.senderPhone),
    type: optStr(data.type),
    content: optStr(data.content),
    createdDate: optStr(data.createdDate),
  } as const;
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) (event as unknown as Record<string, unknown>)[key] = value;
  }
  const location = normalizeLocation(data.location);
  if (location !== undefined) event.location = location;
  return event;
}

/** Normalises an archive document into newest-first order with a `latest` shortcut. */
export function archiveEntryFromDoc(tracking: string, data: Record<string, unknown>): ArchiveEntry | null {
  const rawEvents = Array.isArray(data.events) ? data.events : [];
  const events: ArchiveEvent[] = [];
  for (const item of rawEvents) {
    if (typeof item !== 'object' || item === null) continue;
    const event = archiveEventFromRaw(item as Record<string, unknown>, tracking);
    if (event !== null) events.push(event);
  }
  if (events.length === 0) return null;
  events.sort((a, b) => (a.lastUpdate < b.lastUpdate ? 1 : a.lastUpdate > b.lastUpdate ? -1 : 0));
  return { tracking, events, latest: events[0] };
}

export function archiveEntryToDoc(entry: ArchiveEntry): Record<string, unknown> {
  return sanitizeRecord({ events: entry.events }) as Record<string, unknown>;
}
