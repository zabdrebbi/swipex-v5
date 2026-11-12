import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '@/domain/settings/defaults';
import type { Settings } from '@/domain/settings/types';
import {
  backupFilename,
  buildSettingsBackup,
  parseSettingsBackup,
} from './backup';

const TODAY = '2026-11-12';

describe('buildSettingsBackup', () => {
  it('stamps the file with app metadata', () => {
    const backup = buildSettingsBackup(createDefaultSettings(TODAY));
    expect(backup.app).toBe('swipex');
    expect(backup.kind).toBe('settings');
    expect(backup.version).toBe(1);
    expect(backup.settings.sessionDate).toBe(TODAY);
  });

  it('builds a dated filename', () => {
    expect(backupFilename(new Date('2026-11-12T09:00:00Z'))).toBe('swipex-settings-2026-11-12.json');
  });
});

describe('parseSettingsBackup', () => {
  it('round-trips every setting through export -> import', () => {
    const original: Settings = {
      ...createDefaultSettings(TODAY),
      language: 'fr',
      deliveryConfirmSeconds: 7,
      smsContentLength: 25,
      showDuplicates: false,
      tagsEnabled: true,
      tags: [{ name: 'vip', color: '#ff0000', scope: 'global' }],
      customStatuses: [
        { id: 'cs_x', name: { ar: 'A', fr: 'B', en: 'C' }, color: '#123456', icon: 'Star' },
      ],
      statusOrder: ['delivered', 'custom:cs_x'],
    };
    const text = JSON.stringify(buildSettingsBackup(original));
    const restored = parseSettingsBackup(text, TODAY);
    expect(restored).toEqual(original);
  });

  it('accepts an empty settings object as pure defaults', () => {
    const restored = parseSettingsBackup(JSON.stringify({ app: 'swipex', kind: 'settings', version: 1, settings: {} }), TODAY);
    expect(restored).not.toBeNull();
    expect(restored!.deliveryConfirmSeconds).toBe(3);
    expect(restored!.sessionDate).toBe(TODAY);
  });

  it('rejects malformed or foreign files', () => {
    expect(parseSettingsBackup('not json {', TODAY)).toBeNull();
    expect(parseSettingsBackup('"just a string"', TODAY)).toBeNull();
    expect(parseSettingsBackup('null', TODAY)).toBeNull();
    expect(parseSettingsBackup(JSON.stringify({ app: 'other', kind: 'settings', version: 1, settings: {} }), TODAY)).toBeNull();
    expect(parseSettingsBackup(JSON.stringify({ app: 'swipex', kind: 'parcels', version: 1, settings: {} }), TODAY)).toBeNull();
    expect(parseSettingsBackup(JSON.stringify({ app: 'swipex', kind: 'settings', version: 2, settings: {} }), TODAY)).toBeNull();
    expect(parseSettingsBackup(JSON.stringify({ app: 'swipex', kind: 'settings', version: 1, settings: 'oops' }), TODAY)).toBeNull();
  });

  it('never lets a hostile file break field validation', () => {
    const restored = parseSettingsBackup(
      JSON.stringify({
        app: 'swipex',
        kind: 'settings',
        version: 1,
        settings: { deliveryConfirmSeconds: 999, language: 'de', themeMode: 'neon' },
      }),
      TODAY,
    );
    expect(restored!.deliveryConfirmSeconds).toBe(3);
    expect(restored!.language).toBe('ar');
    expect(restored!.themeMode).toBe('auto');
  });
});
