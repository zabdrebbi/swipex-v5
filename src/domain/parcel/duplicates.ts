import type { Parcel } from './types';

/** Non-empty phone numbers of a parcel (both lines, no blanks). */
function phoneKeys(parcel: Parcel): string[] {
  return [parcel.phone, parcel.phone2].filter(
    (phone): phone is string => typeof phone === 'string' && phone.trim() !== '',
  );
}

/**
 * Counts, per tracking, how many OTHER active parcels share one of its phone
 * numbers. One pass over the list builds the phone index and a second pass
 * resolves the per-parcel count (the card badge never rescans the list).
 */
export function duplicatePhoneCounts(parcels: readonly Parcel[]): Map<string, number> {
  const byPhone = new Map<string, string[]>();
  for (const parcel of parcels) {
    for (const phone of phoneKeys(parcel)) {
      const owners = byPhone.get(phone);
      if (owners === undefined) byPhone.set(phone, [parcel.tracking]);
      else owners.push(parcel.tracking);
    }
  }

  const counts = new Map<string, number>();
  for (const parcel of parcels) {
    const others = new Set<string>();
    for (const phone of phoneKeys(parcel)) {
      for (const tracking of byPhone.get(phone) ?? []) {
        if (tracking !== parcel.tracking) others.add(tracking);
      }
    }
    counts.set(parcel.tracking, others.size);
  }
  return counts;
}

/** Trackings that share a phone with at least one other parcel (deduplicated). */
export function duplicateTrackings(parcels: readonly Parcel[]): string[] {
  return [...duplicatePhoneCounts(parcels)]
    .filter(([, count]) => count > 0)
    .map(([tracking]) => tracking);
}
