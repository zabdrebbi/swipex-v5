import { describe, expect, it } from 'vitest';
import ar from '../../i18n/locales/ar';
import en from '../../i18n/locales/en';
import fr from '../../i18n/locales/fr';
import { BUILT_IN_STATUSES, DEFAULT_STATUS, customStatusRef, getBuiltInStatus, isBuiltInStatusKey, parseStatusRef } from './statuses';
import type { CustomStatusId } from './types';

describe('built-in statuses', () => {
  it('defines exactly eight unique keys', () => {
    const keys = BUILT_IN_STATUSES.map((s) => s.key);
    expect(keys).toHaveLength(8);
    expect(new Set(keys).size).toBe(8);
  });

  it('uses hex colours and non-empty icon names', () => {
    for (const status of BUILT_IN_STATUSES) {
      expect(status.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(status.icon.length).toBeGreaterThan(0);
    }
  });

  it('defaults to no_action', () => {
    expect(DEFAULT_STATUS).toBe('no_action');
    expect(getBuiltInStatus('no_action')?.key).toBe('no_action');
    expect(getBuiltInStatus('unknown_key')).toBeUndefined();
  });

  it('narrows keys correctly', () => {
    expect(isBuiltInStatusKey('delivered')).toBe(true);
    expect(isBuiltInStatusKey('custom:cs_1')).toBe(false);
  });
});

describe('status references', () => {
  it('round-trips custom ids', () => {
    const id: CustomStatusId = 'cs_abc123';
    const ref = customStatusRef(id);
    expect(ref).toBe('custom:cs_abc123');
    expect(parseStatusRef(ref)).toEqual({ kind: 'custom', id: 'cs_abc123' });
  });

  it('parses built-in keys', () => {
    expect(parseStatusRef('waiting')).toEqual({ kind: 'built-in', key: 'waiting' });
  });
});

describe('status translations', () => {
  it('has a translation for every built-in status in all three languages', () => {
    for (const { key } of BUILT_IN_STATUSES) {
      const translationKey = `status.${key}` as keyof typeof ar.strings;
      for (const locale of [ar, fr, en]) {
        expect(locale.strings[translationKey], `${locale.meta.code}: ${translationKey}`).toBeTruthy();
      }
    }
  });
});
