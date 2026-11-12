import { describe, expect, it } from 'vitest';
import type { Parcel } from './types';
import { compareParcels, moveParcel, nextSortOrder, reassignSortOrder, sortParcels } from './order';

function parcel(tracking: string, sortOrder: number, createdAt = '2026-11-10T08:00:00.000Z'): Parcel {
  return {
    tracking,
    receiver: '',
    phone: '',
    municipality: '',
    amount: 0,
    type: '',
    status: 'no_action',
    statusUpdatedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    sortOrder,
    smsSent: false,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
  };
}

describe('sortParcels', () => {
  it('orders by sortOrder ascending', () => {
    const sorted = sortParcels([parcel('c', 2), parcel('a', 0), parcel('b', 1)]);
    expect(sorted.map((p) => p.tracking)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties with createdAt then tracking (stable, deterministic)', () => {
    const older = parcel('z', 0, '2026-11-09T08:00:00.000Z');
    const newer = parcel('a', 0, '2026-11-10T08:00:00.000Z');
    const sameTime1 = parcel('m', 0, '2026-11-11T08:00:00.000Z');
    const sameTime2 = parcel('b', 0, '2026-11-11T08:00:00.000Z');
    const sorted = sortParcels([sameTime1, newer, sameTime2, older]);
    expect(sorted.map((p) => p.tracking)).toEqual(['z', 'a', 'b', 'm']);
  });

  it('does not mutate the input array', () => {
    const input = [parcel('b', 1), parcel('a', 0)];
    sortParcels(input);
    expect(input.map((p) => p.tracking)).toEqual(['b', 'a']);
  });
});

describe('reassignSortOrder', () => {
  it('renumbers 0..n-1 keeping the given order', () => {
    const renumbered = reassignSortOrder([parcel('a', -5), parcel('b', 3), parcel('c', 99)]);
    expect(renumbered.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
    expect(renumbered.map((p) => p.tracking)).toEqual(['a', 'b', 'c']);
  });

  it('returns the same objects when nothing changes', () => {
    const list = [parcel('a', 0), parcel('b', 1)];
    const renumbered = reassignSortOrder(list);
    expect(renumbered[0]).toBe(list[0]);
    expect(renumbered[1]).toBe(list[1]);
  });
});

describe('moveParcel', () => {
  it('moves the parcel and renumbers everything', () => {
    const list = sortParcels([parcel('a', 0), parcel('b', 1), parcel('c', 2)]);
    const moved = moveParcel(list, 'c', 0);
    expect(moved.map((p) => p.tracking)).toEqual(['c', 'a', 'b']);
    expect(moved.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
  });

  it('clamps out-of-range target indexes', () => {
    const list = sortParcels([parcel('a', 0), parcel('b', 1)]);
    expect(moveParcel(list, 'a', 99).map((p) => p.tracking)).toEqual(['b', 'a']);
    expect(moveParcel(list, 'b', -3).map((p) => p.tracking)).toEqual(['b', 'a']);
  });

  it('returns the same array reference for an unknown tracking or no-op move', () => {
    const list = sortParcels([parcel('a', 0), parcel('b', 1)]);
    expect(moveParcel(list, 'zzz', 0)).toBe(list);
    expect(moveParcel(list, 'a', 0)).toBe(list);
  });
});

describe('nextSortOrder', () => {
  it('puts a new parcel on top (one less than the current minimum)', () => {
    expect(nextSortOrder([parcel('a', 5), parcel('b', 7)])).toBe(4);
    expect(nextSortOrder([])).toBe(0);
  });

  it('keeps stacking above items already at negative orders', () => {
    expect(nextSortOrder([parcel('a', -3), parcel('b', 2)])).toBe(-4);
  });
});

describe('compareParcels', () => {
  it('is a consistent total ordering (sort is idempotent)', () => {
    const list = [parcel('c', 1), parcel('a', 1), parcel('b', 0), parcel('d', 1, '2026-11-09T00:00:00.000Z')];
    const once = sortParcels(list);
    const twice = sortParcels(once);
    expect(twice).toEqual(once);
    expect(compareParcels(once[0], once[1])).toBeLessThanOrEqual(0);
  });
});
