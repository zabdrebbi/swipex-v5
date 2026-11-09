import type ar from './locales/ar';
import type { LocaleMeta } from './meta';

/** Every key defined in the Arabic file. Other languages must define all of them. */
export type TranslationKey = keyof (typeof ar)['strings'];

export interface Locale {
  meta: LocaleMeta;
  strings: Record<TranslationKey, string>;
}

export type TranslateParams = Record<string, string | number>;
