import type { Locale } from './keys';

// Every file in ./locales is picked up automatically: adding a language = adding one file.
const modules = import.meta.glob<{ default: Locale }>('./locales/*.ts', { eager: true });

const locales: Locale[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.meta.order - b.meta.order);

const byCode = new Map(locales.map((l) => [l.meta.code, l]));

export const DEFAULT_LANG = 'ar';
export const LANGUAGES = locales.map((l) => l.meta);
/** Full locale objects (including strings): used to match status labels on import. */
export const LOCALES: readonly Locale[] = locales;

export function isSupported(code: string | null | undefined): code is string {
  return !!code && byCode.has(code);
}

export function getLocale(code: string): Locale {
  return byCode.get(code) ?? (byCode.get(DEFAULT_LANG) as Locale);
}
