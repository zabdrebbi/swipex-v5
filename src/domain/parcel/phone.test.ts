import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('accepts already canonical numbers untouched', () => {
    expect(normalizePhone('0550123456')).toBe('0550123456');
    expect(normalizePhone('0661234567')).toBe('0661234567');
    expect(normalizePhone('0770123456')).toBe('0770123456');
  });

  it('strips spaces, dashes and dots', () => {
    expect(normalizePhone('0550 123 456')).toBe('0550123456');
    expect(normalizePhone('0550-123-456')).toBe('0550123456');
    expect(normalizePhone('05.50.12.34.56')).toBe('0550123456');
  });

  it('converts +213 / 00213 country prefixes to the local form', () => {
    expect(normalizePhone('+213550123456')).toBe('0550123456');
    expect(normalizePhone('00213550123456')).toBe('0550123456');
    expect(normalizePhone('213550123456')).toBe('0550123456');
  });

  it('adds the missing leading zero to bare 9-digit numbers', () => {
    expect(normalizePhone('550123456')).toBe('0550123456');
    expect(normalizePhone('661234567')).toBe('0661234567');
  });

  it('keeps the last 10 digits of over-long valid input', () => {
    expect(normalizePhone('002130550123456')).toBe('0550123456');
  });

  it('collapses redundant leading zeros', () => {
    expect(normalizePhone('000550123456')).toBe('0550123456');
  });

  it('rejects anything that is not an Algerian mobile number', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
    expect(normalizePhone('12345')).toBe('');
    expect(normalizePhone('0990123456')).toBe(''); // fixed-line prefix, not 5/6/7
    expect(normalizePhone('055012345')).toBe(''); // too short
    expect(normalizePhone('hello')).toBe('');
  });
});

describe('isValidPhone', () => {
  it('matches the canonical form only', () => {
    expect(isValidPhone('0550123456')).toBe(true);
    expect(isValidPhone('550123456')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});
