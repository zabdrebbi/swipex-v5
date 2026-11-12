import { describe, expect, it } from 'vitest';
import { sanitizeForFirestore, sanitizeRecord } from './serialize';

describe('sanitizeForFirestore', () => {
  it('keeps plain JSON values', () => {
    expect(sanitizeForFirestore('text')).toBe('text');
    expect(sanitizeForFirestore(42)).toBe(42);
    expect(sanitizeForFirestore(0)).toBe(0);
    expect(sanitizeForFirestore(false)).toBe(false);
    expect(sanitizeForFirestore(null)).toBeNull();
  });

  it('drops undefined keys and non-finite numbers', () => {
    const result = sanitizeForFirestore({ keep: 1, skip: undefined, nan: Number.NaN, inf: Infinity });
    expect(result).toEqual({ keep: 1, nan: null, inf: null });
    expect('skip' in (result as object)).toBe(false);
  });

  it('cleans nested structures and arrays', () => {
    const result = sanitizeForFirestore({
      nested: { a: 1, b: undefined },
      list: [1, undefined, 'x'],
      bad: [Number.NaN],
    });
    expect(result).toEqual({ nested: { a: 1 }, list: [1, 'x'], bad: [null] });
  });

  it('ignores unsupported types', () => {
    expect(sanitizeForFirestore(() => 1)).toBeUndefined();
    expect(sanitizeForFirestore(Symbol('s'))).toBeUndefined();
    expect(sanitizeForFirestore({ fn: () => 1 })).toEqual({});
  });
});

describe('sanitizeRecord', () => {
  it('returns a plain object record', () => {
    expect(sanitizeRecord({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(sanitizeRecord({})).toEqual({});
  });
});
