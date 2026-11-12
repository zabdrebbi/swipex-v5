import { describe, expect, it } from 'vitest';
import type { Parcel } from '../parcel/types';
import { archiveEntryFromDoc, archiveEntryToDoc, parcelFromDoc, parcelToDoc } from './convertParcel';

const NOW = '2026-11-12T10:00:00.000Z';

function makeParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    tracking: 'YAL123456',
    receiver: 'Ali Benali',
    phone: '0555123456',
    municipality: 'Bab Ezzouar',
    amount: 2500,
    type: 'E-COMMERCE',
    status: 'waiting',
    statusUpdatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    sortOrder: 3,
    smsSent: false,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
    ...overrides,
  };
}

describe('parcel converters', () => {
  it('round-trips a parcel without losing fields', () => {
    const parcel = makeParcel({
      notes: 'call first',
      tag: 'urgent',
      phone2: '0661122334',
      location: { lat: 36.7, lng: 3.05, source: 'gps', updatedAt: NOW },
      subTrackings: [{ tracking: 'CMP-1', pin: '1234' }],
      isMultiPiece: true,
      piecesCount: 2,
      openingAllowed: true,
    });
    const doc = parcelToDoc(parcel);
    const restored = parcelFromDoc(parcel.tracking, doc, NOW);
    expect(restored).toEqual(parcel);
  });

  it('keeps tracking as document id when the field is missing', () => {
    const restored = parcelFromDoc('YAL999', {}, NOW);
    expect(restored.tracking).toBe('YAL999');
    expect(restored.status).toBe('no_action');
    expect(restored.piecesCount).toBe(1);
    expect(restored.openingAllowed).toBeNull();
  });

  it('drops malformed optional fields and invalid dates', () => {
    const restored = parcelFromDoc('YAL1', {
      createdAt: 'not-a-date',
      phone2: 42,
      location: { lat: 'x', lng: 3 },
      amount: Number.NaN,
    }, NOW);
    expect(restored.createdAt).toBe(NOW);
    expect(restored.phone2).toBeUndefined();
    expect(restored.location).toBeUndefined();
    expect(restored.amount).toBe(0);
  });

  it('writes JSON-safe documents (no undefined or NaN)', () => {
    const doc = parcelToDoc(makeParcel({ wilaya: undefined, amount: Number.NaN }));
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
    expect(doc.amount).toBeNull();
    expect('wilaya' in doc).toBe(false);
  });
});

describe('archive converters', () => {
  const event = {
    lastUpdate: '2026-11-10T08:00:00.000Z',
    archivedDate: '2026-11-10',
    status: 'delivered',
    statusUpdatedAt: '2026-11-10T07:00:00.000Z',
    amount: 3000,
    municipality: 'Oran',
    smsSent: true,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
  };

  it('sorts events newest-first and exposes latest', () => {
    const older = { ...event, lastUpdate: '2026-11-09T08:00:00.000Z', status: 'waiting' };
    const entry = archiveEntryFromDoc('YAL1', { events: [event, older] });
    expect(entry).not.toBeNull();
    expect(entry!.events).toHaveLength(2);
    expect(entry!.events[0].lastUpdate).toBe('2026-11-10T08:00:00.000Z');
    expect(entry!.latest.status).toBe('delivered');
    expect(entry!.tracking).toBe('YAL1');
  });

  it('returns null for empty or malformed entries', () => {
    expect(archiveEntryFromDoc('YAL1', {})).toBeNull();
    expect(archiveEntryFromDoc('YAL1', { events: [{ noLastUpdate: true }] })).toBeNull();
  });

  it('round-trips through sanitised documents', () => {
    const entry = archiveEntryFromDoc('YAL1', { events: [event] })!;
    const doc = archiveEntryToDoc(entry);
    const restored = archiveEntryFromDoc('YAL1', doc);
    expect(restored).toEqual(entry);
  });
});
