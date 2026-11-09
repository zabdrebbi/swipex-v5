import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useTheme, type ThemeMode } from '@/lib/theme';

// TEMP: minimal language/theme pickers to verify step 2. Replaced by the real settings UI in step 11.

const THEMES: { mode: ThemeMode; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { mode: 'light', labelKey: 'theme.light', icon: Sun },
  { mode: 'dark', labelKey: 'theme.dark', icon: Moon },
  { mode: 'system', labelKey: 'theme.system', icon: Monitor },
];

function segmentClass(active: boolean): string {
  return `flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors ${
    active
      ? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white'
      : 'text-gray-500 dark:text-gray-400'
  }`;
}

export default function SettingsPage() {
  const { t, lang, languages, setLang, formatNumber, formatDate, formatCurrency } = useI18n();
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      <section>
        <h2 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.language')}</h2>
        <div className="flex gap-1 rounded-2xl bg-gray-200/70 p-1 dark:bg-gray-800">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={l.code === lang}
              onClick={() => setLang(l.code)}
              className={segmentClass(l.code === lang)}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.theme')}</h2>
        <div className="flex gap-1 rounded-2xl bg-gray-200/70 p-1 dark:bg-gray-800">
          {THEMES.map(({ mode: m, labelKey, icon: Icon }) => (
            <button key={m} type="button" aria-pressed={m === mode} onClick={() => setMode(m)} className={segmentClass(m === mode)}>
              <Icon className="size-4" aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.format_preview')}</h2>
        <div className="space-y-1 rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <p>{formatNumber(1234567)}</p>
          <p>{formatCurrency(7800)}</p>
          <p>{formatDate(new Date())}</p>
        </div>
      </section>
    </div>
  );
}
