import { settingsFromDoc } from '@/domain/firestore/convertSettings';
import type { Settings } from '@/domain/settings/types';
import { USER_KEY_PREFIX } from '@/lib/storage';

/** Shape of the exported JSON file: versioned so old exports stay importable. */
export interface SettingsBackupFile {
  app: 'swipex';
  kind: 'settings';
  version: 1;
  exportedAt: string;
  settings: Record<string, unknown>;
}

export const SETTINGS_BACKUP_FILENAME_PREFIX = 'swipex-settings';

/** Pre-import safety snapshot (kept under the user-scoped prefix, wiped on sign-out). */
export const SETTINGS_IMPORT_SNAPSHOT_KEY = `${USER_KEY_PREFIX}settings_import_snapshot`;

export function buildSettingsBackup(settings: Settings, now = new Date()): SettingsBackupFile {
  return {
    app: 'swipex',
    kind: 'settings',
    version: 1,
    exportedAt: now.toISOString(),
    settings: settings as unknown as Record<string, unknown>,
  };
}

export function backupFilename(date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `${SETTINGS_BACKUP_FILENAME_PREFIX}-${day}.json`;
}

/**
 * Parses an imported file. Returns null for anything that is not a SwiPex
 * settings backup; valid files are normalised through `settingsFromDoc`, so
 * unknown/missing fields fall back to defaults instead of crashing the app.
 */
export function parseSettingsBackup(text: string, today: string): Settings | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const file = raw as Partial<SettingsBackupFile>;
  if (file.app !== 'swipex' || file.kind !== 'settings') return null;
  if (file.version !== 1 || typeof file.settings !== 'object' || file.settings === null) return null;
  return settingsFromDoc(file.settings as Record<string, unknown>, today);
}

/** Saves the current settings before an import replaces them (restore possible manually). */
export function saveImportSnapshot(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_IMPORT_SNAPSHOT_KEY, JSON.stringify(buildSettingsBackup(settings)));
  } catch {
    /* storage unavailable: import still proceeds */
  }
}

export function loadImportSnapshot(today: string): Settings | null {
  try {
    const text = localStorage.getItem(SETTINGS_IMPORT_SNAPSHOT_KEY);
    return text === null ? null : parseSettingsBackup(text, today);
  } catch {
    return null;
  }
}

/** Triggers a browser download of the backup JSON. */
export function downloadSettingsBackup(settings: Settings, date = new Date()): void {
  const blob = new Blob([JSON.stringify(buildSettingsBackup(settings, date), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFilename(date);
  link.click();
  URL.revokeObjectURL(url);
}
