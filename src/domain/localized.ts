/** Language codes supported by the app (mirrors src/i18n/locales file names). */
export type LangCode = 'ar' | 'fr' | 'en';

/** User-authored labels that must be available in all three languages. */
export interface LocalizedText {
  ar: string;
  fr: string;
  en: string;
}

/** A label is usable only when every language has non-empty text. */
export function isLocalizedTextComplete(text: LocalizedText): boolean {
  return text.ar.trim() !== '' && text.fr.trim() !== '' && text.en.trim() !== '';
}
