import { useI18n } from '@/i18n';
import { useUser } from '@/features/auth/AuthProvider';
import SignOutButton from '@/components/SignOutButton';

/** Account block at the bottom of the desktop sidebar. */
export default function UserMenu() {
  const user = useUser();
  const { t } = useI18n();
  const label = user.displayName || user.email || '';
  const initial = label.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <div className="flex items-center gap-3 px-1">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.account')}</p>
        </div>
      </div>
      <SignOutButton />
    </div>
  );
}
