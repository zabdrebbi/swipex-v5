import type { BuiltInStatusKey, CustomStatusId, StatusRef } from './types';

export interface BuiltInStatus {
  key: BuiltInStatusKey;
  /** Hex colour used by filters, charts and the daily summary bar. */
  color: string;
  /** Lucide icon name: mapped to a component in the UI layer. */
  icon: string;
}

/** Default order and styling of the eight built-in statuses (from v4's statusList). */
export const BUILT_IN_STATUSES: readonly BuiltInStatus[] = [
  { key: 'no_action', color: '#9ca3af', icon: 'Hourglass' },
  { key: 'waiting', color: '#f97316', icon: 'Clock' },
  { key: 'delivered', color: '#10b981', icon: 'CheckCircle2' },
  { key: 'closed', color: '#eab308', icon: 'PhoneOff' },
  { key: 'no_answer', color: '#eab308', icon: 'PhoneMissed' },
  { key: 'wrong_number', color: '#eab308', icon: 'AlertTriangle' },
  { key: 'postponed', color: '#3b82f6', icon: 'CalendarDays' },
  { key: 'cancelled', color: '#ef4444', icon: 'XCircle' },
];

const BUILT_IN_KEYS = new Set<string>(BUILT_IN_STATUSES.map((s) => s.key));

/** The default status assigned to newly created/imported parcels. */
export const DEFAULT_STATUS: StatusRef = 'no_action';

export function isBuiltInStatusKey(key: string): key is BuiltInStatusKey {
  return BUILT_IN_KEYS.has(key);
}

/** Builds the persisted form of a custom status reference from its id. */
export function customStatusRef(id: CustomStatusId): StatusRef {
  return `custom:${id}`;
}

/** Splits a persisted status into either a built-in key or a custom status id. */
export function parseStatusRef(ref: StatusRef): { kind: 'built-in'; key: BuiltInStatusKey } | { kind: 'custom'; id: CustomStatusId } {
  if (ref.startsWith('custom:')) {
    return { kind: 'custom', id: ref.slice('custom:'.length) as CustomStatusId };
  }
  return { kind: 'built-in', key: ref as BuiltInStatusKey };
}

export function getBuiltInStatus(key: string): BuiltInStatus | undefined {
  return BUILT_IN_STATUSES.find((s) => s.key === key);
}
