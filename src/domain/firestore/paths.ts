/**
 * Firestore path builders. The tree lives under `users/{uid}` and every user
 * reads/writes only their own sub-trees (enforced by firestore.rules).
 */

export const SETTINGS_DOC_ID = 'main';

export function settingsDoc(uid: string): string {
  return `users/${uid}/settings/${SETTINGS_DOC_ID}`;
}

export function parcelsCollection(uid: string): string {
  return `users/${uid}/parcels_v2`;
}

/** Document id is the trimmed tracking number. */
export function parcelDoc(uid: string, tracking: string): string {
  return `${parcelsCollection(uid)}/${tracking}`;
}

export function archiveCollection(uid: string): string {
  return `users/${uid}/archive_v2`;
}

/** Document id is the trimmed tracking number. */
export function archiveDoc(uid: string, tracking: string): string {
  return `${archiveCollection(uid)}/${tracking}`;
}

export function tasksCollection(uid: string): string {
  return `users/${uid}/tasks`;
}

export function taskDoc(uid: string, taskId: string): string {
  return `${tasksCollection(uid)}/${taskId}`;
}

export function syncMetaCollection(uid: string): string {
  return `users/${uid}/_syncMeta`;
}

export function syncMetaDoc(uid: string, deviceId: string): string {
  return `${syncMetaCollection(uid)}/${deviceId}`;
}
