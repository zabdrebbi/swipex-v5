import { useRef, useState } from 'react';
import { Download, Monitor, Moon, Sun, Upload, type LucideIcon } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useTheme, type ThemeMode } from '@/lib/theme';
import { useUser } from '@/features/auth/AuthProvider';
import SignOutButton from '@/components/SignOutButton';
import { useSettings } from './SettingsProvider';
import { downloadSettingsBackup, parseSettingsBackup, saveImportSnapshot } from './backup';

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
  const { status, settings, replaceSettings, retryLoad } = useSettings();
  const user = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ key: TranslationKey; tone: 'success' | 'error' } | null>(null);

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-picking the same file
    if (!file) return;
    file.text().then((text) => {
      const imported = parseSettingsBackup(text, new Date().toISOString().slice(0, 10));
      if (imported === null) {
        setFeedback({ key: 'settings.backup_invalid', tone: 'error' });
        return;
      }
      if (!window.confirm(t('settings.backup_confirm'))) return;
      saveImportSnapshot(settings);
      replaceSettings(imported);
      setFeedback({ key: 'settings.backup_imported', tone: 'success' });
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      {status === 'error' && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <p>{t('settings.load_error')}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="mt-2 min-h-11 rounded-xl bg-red-600 px-4 text-white hover:bg-red-700"
          >
            {t('settings.load_retry')}
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.account')}</h2>
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="break-all text-sm" dir="ltr">{user.email ?? user.displayName}</p>
          <SignOutButton />
        </div>
      </section>

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
        <h2 className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.backup')}</h2>
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              downloadSettingsBackup(settings);
              setFeedback({ key: 'settings.backup_exported', tone: 'success' });
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            <Download className="size-4" aria-hidden="true" />
            {t('settings.backup_export')}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Upload className="size-4" aria-hidden="true" />
            {t('settings.backup_import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          {feedback !== null && (
            <p
              role="status"
              className={`text-sm font-bold ${
                feedback.tone === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {t(feedback.key)}
            </p>
          )}
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
