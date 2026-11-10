import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { readFirebaseConfig } from './config';

const { options, missing } = readFirebaseConfig();

export const missingFirebaseEnv: string[] = missing;
export const isFirebaseConfigured = options !== null;

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseServices | null = null;

/** Lazily creates the singletons. Call only after checking `isFirebaseConfigured`. */
export function getFirebase(): FirebaseServices {
  if (services) return services;
  if (!options) throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);

  const app = getApps().length > 0 ? getApp() : initializeApp(options);
  const auth = getAuth(app);

  let db: Firestore;
  try {
    // Persistent IndexedDB cache shared by all tabs: saves Spark-plan reads and enables offline use.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Already initialised (e.g. Vite hot reload): reuse the existing instance.
    db = getFirestore(app);
  }

  services = { app, auth, db };
  return services;
}
