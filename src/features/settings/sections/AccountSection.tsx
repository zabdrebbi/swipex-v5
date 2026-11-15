import { useState, type FormEvent } from 'react';
import { useI18n } from '@/i18n';
import { useUser } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { changePassword } from '@/features/auth/authActions';
import { authErrorKey } from '@/features/auth/authErrors';
import { Group, Panel, buttonClass, inputClass } from '../ui';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Password change WITHOUT a current-password field (v4 flow): email/password
 * accounts update their password, Google-only accounts get one linked to the
 * same email. `requires-recent-login` is surfaced as a "sign in again" hint.
 */
export default function AccountSection() {
  const { t } = useI18n();
  const user = useUser();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.error.weak_password'));
      return;
    }
    if (password !== confirm) {
      setError(t('settings.password_mismatch'));
      return;
    }
    setBusy(true);
    try {
      const result = await changePassword(password);
      setPassword('');
      setConfirm('');
      showToast(result === 'created' ? t('settings.password_created') : t('settings.password_updated'));
    } catch (err) {
      const key = authErrorKey(err);
      setError(key === null ? t('auth.error.generic') : t(key));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Group title={t('settings.group_account')}>
      <Panel>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="settings-account-email" className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('auth.email')}
            </label>
            <input
              id="settings-account-email"
              type="email"
              value={user.email ?? ''}
              disabled
              readOnly
              dir="ltr"
              className={`${inputClass} bg-gray-100 dark:bg-gray-800/60`}
            />
          </div>
          <div>
            <label htmlFor="settings-account-password" className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('settings.password_new')}
            </label>
            <input
              id="settings-account-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('settings.password_new')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-account-confirm" className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('settings.password_confirm')}
            </label>
            <input
              id="settings-account-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder={t('settings.password_confirm')}
              className={inputClass}
            />
          </div>
          {error !== null && (
            <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={buttonClass('primary')}>
            {t('settings.password_title')}
          </button>
        </form>
      </Panel>
    </Group>
  );
}
