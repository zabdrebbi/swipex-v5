import type { Settings } from './types';

/**
 * Default settings for a brand-new account. `sessionDate` must be supplied
 * (today's date) because it is date-dependent. Templates default to null:
 * the UI falls back to the translated defaults in i18n until the user edits one.
 */
export function createDefaultSettings(sessionDate: string): Settings {
  return {
    themeMode: 'auto',
    language: 'ar',
    direction: 'auto',
    showDuplicates: true,

    customStatuses: [],
    statusOrder: [],
    statusGroups: [],
    deliveryConfirmEnabled: true,
    deliveryConfirmSeconds: 3,
    statusActionEnabled: {},

    tagsEnabled: false,
    tags: [],
    tagOrder: [],
    smartTagSortingEnabled: false,
    cardTrackingEnabled: true,
    favoritePhonesEnabled: false,
    favoritePhones: [],

    smsTemplate: null,
    whatsappTemplate: null,
    smsStatusTemplate: null,
    smsWrongNumberTemplate: null,
    smsContentLength: 10,
    smsOnStatusClosed: false,
    smsOnStatusNoAnswer: false,
    smsOnStatusWrongNumber: false,
    smsSaving: false,
    bulkSmsEnabled: false,

    archiveSyncEnabled: true,
    deliveryCueEnabled: true,

    sessionDate,
  };
}
