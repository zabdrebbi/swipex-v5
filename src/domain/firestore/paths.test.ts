import { describe, expect, it } from 'vitest';
import { archiveCollection, archiveDoc, parcelDoc, parcelsCollection, settingsDoc, syncMetaDoc, taskDoc, tasksCollection } from './paths';

const UID = 'user123';

describe('firestore paths', () => {
  it('builds the settings document under settings/main', () => {
    expect(settingsDoc(UID)).toBe('users/user123/settings/main');
  });

  it('keys parcels and archive entries by tracking number', () => {
    expect(parcelsCollection(UID)).toBe('users/user123/parcels_v2');
    expect(parcelDoc(UID, 'YAL1')).toBe('users/user123/parcels_v2/YAL1');
    expect(archiveCollection(UID)).toBe('users/user123/archive_v2');
    expect(archiveDoc(UID, 'YAL1')).toBe('users/user123/archive_v2/YAL1');
  });

  it('builds tasks and per-device sync meta', () => {
    expect(tasksCollection(UID)).toBe('users/user123/tasks');
    expect(taskDoc(UID, 't1')).toBe('users/user123/tasks/t1');
    expect(syncMetaDoc(UID, 'dev1')).toBe('users/user123/_syncMeta/dev1');
  });
});
