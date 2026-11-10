import { signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { clearUserScopedKeys } from '@/lib/storage';
import { getFirebase } from './index';

/**
 * Signs out, wipes the user's local data (Firestore IndexedDB cache + user-scoped localStorage keys)
 * and does a full reload on /login so the next session starts with fresh Firebase instances.
 * It never touches Service Worker / app-shell caches (they hold no user data).
 */
export async function signOutAndWipe(): Promise<void> {
  const { auth, db } = getFirebase();
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign-out failed', error);
  }
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (error) {
    // Another tab may still hold the cache; it is overwritten on the next login anyway.
    console.warn('Could not clear the Firestore cache', error);
  }
  clearUserScopedKeys();
  window.location.replace('/login');
}
