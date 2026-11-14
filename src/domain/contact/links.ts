/** Phone dialer link (`tel:` scheme). */
export function telLink(phone: string): string {
  return `tel:${phone}`;
}

/** SMS link; `phones` may carry both numbers (comma-joined, like v4). */
export function smsLink(phones: readonly string[], body = ''): string {
  const joined = phones.filter((phone) => phone !== '').join(',');
  const suffix = body === '' ? '' : `?body=${encodeURIComponent(body)}`;
  return `sms:${joined}${suffix}`;
}

/**
 * wa.me target: digits only, local leading 0 dropped, `213` country code
 * added (`0550123456` -> `213550123456`). '' when the phone is unusable.
 */
export function whatsappPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, '').replace(/^0/, '');
  if (digits === '') return '';
  return digits.startsWith('213') ? digits : `213${digits}`;
}

/** WhatsApp link, optionally prefilled with a message. */
export function whatsappLink(phone: string, text = ''): string {
  const target = whatsappPhone(phone);
  if (target === '') return '';
  return text === '' ? `https://wa.me/${target}` : `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

/**
 * Yalidine delivery page for a tracking number. The platform reads the prefix
 * BEFORE the first dash lower-cased (`CMP-123` must be sent as `cmp-123`).
 * Returns null for an empty tracking (nothing to open).
 */
export function yalidineLink(tracking: string): string | null {
  const trimmed = tracking.trim();
  if (trimmed === '') return null;
  const dash = trimmed.indexOf('-');
  const normalized = dash > 0 ? trimmed.slice(0, dash).toLowerCase() + trimmed.slice(dash) : trimmed;
  return `https://yalidine.app/app/livraison/livrer_un_colis.php?tracking=${encodeURIComponent(normalized)}`;
}
