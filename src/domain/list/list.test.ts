import { describe, expect, it } from 'vitest';
import type { Parcel } from '../parcel/types';
import type { StatusRef } from '../status/types';
import { computeDailySummary, sumAmount } from './dailySummary';
import {
  EMPTY_FILTERS,
  TAG_NONE,
  applySmartTagSorting,
  filterParcels,
  hasActiveFilters,
  matchesSearch,
  statusCounts,
  trackingsWithTag,
  usedMunicipalities,
  usedTags,
  type FilterContext,
  type ListFilters,
} from './query';

const NOW = '2026-11-13T10:00:00.000Z';

function parcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    tracking: 'YAL-0000000001',
    receiver: 'Amine Bensalem',
    phone: '0550123456',
    municipality: 'Bab Ezzouar',
    amount: 1500,
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

function filters(overrides: Partial<ListFilters> = {}): ListFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

const NO_CTX: FilterContext = { favouritePhones: new Set<string>() };

describe('matchesSearch', () => {
  const target = parcel({
    notes: 'call after 6pm',
    address: 'Cite A, block 4',
    pin: '4589',
    subTrackings: [{ tracking: 'YAL-SUB1', pin: '1122' }],
  });

  it('matches receiver, tracking, notes, address and municipality case-insensitively', () => {
    expect(matchesSearch(target, 'bensalem')).toBe(true);
    expect(matchesSearch(target, 'YAL-0000000001'.toLowerCase())).toBe(true);
    expect(matchesSearch(target, 'AFTER 6')).toBe(true);
    expect(matchesSearch(target, 'block 4')).toBe(true);
    expect(matchesSearch(target, 'bab ezzouar')).toBe(true);
    expect(matchesSearch(target, 'nomatch')).toBe(false);
  });

  it('matches phone digits as a substring', () => {
    expect(matchesSearch(target, '55012')).toBe(true);
    expect(matchesSearch(target, '0661')).toBe(false);
  });

  it('matches sub-trackings and PINs', () => {
    expect(matchesSearch(target, 'yal-sub1')).toBe(true);
    expect(matchesSearch(target, '1122')).toBe(true);
    expect(matchesSearch(target, '4589')).toBe(true);
  });

  it('matches everything on an empty query', () => {
    expect(matchesSearch(target, '   ')).toBe(true);
  });
});

describe('filterParcels', () => {
  const parcels = [
    parcel({ tracking: 'T1', status: 'delivered', municipality: 'Oran', tag: 'vip' }),
    parcel({ tracking: 'T2', status: 'waiting', municipality: 'Alger' }),
    parcel({ tracking: 'T3', status: 'waiting', municipality: 'Oran', phone2: '0661234567' }),
  ];

  it('short-circuits to search-only when a query is present (v4 rule)', () => {
    const result = filterParcels(
      parcels,
      filters({ search: 'T1', municipality: 'Alger', statuses: ['waiting'] }),
      NO_CTX,
    );
    expect(result.map((p) => p.tracking)).toEqual(['T1']);
  });

  it('combines dimensions with AND and statuses with OR', () => {
    const result = filterParcels(
      parcels,
      filters({ municipality: 'Oran', statuses: ['delivered', 'waiting'] }),
      NO_CTX,
    );
    expect(result.map((p) => p.tracking)).toEqual(['T1', 'T3']);

    const tagAndStatus = filterParcels(
      parcels,
      filters({ municipality: 'Oran', tag: 'vip', statuses: ['waiting'] }),
      NO_CTX,
    );
    expect(tagAndStatus).toHaveLength(0);
  });

  it('filters favourites against both phone fields', () => {
    const ctx: FilterContext = { favouritePhones: new Set(['0661234567']) };
    const result = filterParcels(parcels, filters({ favorite: true }), ctx);
    expect(result.map((p) => p.tracking)).toEqual(['T3']);
  });

  it('matches tagless parcels through the TAG_NONE sentinel', () => {
    // The default fixture carries no tag, so only T1 (vip) is excluded.
    expect(filterParcels(parcels, filters({ tag: TAG_NONE }), NO_CTX).map((p) => p.tracking)).toEqual(['T2', 'T3']);
    const withTagless = [...parcels, parcel({ tracking: 'T4', tag: undefined })];
    expect(filterParcels(withTagless, filters({ tag: TAG_NONE }), NO_CTX).map((p) => p.tracking)).toEqual([
      'T2',
      'T3',
      'T4',
    ]);
    expect(filterParcels(withTagless, filters({ tag: 'vip' }), NO_CTX).map((p) => p.tracking)).toEqual(['T1']);
  });

  it('reports whether any filter is active', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ statuses: ['delivered'] }))).toBe(true);
    expect(hasActiveFilters(filters({ search: ' x ' }))).toBe(true);
  });
});

