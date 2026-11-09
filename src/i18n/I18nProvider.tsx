import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { makeFormatters } from './format';
import type { TranslateParams, TranslationKey } from './keys';
import { DEFAULT_LANG, LANGUAGES, getLocale, isSupported } from './registry';
import type { LocaleMeta } from './meta';
import { translate } from './translate';

const STORAGE_KEY = 'swipex_lang';

function readSavedLang(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSupported(saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

interface I18nContextValue {
  lang: string;
  dir: 'rtl' | 'ltr';
  languages: LocaleMeta[];
  /** Single entry point for changing language (step 5 will also sync it to settings). */
  setLang: (code: string) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
  formatNumber: (n: number) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(readSavedLang);
  const locale = getLocale(lang);
  const fallback = getLocale(DEFAULT_LANG);

  useEffect(() => {
    document.documentElement.lang = locale.meta.code;
    document.documentElement.dir = locale.meta.dir;
  }, [locale]);

  const setLang = useCallback((code: string) => {
    if (!isSupported(code)) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const { formatNumber, formatDate } = makeFormatters(locale.meta.intlLocale);
    const t = (key: TranslationKey, params?: TranslateParams) =>
      translate(locale, fallback, key, params);
    return {
      lang: locale.meta.code,
      dir: locale.meta.dir,
      languages: LANGUAGES,
      setLang,
      t,
      formatNumber,
      formatDate,
      formatCurrency: (amount: number) => `${formatNumber(amount)} ${t('currency.dzd')}`,
    };
  }, [locale, fallback, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
