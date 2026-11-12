import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import type { Settings } from '@/domain/settings/types';
import type { StatusRef } from '@/domain/status/types';
import { BUILT_IN_STATUSES, customStatusRef } from '@/domain/status/statuses';
import { deliveryConfirmSeconds, requiresDeliveryConfirm, shouldSkipSmsConfirm, statusSmsTarget } from '@/domain/parcel/statusFlow';
import { buildSmsMessage, smsPhone, type SmsTarget } from '@/domain/parcel/sms';

interface StatusChangeModalProps {
  parcel: Parcel;
  settings: Settings;
  statusLabel: (ref: StatusRef) => string;
  /** Applies the status (writes status + statusUpdatedAt only). */
  onApply: (tracking: string, status: StatusRef) => void;
  /** Marks smsSent/senderSmsSent after the user actually opened the SMS composer. */
  onSmsSent: (tracking: string, target: SmsTarget) => void;
  onClose: () => void;
}

type ModalStep = 'pick' | 'countdown' | 'sms';

/** Status picker with the delivered countdown and the optional SMS confirm (v4 flow). */
export default function StatusChangeModal({
  parcel,
  settings,
  statusLabel,
  onApply,
  onSmsSent,
  onClose,
}: StatusChangeModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<ModalStep>('pick');
  const [pendingStatus, setPendingStatus] = useState<StatusRef | null>(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const options = useMemo<StatusRef[]>(() => {
    const builtIns: StatusRef[] = BUILT_IN_STATUSES.map((s) => s.key);
    const customs: StatusRef[] = settings.customStatuses.map(
      (s): StatusRef => customStatusRef(s.id),
    );
    return [...builtIns, ...customs];
  }, [settings.customStatuses]);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => clearTimer, []);

  function commit(status: StatusRef) {
    onApply(parcel.tracking, status);
    onClose();
  }

  function pick(status: StatusRef) {
    if (status === parcel.status) {
      onClose();
      return;
    }
    if (requiresDeliveryConfirm(status, settings)) {
      setPendingStatus(status);
      const seconds = deliveryConfirmSeconds(settings);
      setRemaining(seconds);
      setStep('countdown');
      timerRef.current = setInterval(() => {
        setRemaining((n) => {
          if (n <= 1) {
            clearTimer();
            commit(status);
            return 0;
          }
          return n - 1;
        });
      }, 1000);
      return;
    }
    const target = statusSmsTarget(status, settings);
    if (target !== null) {
      // v4 smsSaving: skip the dialog only for an already-sent, day-old parcel
      // reopened from the archive (archive flow arrives in step 7/8).
      const alreadySent = target === 'sender' ? parcel.senderSmsSent : parcel.smsSent;
      if (shouldSkipSmsConfirm(settings, target, alreadySent, false)) {
        commit(status);
        return;
      }
      setPendingStatus(status);
      setStep('sms');
      return;
    }
    commit(status);
  }

  /** Opens the native composer with the templated message (v4 confirmStatusChangeWithSms). */
  function sendSms() {
    if (pendingStatus === null) return;
    const target: SmsTarget = pendingStatus === 'wrong_number' ? 'sender' : 'receiver';
    const template =
      (target === 'sender' ? settings.smsWrongNumberTemplate : settings.smsStatusTemplate) ??
      t(target === 'sender' ? 'sms.default_wrong_number' : 'sms.default_status');
    const message = buildSmsMessage(parcel, template, settings.smsContentLength);
    const phone = smsPhone(parcel, target);
    onSmsSent(parcel.tracking, target);
    commit(pendingStatus);
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  function cancelCountdown() {
    clearTimer();
    setStep('pick');
    setPendingStatus(null);
  }

  const smsTitleKey: TranslationKey =
    pendingStatus === 'wrong_number' ? 'parcels.status.sms_sender_title' : 'parcels.status.sms_receiver_title';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('parcels.status.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={step === 'countdown' ? cancelCountdown : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'pick' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('parcels.status.title')}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
              {parcel.receiver} · <span className="font-mono" dir="ltr">{parcel.tracking}</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {options.map((ref) => {
                const isCurrent = ref === parcel.status;
                return (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => pick(ref)}
                    className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${
                      isCurrent
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                  >
                    {statusLabel(ref)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'countdown' && pendingStatus !== null && (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('parcels.status.confirm_delivered')}</p>
            <button
              type="button"
              onClick={cancelCountdown}
              className="mx-auto mt-4 flex size-24 items-center justify-center rounded-full border-4 border-emerald-500 text-4xl font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              aria-label={t('parcels.status.cancel_countdown')}
            >
              {remaining}
            </button>
            <p className="mt-4 font-bold">{statusLabel(pendingStatus)}</p>
            <button
              type="button"
              onClick={cancelCountdown}
              className="mt-4 min-h-11 w-full rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {step === 'sms' && pendingStatus !== null && (
          <div className="py-2 text-center">
            <p className="font-bold">{t(smsTitleKey)}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{statusLabel(pendingStatus)}</p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={sendSms}
                className="min-h-11 w-full rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
              >
                {t('parcels.status.change_with_sms')}
              </button>
              <button
                type="button"
                onClick={() => commit(pendingStatus)}
                className="min-h-11 w-full rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('parcels.status.change_only')}
              </button>
              <button type="button" onClick={onClose} className="min-h-11 w-full text-sm font-bold text-gray-500">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
