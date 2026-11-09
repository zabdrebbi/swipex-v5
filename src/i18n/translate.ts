import type { Locale, TranslateParams, TranslationKey } from './keys';

/** Replaces `{{name}}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Pure lookup: current language -> fallback language -> the key itself. */
export function translate(
  locale: Locale,
  fallback: Locale,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const raw = locale.strings[key] ?? fallback.strings[key] ?? key;
  return interpolate(raw, params);
}
