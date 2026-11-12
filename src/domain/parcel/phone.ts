/**
 * Normalises an Algerian phone number to the canonical `0[567]XXXXXXXX` form
 * (10 digits). Returns '' when the input cannot be interpreted as a valid
 * number, so the UI can warn instead of storing garbage.
 *
 * Rules ported from v4's `cleanPhoneNumberString`:
 * - strip every non-digit,
 * - collapse leading zeros, then re-prefix `213`/`00` country codes with `0`,
 * - add the missing leading `0` to bare 9-digit numbers,
 * - keep the last 10 digits of longer inputs when they form a valid number.
 */
export function normalizePhone(raw: string): string {
  if (raw.trim() === '') return '';
  let digits = raw.replace(/\D+/g, '');

  digits = digits.replace(/^0+/, '');
  if (digits.startsWith('213')) digits = `0${digits.slice(3)}`;
  if (/^[567]\d{8}$/.test(digits)) digits = `0${digits}`;

  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    if (/^0[567]\d{8}$/.test(last10)) digits = last10;
  }

  return /^0[567]\d{8}$/.test(digits) ? digits : '';
}

/** True when the value is already a valid canonical number. */
export function isValidPhone(raw: string): boolean {
  return /^0[567]\d{8}$/.test(raw);
}
