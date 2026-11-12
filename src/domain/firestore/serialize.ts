/**
 * Firestore rejects `undefined`, `NaN`, `Infinity` and `Date` is awkward across
 * SDK versions, so everything written to the database goes through this pass:
 * plain JSON-safe values only (strings, finite numbers, booleans, arrays, maps).
 */

export type SafeValue = string | number | boolean | null | SafeValue[] | { [key: string]: SafeValue };

/** Returns a JSON-safe deep copy; undefined keys are dropped, NaN/Infinity become null. */
export function sanitizeForFirestore<T>(value: T): SafeValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    const items: SafeValue[] = [];
    for (const item of value) {
      const safe = sanitizeForFirestore(item);
      if (safe !== undefined) items.push(safe);
    }
    return items;
  }
  if (typeof value === 'object') {
    const out: { [key: string]: SafeValue } = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const safe = sanitizeForFirestore(item);
      if (safe !== undefined) out[key] = safe;
    }
    return out;
  }
  // functions, symbols, bigint: never serialised
  return undefined;
}

/** Deep-clones a record through the sanitiser, dropping fields that serialise to undefined. */
export function sanitizeRecord(record: Record<string, unknown>): { [key: string]: SafeValue } {
  const safe = sanitizeForFirestore(record);
  return safe !== null && typeof safe === 'object' && !Array.isArray(safe) ? safe : {};
}
