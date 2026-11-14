import type { Parcel } from '../parcel/types';
import type { StatusRef } from '../status/types';

/** State of the main list controls (search + four filters), persisted per user. */
export interface ListFilters {
  /**
   * Live search text. When non-empty it OVERRIDES every other filter — v4's
   * rule: typing something is an explicit intent to find, not to narrow.
   */
  search: string;
  /** Exact municipality match; '' = all. */
  municipality: string;
  /** Selected statuses (OR between them); empty = all. */
  statuses: StatusRef[];
  /** Exact tag name match (without the '@' prefix); '' = all. */
  tag: string;
  /** Only parcels whose receiver phone is saved as a favourite. */
  favorite: boolean;
}

export const EMPTY_FILTERS: ListFilters = {
  search: '',
  municipality: '',
  statuses: [],
  tag: '',
  favorite: false,
};

/** Sentinel stored in `filters.tag` to match parcels without any tag. */
export const TAG_NONE = '__none__';

export interface FilterContext {
  /** Normalized favourite phones from settings (used by the favourite filter). */
  favouritePhones: ReadonlySet<string>;
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.municipality !== '' ||
    filters.statuses.length > 0 ||
    filters.tag !== '' ||
    filters.favorite
  );
}

function isFavorite(parcel: Parcel, ctx: FilterContext): boolean {
  if (ctx.favouritePhones.has(parcel.phone)) return true;
  return parcel.phone2 !== undefined && ctx.favouritePhones.has(parcel.phone2);
}

/**
 * Free-text match over: tracking, receiver, both phones (digit substring),
 * notes, address, municipality, wilaya, tag, PIN and every sub-tracking/PIN.
 * Improves on v4, which never searched the address field.
 */
export function matchesSearch(parcel: Parcel, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (query === '') return true;

  const digits = query.replace(/\D+/g, '');
  if (digits.length >= 3 && (parcel.phone.includes(digits) || (parcel.phone2 ?? '').includes(digits))) {
    return true;
  }

  const haystack = [
    parcel.tracking,
    parcel.receiver,
    parcel.phone,
    parcel.phone2 ?? '',
    parcel.notes ?? '',
    parcel.address ?? '',
    parcel.municipality,
    parcel.wilaya ?? '',
    parcel.tag ?? '',
    parcel.pin ?? '',
    ...parcel.subTrackings.map((piece) => `${piece.tracking} ${piece.pin ?? ''}`),
  ]
    .join(' \n ')
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Applies the four dimensions with AND between them and OR inside the status
 * set (v4's combination rules); an active search short-circuits to search-only.
 */
export function filterParcels(
  parcels: readonly Parcel[],
  filters: ListFilters,
  ctx: FilterContext,
): Parcel[] {
  const query = filters.search.trim();
  if (query !== '') return parcels.filter((parcel) => matchesSearch(parcel, query));

  return parcels.filter(
    (parcel) =>
      (filters.municipality === '' || parcel.municipality === filters.municipality) &&
      (filters.statuses.length === 0 || filters.statuses.includes(parcel.status)) &&
      matchesTag(parcel, filters.tag) &&
      (!filters.favorite || isFavorite(parcel, ctx)),
  );
}

function matchesTag(parcel: Parcel, tag: string): boolean {
  if (tag === '') return true;
  if (tag === TAG_NONE) return (parcel.tag ?? '') === '';
  return parcel.tag === tag;
}

/**
 * Per-status counts in the filter context with the STATUS dimension removed,
 * so selecting one status never zeroes the other chips' badges (v4 rule).
 */
export function statusCounts(
  parcels: readonly Parcel[],
  filters: ListFilters,
  ctx: FilterContext,
): Map<StatusRef, number> {
  const counts = new Map<StatusRef, number>();
  for (const parcel of filterParcels(parcels, { ...filters, statuses: [] }, ctx)) {
    counts.set(parcel.status, (counts.get(parcel.status) ?? 0) + 1);
  }
  return counts;
}

/** Distinct non-empty municipalities, sorted (label order of the filter list). */
export function usedMunicipalities(parcels: readonly Parcel[]): string[] {
  const set = new Set<string>();
  for (const parcel of parcels) if (parcel.municipality !== '') set.add(parcel.municipality);
  return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
}

/** Distinct tags in first-appearance order (the UI re-sorts by `tagOrder`). */
export function usedTags(parcels: readonly Parcel[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const parcel of parcels) {
    const tag = parcel.tag ?? '';
    if (tag !== '' && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}
