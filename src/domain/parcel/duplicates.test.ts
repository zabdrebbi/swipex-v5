import { describe, expect, it } from 'vitest';
import type { Parcel } from './types';
import { duplicatePhoneCounts, duplicateTrackings } from './duplicates';

const NOW = '2026-11-13T10:00:00.000Z';

function parcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    tracking: 'YAL-0000000001',
    receiver: 'Amine',
    phone: '0550123456',
    municipality: 'Alger',
    amount: 1000,
    type: 'E-COMMERCE',
    status: 'no_action',
    statusUpdatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    sortOrder: 0,
    smsSent: false,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
    ...overrides,
  };
}

describe('duplicatePhoneCounts', () => {
  it('returns 0 for every parcel when no phone repeats', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '0550000001' }),
      parcel({ tracking: 'B', phone: '0550000002' }),
    ];
    expect(duplicatePhoneCounts(parcels)).toEqual(new Map([
      ['A', 0],
      ['B', 0],
    ]));
  });

  it('counts each distinct OTHER parcel once even when both phones match', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '0550000001', phone2: '0660000001' }),
      parcel({ tracking: 'B', phone: '0550000001', phone2: '0660000001' }),
    ];
    expect(duplicatePhoneCounts(parcels).get('A')).toBe(1);
    expect(duplicatePhoneCounts(parcels).get('B')).toBe(1);
  });

  it('counts a three-way share as two others', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '0550000001' }),
      parcel({ tracking: 'B', phone: '0550000001' }),
      parcel({ tracking: 'C', phone: '0550000001' }),
    ];
    expect(duplicatePhoneCounts(parcels).get('A')).toBe(2);
  });

  it('matches through the second phone line and ignores blank numbers', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '0550000001', phone2: '' }),
      parcel({ tracking: 'B', phone: '0770000009', phone2: '0550000001' }),
    ];
    expect(duplicatePhoneCounts(parcels).get('A')).toBe(1);
    expect(duplicatePhoneCounts(parcels).get('B')).toBe(1);
  });

  it('treats a parcel with no phone as never duplicated', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '' }),
      parcel({ tracking: 'B', phone: '' }),
    ];
    expect(duplicatePhoneCounts(parcels).get('A')).toBe(0);
  });
});

describe('duplicateTrackings', () => {
  it('lists only the parcels involved in a share', () => {
    const parcels = [
      parcel({ tracking: 'A', phone: '0550000001' }),
      parcel({ tracking: 'B', phone: '0550000001' }),
      parcel({ tracking: 'C', phone: '0550000003' }),
    ];
    expect(duplicateTrackings(parcels)).toEqual(['A', 'B']);
  });

  it('returns an empty list when nothing repeats', () => {
    expect(duplicateTrackings([parcel({ tracking: 'A', phone: '0550000001' })])).toEqual([]);
  });
});
