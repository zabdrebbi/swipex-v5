import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useI18n } from '@/i18n';
import { signOutAndWipe } from '@/lib/firebase/session';

export default function SignOutButton({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    await signOutAndWipe(); // ends with a full page reload on /login
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10 ${className}`}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {busy ? t('auth.signing_out') : t('auth.sign_out')}
    </button>
  );
}
