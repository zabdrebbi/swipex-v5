import type { TranslationKey } from '@/i18n';

const MAP: Record<string, TranslationKey | null> = {
  'auth/invalid-credential': 'auth.error.invalid_credentials',
  'auth/wrong-password': 'auth.error.invalid_credentials',
  'auth/user-not-found': 'auth.error.invalid_credentials',
  'auth/invalid-email': 'auth.error.invalid_email',
  'auth/email-already-in-use': 'auth.error.email_in_use',
  'auth/weak-password': 'auth.error.weak_password',
  'auth/too-many-requests': 'auth.error.too_many',
  'auth/network-request-failed': 'auth.error.network',
  'auth/popup-blocked': 'auth.error.popup_blocked',
  'auth/user-disabled': 'auth.error.user_disabled',
  // The user closed the popup on purpose: show nothing.
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
};

/** Pure: Firebase error -> i18n key to display, or null when the error must be silent. */
export function authErrorKey(error: unknown): TranslationKey | null {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (Object.prototype.hasOwnProperty.call(MAP, code)) return MAP[code];
  return 'auth.error.generic';
}
