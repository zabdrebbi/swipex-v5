export interface LocaleMeta {
  /** Language code, also the file name in ./locales (e.g. "ar"). */
  code: string;
  dir: 'rtl' | 'ltr';
  /** English name (for developers). */
  label: string;
  /** Name shown in the language picker, written in that language. */
  nativeLabel: string;
  /** BCP-47 tag passed to Intl.*; force Latin digits where needed. */
  intlLocale: string;
  /** Position in the language picker. */
  order: number;
}
