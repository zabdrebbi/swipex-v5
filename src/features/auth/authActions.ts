import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updatePassword,
} from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';

export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      // Fallback for environments where popups are unavailable; onAuthStateChanged picks up the result.
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password);
}

export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebase().auth, email.trim());
}

/** Outcome of `changePassword`: tells the UI which success message to show. */
export type ChangePasswordResult = 'updated' | 'created';

/**
 * Sets a new password WITHOUT asking for the current one (v4 behaviour):
 * - email/password users get `updatePassword`;
 * - Google-only users get `linkWithCredential`, which CREATES a password for
 *   the same account (the email stays the Google one).
 * Both need a recent login: `auth/requires-recent-login` is mapped by
 * `authErrorKey` so the UI can ask the user to sign in again.
 */
export async function changePassword(newPassword: string): Promise<ChangePasswordResult> {
  const user = getFirebase().auth.currentUser;
  if (user === null) throw new Error('auth/no-current-user');
  if (user.providerData.some((provider) => provider.providerId === 'password')) {
    await updatePassword(user, newPassword);
    return 'updated';
  }
  if (user.email === null) throw new Error('auth/no-email');
  await linkWithCredential(user, EmailAuthProvider.credential(user.email, newPassword));
  return 'created';
}
