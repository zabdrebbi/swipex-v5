import type { Parcel } from './types';

/**
 * Placeholders supported by the SMS templates (settings + i18n defaults).
 * ASCII names on purpose: they survive any editor/encoding round-trip.
 */
export const SMS_PLACEHOLDERS = [
  'receiver',
  'tracking',
  'amount',
  'content',
  'municipality',
  'wilaya',
  'sender',
] as const;

export type SmsTarget = 'receiver' | 'sender';

/**
 * Replaces `{placeholders}` in an SMS template with the parcel's fields.
 * `{content}` is truncated to `contentLength` characters (v4 smsContentLength).
 * Unknown placeholders are left untouched so user typos stay visible.
 */
export function buildSmsMessage(
  parcel: Parcel,
  template: string,
  contentLength: number,
): string {
  const maxLen = Math.max(0, Math.round(contentLength));
  const values: Record<string, string> = {
    receiver: parcel.receiver,
    tracking: parcel.tracking,
    amount: parcel.amount > 0 ? String(parcel.amount) : '',
    content: (parcel.content ?? '').slice(0, maxLen),
    municipality: parcel.municipality,
    wilaya: parcel.wilaya ?? '',
    sender: parcel.sender ?? '',
  };
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? values[name] : match,
  );
}

/** The phone an SMS for `target` goes to ('' = no number stored). */
export function smsPhone(parcel: Parcel, target: SmsTarget): string {
  return target === 'sender' ? parcel.senderPhone ?? '' : parcel.phone;
}
