import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAuth } from './AuthProvider';
import { sendResetEmail, signInWithEmail, signInWithGoogle, signUpWithEmail } from './authActions';
import { authErrorKey } from './authErrors';
import GoogleIcon from './GoogleIcon';

type Mode = 'signIn' | 'signUp';

/** Only same-origin absolute paths are accepted as a post-login target (open-redirect hygiene). */
function safeRedirectTarget(state: unknown): string {
  const from =
    typeof state === 'object' && state !== null ? (state as { from?: unknown }).from : undefined;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

const INPUT_CLASS =
  'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-950';

export default function LoginPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [infoKey, setInfoKey] = useState<TranslationKey | null>(null);

  if (auth.status === 'signedIn') {
    return <Navigate to={safeRedirectTarget(location.state)} replace />;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setErrorKey(null);
    setInfoKey(null);
    try {
      await action();
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() => (mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(email, password)));
  }

  function handleReset() {
    if (!email.trim()) {
      setErrorKey('auth.reset_need_email');
      return;
    }
    void run(async () => {
      await sendResetEmail(email);
      setInfoKey('auth.reset_sent');
    });
  }

  const isSignIn = mode === 'signIn';

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <header className="text-center">
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">SwiPex Pro</div>
          <h1 className="mt-2 text-lg font-bold">{isSignIn ? t('auth.login_title') : t('auth.sign_up')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('auth.subtitle')}</p>
        </header>

        <button
          type="button"
          disabled={busy}
          onClick={() => void run(signInWithGoogle)}
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <GoogleIcon />
          {t('auth.continue_google')}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-current opacity-30" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-current opacity-30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('auth.email')}
            </label>
            <input
              id="login-email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('auth.password')}
            </label>
            <input
              id="login-password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {errorKey && (
            <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400">
              {t(errorKey)}
            </p>
          )}
          {infoKey && (
            <p role="status" className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {t(infoKey)}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSignIn ? t('auth.sign_in') : t('auth.sign_up')}
          </button>

          {isSignIn && (
            <button
              type="button"
              disabled={busy}
              onClick={handleReset}
              className="w-full text-center text-xs font-bold text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
            >
              {t('auth.forgot_password')}
            </button>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {isSignIn ? t('auth.no_account') : t('auth.have_account')}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignIn ? 'signUp' : 'signIn');
              setErrorKey(null);
              setInfoKey(null);
            }}
            className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {isSignIn ? t('auth.sign_up') : t('auth.sign_in')}
          </button>
        </p>
      </div>
    </main>
  );
}
