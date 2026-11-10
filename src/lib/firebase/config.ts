import type { FirebaseOptions } from 'firebase/app';

const REQUIRED = [
  ['apiKey', 'VITE_FIREBASE_API_KEY'],
  ['authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'VITE_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'VITE_FIREBASE_APP_ID'],
] as const;

export interface FirebaseConfigResult {
  options: FirebaseOptions | null;
  /** Names of the missing VITE_* variables. */
  missing: string[];
}

export function readFirebaseConfig(env: ImportMetaEnv = import.meta.env): FirebaseConfigResult {
  const options: Record<string, string> = {};
  const missing: string[] = [];
  for (const [field, envName] of REQUIRED) {
    const value = env[envName]?.trim();
    if (value) options[field] = value;
    else missing.push(envName);
  }
  return missing.length > 0
    ? { options: null, missing }
    : { options: options as FirebaseOptions, missing };
}
