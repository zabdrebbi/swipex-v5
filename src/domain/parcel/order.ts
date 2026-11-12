import type { Parcel } from './types';

/** Stable sort: manual order first, then creation time as a tie-breaker. */
export function compareParcels(a: Parcel, b: Parcel): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.tracking < b.tracking ? -1 : a.tracking > b.tracking ? 1 : 0;
}

export function sortParcels(parcels: Parcel[]): Parcel[] {
  return [...parcels].sort(compareParcels);
}

/** Rewrites `sortOrder` to 0..n-1 over the given (already ordered) list. */
export function reassignSortOrder(ordered: Parcel[]): Parcel[] {
  return ordered.map((parcel, index) =>
    parcel.sortOrder === index ? parcel : { ...parcel, sortOrder: index },
  );
}

/**
 * Moves `tracking` to `toIndex` (clamped) and renumbers everything.
 * Pure: returns a new array, never mutates the input.
 */
export function moveParcel(ordered: Parcel[], tracking: string, toIndex: number): Parcel[] {
  const from = ordered.findIndex((p) => p.tracking === tracking);
  if (from === -1) return ordered;
  const clamped = Math.max(0, Math.min(ordered.length - 1, toIndex));
  if (clamped === from) return ordered;
  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  next.splice(clamped, 0, moved);
  return reassignSortOrder(next);
}

/** Next sort order for a newly inserted parcel (new items go on top by default). */
export function nextSortOrder(ordered: Parcel[]): number {
  if (ordered.length === 0) return 0;
  return Math.min(...ordered.map((p) => p.sortOrder)) - 1;
}