describe('statusCounts', () => {
  const parcels = [
    parcel({ status: 'delivered' }),
    parcel({ status: 'delivered' }),
    parcel({ status: 'waiting' }),
    parcel({ status: 'cancelled' }),
  ];

  it('keeps counting the other statuses when one is selected (chips never collapse)', () => {
    const counts = statusCounts(parcels, filters({ statuses: ['delivered'] }), NO_CTX);
    expect(counts.get('delivered')).toBe(2);
    expect(counts.get('waiting')).toBe(1);
    expect(counts.get('cancelled')).toBe(1);
    expect(counts.has('no_action')).toBe(false);
  });

  it('applies the non-status dimensions to the context', () => {
    const none: FilterContext = { favouritePhones: new Set(['0770000000']) };
    expect(statusCounts(parcels, filters({ favorite: true }), none).size).toBe(0);
    const all: FilterContext = { favouritePhones: new Set(['0550123456']) };
    expect(statusCounts(parcels, filters({ favorite: true }), all).size).toBe(3);
  });
});

describe('usedMunicipalities / usedTags', () => {
  it('dedups municipalities sorted ar-locale and keeps tag encounter order', () => {
    const parcels = [
      parcel({ municipality: 'Oran', tag: 'vip' }),
      parcel({ municipality: 'Alger', tag: 'urgent' }),
      parcel({ municipality: 'Oran', tag: 'vip' }),
      parcel({ municipality: '' }),
    ];
    expect(usedMunicipalities(parcels)).toEqual(['Alger', 'Oran']);
    expect(usedTags(parcels)).toEqual(['vip', 'urgent']);
  });
});

describe('computeDailySummary', () => {
  it('counts delivered/remaining/cancelled and the rounded percentage', () => {
    const parcels = [
      parcel({ status: 'delivered' }),
      parcel({ status: 'delivered' }),
      parcel({ status: 'waiting' }),
      parcel({ status: 'cancelled' }),
    ];
    const summary = computeDailySummary(parcels);

    expect(summary.total).toBe(4);
    expect(summary.delivered).toBe(2);
    expect(summary.remaining).toBe(2);
    expect(summary.cancelled).toBe(1);
    expect(summary.percentage).toBe(50);
  });

  it('orders segments by statusOrder and appends unknown statuses stably', () => {
    const parcels = [
      parcel({ status: 'waiting' }),
      parcel({ status: 'delivered' }),
      parcel({ status: 'custom:cs_x' as StatusRef }),
      parcel({ status: 'delivered' }),
    ];
    const summary = computeDailySummary(parcels, ['delivered', 'waiting', 'cancelled']);

    expect(summary.segments.map((s) => s.status)).toEqual(['delivered', 'waiting', 'custom:cs_x']);
    expect(summary.segments.map((s) => s.count)).toEqual([2, 1, 1]);
  });

  it('is zero-safe on an empty list', () => {
    const summary = computeDailySummary([]);
    expect(summary).toEqual({
      total: 0,
      delivered: 0,
      remaining: 0,
      cancelled: 0,
      percentage: 0,
      segments: [],
    });
  });
});

describe('sumAmount', () => {
  it('adds positive amounts only', () => {
    const parcels = [parcel({ amount: 1500 }), parcel({ amount: 0 }), parcel({ amount: 250.5 })];
    expect(sumAmount(parcels)).toBe(1750.5);
    expect(sumAmount([])).toBe(0);
  });
});

describe('trackingsWithTag', () => {
  it('returns only the trackings carrying the tag', () => {
    const parcels = [
      parcel({ tracking: 'A', tag: 'vip' }),
      parcel({ tracking: 'B', tag: 'urgent' }),
      parcel({ tracking: 'C', tag: 'vip' }),
      parcel({ tracking: 'D' }),
    ];
    expect(trackingsWithTag(parcels, 'vip')).toEqual(['A', 'C']);
  });

  it('never matches the empty tag', () => {
    expect(trackingsWithTag([parcel({ tracking: 'A', tag: undefined })], '')).toEqual([]);
  });
});

describe('applySmartTagSorting', () => {
  it('returns the list unchanged when no order is configured', () => {
    const parcels = [parcel({ tracking: 'A' }), parcel({ tracking: 'B' })];
    expect(applySmartTagSorting(parcels, [])).toEqual(parcels);
    expect(applySmartTagSorting(parcels, [])).not.toBe(parcels);
  });

  it('groups by tag order and pushes untagged/unknown parcels to the end', () => {
    const parcels = [
      parcel({ tracking: 'none' }),
      parcel({ tracking: 'second', tag: 'vip' }),
      parcel({ tracking: 'first', tag: 'urgent' }),
      parcel({ tracking: 'orphan', tag: 'deleted' }),
    ];
    const sorted = applySmartTagSorting(parcels, ['urgent', 'vip']);
    expect(sorted.map((p) => p.tracking)).toEqual(['first', 'second', 'none', 'orphan']);
  });

  it('keeps the relative order of parcels sharing a rank (stable)', () => {
    const parcels = [
      parcel({ tracking: 'a1', tag: 'vip' }),
      parcel({ tracking: 'a2', tag: 'vip' }),
      parcel({ tracking: 'a3', tag: 'vip' }),
    ];
    expect(applySmartTagSorting(parcels, ['vip']).map((p) => p.tracking)).toEqual(['a1', 'a2', 'a3']);
  });
});
