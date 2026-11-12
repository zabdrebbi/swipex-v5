import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/types';
import {
  deliveryConfirmSeconds,
  requiresDeliveryConfirm,
  shouldSkipSmsConfirm,
  statusSmsTarget,
} from './statusFlow';

const TODAY = '2026-11-12';

function settingsWith(patch: Partial<Settings>): Settings {
  return { ...createDefaultSettings(TODAY), ...patch };
}

describe('requiresDeliveryConfirm', () => {
  it('asks for confirmation only for delivered when the option is on', () => {
    expect(requiresDeliveryConfirm('delivered', settingsWith({}))).toBe(true);
    expect(requiresDeliveryConfirm('cancelled', settingsWith({}))).toBe(false);
    expect(requiresDeliveryConfirm('custom:cs_x', settingsWith({}))).toBe(false);
  });

  it('respects the user toggle', () => {
    const off = settingsWith({ deliveryConfirmEnabled: false });
    expect(requiresDeliveryConfirm('delivered', off)).toBe(false);
  });
});

describe('deliveryConfirmSeconds', () => {
  it('clamps stored values into the 1..30 range', () => {
    expect(deliveryConfirmSeconds(settingsWith({ deliveryConfirmSeconds: 7 }))).toBe(7);
    expect(deliveryConfirmSeconds(settingsWith({ deliveryConfirmSeconds: 0 }))).toBe(1);
    expect(deliveryConfirmSeconds(settingsWith({ deliveryConfirmSeconds: 999 }))).toBe(30);
    expect(deliveryConfirmSeconds(settingsWith({ deliveryConfirmSeconds: 2.4 }))).toBe(2);
  });
});

describe('statusSmsTarget', () => {
  it('offers SMS only for the three v4 statuses', () => {
    const on = settingsWith({
      smsOnStatusClosed: true,
      smsOnStatusNoAnswer: true,
      smsOnStatusWrongNumber: true,
    });
    expect(statusSmsTarget('closed', on)).toBe('receiver');
    expect(statusSmsTarget('no_answer', on)).toBe('receiver');
    // Wrong number messages the SENDER (v4 rule).
    expect(statusSmsTarget('wrong_number', on)).toBe('sender');
    expect(statusSmsTarget('delivered', on)).toBeNull();
    expect(statusSmsTarget('no_action', on)).toBeNull();
  });

  it('returns null when the matching toggle is off', () => {
    const off = settingsWith({
      smsOnStatusClosed: false,
      smsOnStatusNoAnswer: false,
      smsOnStatusWrongNumber: false,
    });
    expect(statusSmsTarget('closed', off)).toBeNull();
    expect(statusSmsTarget('no_answer', off)).toBeNull();
    expect(statusSmsTarget('wrong_number', off)).toBeNull();
  });

  it('does not leak SMS offers to custom statuses', () => {
    expect(statusSmsTarget('custom:cs_1', settingsWith({}))).toBeNull();
  });
});

describe('shouldSkipSmsConfirm', () => {
  it('always skips when the status has no SMS target', () => {
    expect(shouldSkipSmsConfirm(settingsWith({}), null, false, false)).toBe(true);
  });

  it('skips only in saving mode for an already-sent reopened parcel', () => {
    const saving = settingsWith({ smsSaving: true });
    const normal = settingsWith({ smsSaving: false });
    expect(shouldSkipSmsConfirm(saving, 'receiver', true, true)).toBe(true);
    expect(shouldSkipSmsConfirm(saving, 'receiver', false, true)).toBe(false);
    expect(shouldSkipSmsConfirm(saving, 'receiver', true, false)).toBe(false);
    expect(shouldSkipSmsConfirm(normal, 'receiver', true, true)).toBe(false);
  });
});
