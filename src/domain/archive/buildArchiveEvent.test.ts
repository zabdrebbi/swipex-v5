import { describe, expect, it } from 'vitest';
import { buildArchiveEvent } from './buildArchiveEvent';
import type { Parcel } from '../parcel/types';

function parcel(overrides: Partial<Parcel>): Parcel {
  return {
    tracking: 'YAL-TEST0001',
    receiver: 'KHELIL MOHAMED',
    phone: '0661234567',
    municipality: 'BIR EL DJIR',
    amount: 4500,
    type: 'E-COMMERCE',
    status: 'delivered',
    statusUpdatedAt: '2026-05-12T10:00:00.000Z',
    createdAt: '2026-05-12T08:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
    sortOrder: 0,
    smsSent: true,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
    ...overrides,
  };
}

describe('buildArchiveEvent', () => {
  it('copies the caller timestamp and archived date', () => {
    const event = buildArchiveEvent(parcel({}), '2026-05-11', '2026-05-12T00:01:00.000Z');
    expect(event.archivedDate).toBe('2026-05-11');
    expect(event.lastUpdate).toBe('2026-05-12T00:01:00.000Z');
  });

  it('carries the snapshot fields needed by the archive list', () => {
    const event = buildArchiveEvent(parcel({ notes: 'customer note', tag: 'urgent' }), '2026-05-11', 'now');
    expect(event.status).toBe('delivered');
    expect(event.amount).toBe(4500);
    expect(event.municipality).toBe('BIR EL DJIR');
    expect(event.smsSent).toBe(true);
    expect(event.notes).toBe('customer note');
    expect(event.tag).toBe('urgent');
    expect(event.receiver).toBe('KHELIL MOHAMED');
    expect(event.phone).toBe('0661234567');
    expect(event.type).toBe('E-COMMERCE');
    expect(event.createdDate).toBeUndefined();
  });

  it('omits empty optional fields so Firestore documents stay small', () => {
    const event = buildArchiveEvent(parcel({ notes: '', wilaya: '', phone2: undefined }), 'd', 'n');
    expect(event).not.toHaveProperty('notes');
    expect(event).not.toHaveProperty('wilaya');
    expect(event).not.toHaveProperty('phone2');
    expect(event).not.toHaveProperty('location');
  });

  it('keeps multi-piece data', () => {
    const event = buildArchiveEvent(
      parcel({
        isMultiPiece: true,
        piecesCount: 3,
        subTrackings: [{ tracking: 'YAL-1', pin: '111' }, { tracking: 'YAL-2' }, { tracking: 'YAL-3' }],
      }),
      'd',
      'n',
    );
    expect(event.piecesCount).toBe(3);
    expect(event.subTrackings).toHaveLength(3);
    expect(event.subTrackings[0].pin).toBe('111');
  });
});
