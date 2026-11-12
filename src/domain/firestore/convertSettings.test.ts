import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../settings/defaults';
import { BUILT_IN_STATUSES, customStatusRef } from '../status/statuses';
import { settingsFromDoc, settingsToDoc } from './convertSettings';

const TODAY = '2026-11-12';

describe('default settings', () => {
  it('matches the documented defaults', () => {
    const s = createDefaultSettings(TODAY);
    expect(s.sessionDate).toBe(TODAY);
    expect(s.language).toBe('ar');
    expect(s.themeMode).toBe('auto');
    expect(s.direction).toBe('auto');
    expect(s.deliveryConfirmEnabled).toBe(true);
    expect(s.deliveryConfirmSeconds).toBe(3);
    expect(s.smsContentLength).toBe(10);
    expect(s.archiveSyncEnabled).toBe(true);
    expect(s.smsTemplate).toBeNull();
  });

  it('has no custom statuses or groups for a new account', () => {
    const s = createDefaultSettings(TODAY);
    expect(s.customStatuses).toEqual([]);
    expect(s.statusGroups).toEqual([]);
    expect(s.statusOrder).toEqual([]);
  });
});

describe('settingsFromDoc', () => {
  it('fills missing fields with defaults', () => {
    const s = settingsFromDoc({ language: 'fr' }, TODAY);
    expect(s.language).toBe('fr');
    expect(s.deliveryConfirmSeconds).toBe(3);
    expect(s.sessionDate).toBe(TODAY);
  });

  it('rejects malformed values instead of propagating them', () => {
    const s = settingsFromDoc({
      language: 'de',
      themeMode: 'neon',
      direction: 'sideways',
      deliveryConfirmSeconds: 999,
      smsContentLength: -5,
      sessionDate: 'tomorrow',
      statusOrder: ['bogus', 'delivered', 'delivered'],
      tags: [{ name: '@dup', color: '#fff' }, { name: 'dup' }],
    }, TODAY);
    expect(s.language).toBe('ar');
    expect(s.themeMode).toBe('auto');
    expect(s.direction).toBe('auto');
    expect(s.deliveryConfirmSeconds).toBe(3);
    expect(s.smsContentLength).toBe(10);
    expect(s.sessionDate).toBe(TODAY);
    expect(s.statusOrder).toEqual(['delivered']);
    expect(s.tags).toHaveLength(1);
  });

  it('keeps only valid three-language custom statuses', () => {
    const s = settingsFromDoc({
      customStatuses: [
        { id: 'cs_ok', name: { ar: 'A', fr: 'B', en: 'C' }, color: '#123456', icon: 'Star' },
        { id: 'cs_bad', name: { ar: 'A', fr: '', en: 'C' } },
        { id: 'not-valid-id', name: { ar: 'A', fr: 'B', en: 'C' } },
      ],
      statusOrder: ['custom:cs_ok'],
      statusActionEnabled: { 'custom:cs_ok': true, 'custom:cs_bad': false, unknown: true },
    }, TODAY);
    expect(s.customStatuses.map((c) => c.id)).toEqual(['cs_ok']);
    expect(s.statusOrder).toEqual(['custom:cs_ok']);
    expect(s.statusActionEnabled).toEqual({ 'custom:cs_ok': true });
  });

  it('assigns each status to at most one group and drops unknown refs', () => {
    const s = settingsFromDoc({
      statusGroups: [
        { id: 'g1', name: 'First', statuses: ['delivered', 'waiting'] },
        { id: 'g2', name: 'Second', statuses: ['delivered', 'missing_status'] },
        { id: 'g3', name: '', statuses: [] },
      ],
    }, TODAY);
    expect(s.statusGroups).toHaveLength(2);
    expect(s.statusGroups[0].statuses).toEqual(['delivered', 'waiting']);
    expect(s.statusGroups[1].statuses).toEqual([]);
  });

  it('normalises tag names without the @ prefix and drops orphan tag order', () => {
    const s = settingsFromDoc({
      tags: [
        { name: '@vip', color: '#ff0000', scope: 'global' },
        { name: 'orphan_scope', scope: 'municipality' },
        { name: 'ok', scope: 'municipality', municipality: 'Alger' },
      ],
      tagOrder: ['vip', 'ghost', 'vip'],
    }, TODAY);
    expect(s.tags.map((t) => t.name)).toEqual(['vip', 'ok']);
    expect(s.tagOrder).toEqual(['vip']);
    expect(s.tags[1].municipality).toBe('Alger');
  });
});

describe('settingsToDoc', () => {
  it('produces JSON-safe documents', () => {
    const doc = settingsToDoc(createDefaultSettings(TODAY));
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });

  it('keeps custom status refs stable across a round-trip', () => {
    const ref = customStatusRef('cs_x1');
    const restored = settingsFromDoc(settingsToDoc({
      ...createDefaultSettings(TODAY),
      statusOrder: [BUILT_IN_STATUSES[2].key, ref],
    }), TODAY);
    expect(restored.statusOrder).toEqual(['delivered', ref]);
  });
});
