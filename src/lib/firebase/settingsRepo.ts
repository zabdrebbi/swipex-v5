import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebase } from './index';
import { SETTINGS_DOC_ID } from '@/domain/firestore/paths';
import { settingsFromDoc } from '@/domain/firestore/convertSettings';
import { sanitizeRecord } from '@/domain/firestore/serialize';
import { createDefaultSettings } from '@/domain/settings/defaults';
import type { Settings } from '@/domain/settings/types';

/** Cloud reads must never hang the UI (lesson from v4's 5s cloud timeout). */
const LOAD_TIMEOUT_MS = 5000;

export type SettingsLoadResult =
  /** The document exists and was normalised. */
  | { status: 'loaded'; settings: Settings }
  /** First sign-in: no document yet, defaults are safe to write. */
  | { status: 'missing'; settings: Settings }
  /** Timeout or error: defaults are for display ONLY, cloud writes stay blocked. */
  | { status: 'failed'; settings: Settings };

function settingsRef(uid: string) {
  const { db } = getFirebase();
  return doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('settings load timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('settings load failed'));
      },
    );
  });
}

/**
 * Reads the single settings document once. Never throws: the caller decides
 * whether a failed load may write (it may NOT) or whether defaults are just
 * a first-run document (it may).
 */
export async function loadSettings(uid: string, today: string): Promise<SettingsLoadResult> {
  try {
    const snapshot = await withTimeout(getDoc(settingsRef(uid)), LOAD_TIMEOUT_MS);
    if (!snapshot.exists()) {
      return { status: 'missing', settings: createDefaults(today) };
    }
    const data = snapshot.data() as Record<string, unknown>;
    return { status: 'loaded', settings: settingsFromDoc(data, today) };
  } catch {
    return { status: 'failed', settings: createDefaults(today) };
  }
}

function createDefaults(today: string): Settings {
  return createDefaultSettings(today);
}

/** Writes ONLY the changed fields (partial patch + merge), never the whole document. */
export async function saveSettingsPatch(uid: string, patch: Partial<Settings>): Promise<void> {
  const safe = sanitizeRecord(patch as Record<string, unknown>);
  if (Object.keys(safe).length === 0) return;
  await setDoc(settingsRef(uid), safe, { merge: true });
}
