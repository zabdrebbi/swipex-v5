import { describe, expect, it } from 'vitest';
import { buildSmsMessage, smsPhone } from './sms';
import type { Parcel } from './types';

function parcel(patch: Partial<Parcel> = {}): Parcel {
  return {
    tracking: 'YZ123',
    receiver: 'Amine',
    phone: '0550123456',
    municipality: 'Bab Ezzouar',
    amount: 1500,
    content: 'Phone case and charger',
    type: '',
    status: 'no_action',
    statusUpdatedAt: '2026-11-12T08:00:00.000Z',
    createdAt: '2026-11-12T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
    sortOrder: 0,
    smsSent: false,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
    ...patch,
  };
}

describe('buildSmsMessage', () => {
  it('replaces every known placeholder', () => {
    const message = buildSmsMessage(
      parcel({ wilaya: 'Alger', sender: 'Yacine' }),
      'Hi {receiver}, {tracking} for {amount} DA in {municipality}/{wilaya} from {sender}: {content}',
      10,
    );
    expect(message).toBe('Hi Amine, YZ123 for 1500 DA in Bab Ezzouar/Alger from Yacine: Phone case');
  });

  it('truncates {content} to smsContentLength', () => {
    const message = buildSmsMessage(parcel(), 'Order: {content}!', 5);
    expect(message).toBe('Order: Phone!');
  });

  it('leaves unknown placeholders visible instead of guessing', () => {
    expect(buildSmsMessage(parcel(), 'Hello {nope}!', 10)).toBe('Hello {nope}!');
  });

  it('handles missing optional fields without throwing', () => {
    const message = buildSmsMessage(
      parcel({ content: undefined, wilaya: undefined, sender: undefined, amount: 0 }),
      '{content}|{wilaya}|{sender}|{amount}',
      10,
    );
    expect(message).toBe('|||');
  });
});

describe('smsPhone', () => {
  it('routes receiver SMS to phone and wrong-number SMS to the sender', () => {
    const p = parcel({ senderPhone: '0661999888' });
    expect(smsPhone(p, 'receiver')).toBe('0550123456');
    expect(smsPhone(p, 'sender')).toBe('0661999888');
  });

  it('returns an empty string when the sender has no number', () => {
    expect(smsPhone(parcel(), 'sender')).toBe('');
  });
});
