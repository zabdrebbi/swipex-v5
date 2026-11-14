import { describe, expect, it } from 'vitest';
import { smsLink, telLink, whatsappLink, whatsappPhone, yalidineLink } from './links';

describe('telLink / smsLink', () => {
  it('builds the dialer link', () => {
    expect(telLink('0550123456')).toBe('tel:0550123456');
  });

  it('joins both phones and encodes the body', () => {
    expect(smsLink(['0550123456'])).toBe('sms:0550123456');
    expect(smsLink(['0550123456', '0661234567'])).toBe('sms:0550123456,0661234567');
    expect(smsLink(['0550123456'], 'hello world')).toBe('sms:0550123456?body=hello%20world');
    expect(smsLink(['', '0661234567'])).toBe('sms:0661234567');
  });
});

describe('whatsappPhone / whatsappLink', () => {
  it('drops the local leading zero and prefixes the country code', () => {
    expect(whatsappPhone('0550123456')).toBe('213550123456');
    expect(whatsappPhone('+213 550 123 456')).toBe('213550123456');
    expect(whatsappPhone('550123456')).toBe('213550123456');
    expect(whatsappPhone('')).toBe('');
    expect(whatsappPhone('abc')).toBe('');
  });

  it('builds the link with an optional prefilled message', () => {
    expect(whatsappLink('0550123456')).toBe('https://wa.me/213550123456');
    expect(whatsappLink('0550123456', 'hi there')).toBe('https://wa.me/213550123456?text=hi%20there');
    expect(whatsappLink('')).toBe('');
  });
});

describe('yalidineLink', () => {
  it('lower-cases the prefix before the first dash', () => {
    expect(yalidineLink('CMP-123456')).toBe(
      'https://yalidine.app/app/livraison/livrer_un_colis.php?tracking=cmp-123456',
    );
    expect(yalidineLink('YAL-0000000001')).toBe(
      'https://yalidine.app/app/livraison/livrer_un_colis.php?tracking=yal-0000000001',
    );
  });

  it('keeps a dash-less tracking untouched and refuses empties', () => {
    expect(yalidineLink('PLAIN123')).toContain('tracking=PLAIN123');
    expect(yalidineLink('   ')).toBeNull();
    expect(yalidineLink('')).toBeNull();
  });
});
