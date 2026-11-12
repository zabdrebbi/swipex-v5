import type { LocalizedText } from '../localized';

/**
 * The eight built-in statuses. The key is what gets persisted on parcels;
 * the display label is translated through `t('status.' + key)`.
 */
export type BuiltInStatusKey =
  | 'no_action'
  | 'waiting'
  | 'delivered'
  | 'closed'
  | 'no_answer'
  | 'wrong_number'
  | 'postponed'
  | 'cancelled';

/** Custom status identifiers are generated with this prefix. */
export type CustomStatusId = `cs_${string}`;

/** Every value ever stored in `parcel.status`. */
export type StatusRef = BuiltInStatusKey | `custom:${CustomStatusId}`;

/** A user-created status: label in all languages, plus a colour and a lucide icon name. */
export interface CustomStatus {
  id: CustomStatusId;
  name: LocalizedText;
  /** Hex colour, e.g. "#8b5cf6". */
  color: string;
  /** Lucide icon name resolved to a component in the UI layer. */
  icon: string;
}

/** A user-defined group of statuses shown together in the status modal/dashboard. */
export interface StatusGroup {
  id: string;
  /** User-entered group name: never translated (same rule as notes and tags). */
  name: string;
  color: string;
  icon: string;
  layout: 'row' | 'column';
  statuses: StatusRef[];
}
