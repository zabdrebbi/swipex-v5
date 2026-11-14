import type { Parcel } from '../parcel/types';
import type { StatusRef } from '../status/types';

export interface SummarySegment {
  status: StatusRef;
  count: number;
}

export interface DailySummary {
  total: number;
  delivered: number;
  remaining: number;
  cancelled: number;
  /** 0-100, rounded; 0 when the list is empty. */
  percentage: number;
  /** Statuses with count > 0, ordered by `statusOrder` (segments of the bar). */
  segments: SummarySegment[];
}

/**
 * One pass over the whole (unfiltered) day list, like v4's `getDailySummary`.
 * Segment colours are resolved by the UI layer through `statusColor(ref)`.
 */
export function computeDailySummary(
  parcels: readonly Parcel[],
  statusOrder: readonly StatusRef[] = [],
): DailySummary {
  const counts = new Map<StatusRef, number>();
  for (const parcel of parcels) {
    counts.set(parcel.status, (counts.get(parcel.status) ?? 0) + 1);
  }

  const total = parcels.length;
  const delivered = counts.get('delivered') ?? 0;
  const cancelled = counts.get('cancelled') ?? 0;

  const orderIndex = new Map<StatusRef, number>(statusOrder.map((ref, index) => [ref, index]));
  const segments = [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort(
      (a, b) =>
        (orderIndex.get(a.status) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b.status) ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    total,
    delivered,
    remaining: total - delivered,
    cancelled,
    percentage: total > 0 ? Math.round((delivered / total) * 100) : 0,
    segments,
  };
}

/** Cash total of a parcel list (the summary's "visible now" details line). */
export function sumAmount(parcels: readonly Parcel[]): number {
  let total = 0;
  for (const parcel of parcels) if (parcel.amount > 0) total += parcel.amount;
  return total;
}
