import type { LangCode } from '../localized';
import type { StatusRef, CustomStatus, StatusGroup } from '../status/types';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type DirectionMode = 'auto' | 'rtl' | 'ltr';

/** A colour tag applied to parcels; scope limits visibility to one municipality. */
export interface TagDef {
  /** Stored without the '@' prefix; the UI renders it as `@name`. */
  name: string;
  color: string;
  scope: 'global' | 'municipality';
  /** Required when `scope === 'municipality'`. */
  municipality?: string;
}

/** A saved phone number (receiver favourite) with contact details. */
export interface FavoritePhone {
  phone: string;
  name: string;
  municipality?: string;
}

/** Per-status option: whether an SMS action is offered when that status is set. */
export type StatusActionEnabled = Partial<Record<StatusRef, boolean>>;

/**
 * The single `users/{uid}/settings` document. Every field is optional at the
 * Firestore boundary (missing = default), but the in-memory model is complete.
 */
export interface Settings {
  themeMode: ThemeMode;
  language: LangCode;
  direction: DirectionMode;
  showDuplicates: boolean;

  // --- statuses ---
  /** Custom statuses created by the user (three-language labels). */
  customStatuses: CustomStatus[];
  /** Display order of all statuses; built-ins missing here keep their default relative order. */
  statusOrder: StatusRef[];
  statusGroups: StatusGroup[];
  deliveryConfirmEnabled: boolean;
  /** Countdown seconds (1-30) before "delivered" is applied. */
  deliveryConfirmSeconds: number;
  statusActionEnabled: StatusActionEnabled;

  // --- tags & favourites ---
  tagsEnabled: boolean;
  tags: TagDef[];
  /** Display order of tag names (drives smart sorting). */
  tagOrder: string[];
  smartTagSortingEnabled: boolean;
  cardTrackingEnabled: boolean;
  favoritePhonesEnabled: boolean;
  favoritePhones: FavoritePhone[];

  // --- communication ---
  /** SMS template with {placeholders}; null = use the built-in default from i18n. */
  smsTemplate: string | null;
  whatsappTemplate: string | null;
  /** Message sent to the receiver when a status with SMS enabled is set. */
  smsStatusTemplate: string | null;
  /** Message sent to the sender for the wrong-number status. */
  smsWrongNumberTemplate: string | null;
  /** Truncation length of the {content} placeholder. */
  smsContentLength: number;
  smsOnStatusClosed: boolean;
  smsOnStatusNoAnswer: boolean;
  smsOnStatusWrongNumber: boolean;
  /** Skip the SMS confirm dialog for already-sent day-old parcels. */
  smsSaving: boolean;
  bulkSmsEnabled: boolean;

  // --- archive & feedback ---
  archiveSyncEnabled: boolean;
  deliveryCueEnabled: boolean;

  /** Working-day marker (`YYYY-MM-DD`) set when the day is archived. */
  sessionDate: string;
}
