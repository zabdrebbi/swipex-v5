import { useI18n } from '@/i18n';

/** Shown instead of the app when the VITE_FIREBASE_* variables are not set (see .env.example). */
export default function ConfigMissing({ missing }: { missing: string[] }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-3 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        <h1 className="text-lg font-bold">{t('config.missing_title')}</h1>
        <p className="text-sm">{t('config.missing_body')}</p>
        <ul className="space-y-1 font-mono text-xs" dir="ltr">
          {missing.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
