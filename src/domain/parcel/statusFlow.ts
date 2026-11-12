import type { Settings } from '../settings/types';
import type { StatusRef } from '../status/types';

/** Where the confirmation SMS for a status goes (null = no SMS for that status). */
export type StatusSmsTarget = 'receiver' | 'sender';

/**
 * A click on "delivered" must pass a cancellable countdown first (unless the
 * user turned the confirmation off). Long-press skips it by design (step 6 UI).
 */
export function requiresDeliveryConfirm(status: StatusRef, settings: Settings): boolean {
  return status === 'delivered' && settings.deliveryConfirmEnabled;
}

export function deliveryConfirmSeconds(settings: Settings): number {
  // Domain guarantee even if a stored value slipped through unnormalised.
  return Math.max(1, Math.min(30, Math.round(settings.deliveryConfirmSeconds)));
}

/**
 * Which statuses offer the confirm-SMS dialog on change, following the v4
 * toggles (closed / no answer / wrong number). Wrong number messages the
 * SENDER, the other two message the RECEIVER.
 */
export function statusSmsTarget(status: StatusRef, settings: Settings): StatusSmsTarget | null {
  if (status === 'closed') return settings.smsOnStatusClosed ? 'receiver' : null;
  if (status === 'no_answer') return settings.smsOnStatusNoAnswer ? 'receiver' : null;
  if (status === 'wrong_number') return settings.smsOnStatusWrongNumber ? 'sender' : null;
  return null;
}

/**
 * Whether the SMS dialog should be skipped: saving mode + a parcel reopened
 * from a previous day (archived) whose message was already sent (v4 smsSaving).
 */
export function shouldSkipSmsConfirm(
  settings: Settings,
  target: StatusSmsTarget | null,
  alreadySent: boolean,
  isReopenedFromArchive: boolean,
): boolean {
  if (target === null) return true;
  return settings.smsSaving && alreadySent && isReopenedFromArchive;
}
