import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Globe, MessageCircle, MessageSquare, Phone, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import SwipeableCard from '@/features/parcels/swipe/SwipeableCard';
import PhonePickDialog from '@/features/parcels/PhonePickDialog';
import { buildSmsMessage } from '@/domain/parcel/sms';
import { smsLink, telLink, whatsappLink, yalidineLink } from '@/domain/contact/links';
import { useFocusMode } from './useFocusMode';
import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';

interface FocusModeProps {
  /** The filtered list the index walks over (wrap-around, no auto-advance). */
  parcels: readonly Parcel[];
  statusLabel: (ref: StatusRef) => string;
  statusColor: (ref: StatusRef) => string;
  onExit: () => void;
  /** Tracking tapped in the card: exits and starts a search for it. */
  onFindTracking: (tracking: string) => void;
}

const WHATSAPP_LONG_PRESS_MS = 500;

/**
 * Full-screen delivery focus (z-45: above the bottom bar and FAB, below the
 * modals): red counter header, one parcel card, contact actions, direct
 * deliver/waiting status changes (no countdown, like v4) and prev/next both by
 * buttons and by swiping the card.
 */
export default function FocusMode({ parcels, statusLabel, statusColor, onExit, onFindTracking }: FocusModeProps) {
  const { t, dir, formatCurrency } = useI18n();
  const { settings } = useSettings();
  const { changeStatus, updateParcel } = useParcels();
  const { index, current, goPrev, goNext } = useFocusMode(parcels, true, onExit);
  const [pickingPhone, setPickingPhone] = useState(false);
  const whatsappTimerRef = useRef<number | null>(null);
  const whatsappLongRef = useRef(false);

  useEffect(
    () => () => {
      if (whatsappTimerRef.current !== null) window.clearTimeout(whatsappTimerRef.current);
    },
    [],
  );

  if (!current) return null;
  // Captured with its narrowed type: closures below (JSX handlers, actions)
  // cannot rely on the flow-narrowing of `current` itself.
  const parcel: Parcel = current;

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  function callReceiver() {
    const phones = [parcel.phone, parcel.phone2].filter((phone): phone is string => !!phone);
    if (phones.length > 1) setPickingPhone(true);
    else if (phones.length === 1) window.location.href = telLink(phones[0]);
  }

  function sendSms() {
    const template = settings.smsTemplate ?? t('sms.default_status');
    const message = buildSmsMessage(parcel, template, settings.smsContentLength);
    const phones = [parcel.phone, parcel.phone2].filter((phone): phone is string => !!phone);
    if (phones.length === 0) return;
    updateParcel(parcel.tracking, { smsSent: true });
    window.location.href = smsLink(phones, message);
  }

  function openWhatsApp(withText: boolean) {
    const template = settings.whatsappTemplate ?? settings.smsTemplate ?? t('sms.default_status');
    const message = withText ? buildSmsMessage(parcel, template, settings.smsContentLength) : '';
    const url = whatsappLink(parcel.phone, message);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  function whatsappDown() {
    whatsappLongRef.current = false;
    if (whatsappTimerRef.current !== null) window.clearTimeout(whatsappTimerRef.current);
    whatsappTimerRef.current = window.setTimeout(() => {
      whatsappLongRef.current = true;
      whatsappTimerRef.current = null;
      openWhatsApp(true); // long-press: prefilled message (v4)
    }, WHATSAPP_LONG_PRESS_MS);
  }

  function whatsappUp() {
    if (whatsappTimerRef.current !== null) {
      window.clearTimeout(whatsappTimerRef.current);
      whatsappTimerRef.current = null;
    }
  }

  function whatsappClick() {
    if (whatsappLongRef.current) {
      whatsappLongRef.current = false; // the long-press already opened it
      return;
    }
    openWhatsApp(false);
  }

  function openYalidine() {
    const url = yalidineLink(parcel.tracking);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  const actionClass =
    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-gray-200 px-1 text-[11px] font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800';

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex h-14 shrink-0 items-center justify-between bg-red-600 px-3 text-white shadow-md">
        <button
          type="button"
          onClick={onExit}
          aria-label={t('focus.exit')}
          className="flex size-10 items-center justify-center rounded-xl hover:bg-white/15"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <span className="font-mono text-sm font-bold" dir="ltr">
          {index + 1} / {parcels.length}
        </span>
        <span className="text-sm font-bold">{t('focus.title')}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <SwipeableCard
          onSwipeRight={goPrev}
          onSwipeLeft={goNext}
          leftReveal={
            <>
              <PrevIcon className="size-5" />
              <span>{t('focus.prev')}</span>
            </>
          }
          rightReveal={
            <>
              <NextIcon className="size-5" />
              <span>{t('focus.next')}</span>
            </>
          }
        >
          <article className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onFindTracking(parcel.tracking)}
                title={t('focus.find')}
                className="flex items-center gap-1.5 font-mono text-sm font-bold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                dir="ltr"
              >
                {parcel.tracking}
              </button>
              <div className="flex items-center gap-1.5">
                {parcel.smsSent && (
                  <button
                    type="button"
                    onClick={() => updateParcel(parcel.tracking, { smsSent: false })}
                    aria-label={t('focus.clear_sms')}
                    title={t('focus.clear_sms')}
                    className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                )}
                <span
                  className="flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-white"
                  style={{ backgroundColor: statusColor(parcel.status) }}
                >
                  <span className="size-2 rounded-full bg-white/80" aria-hidden="true" />
                  {statusLabel(parcel.status)}
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <p className="font-bold">{parcel.receiver || t('parcels.card.unknown_receiver')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {parcel.municipality}
                {parcel.amount > 0 && (
                  <span className="ms-2 font-bold text-gray-700 dark:text-gray-200">
                    {formatCurrency(parcel.amount)}
                  </span>
                )}
              </p>
              {parcel.openingAllowed !== null && (
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {parcel.openingAllowed ? t('focus.opening_yes') : t('focus.opening_no')}
                </p>
              )}
            </div>

            <textarea
              key={parcel.tracking}
              rows={2}
              defaultValue={parcel.notes ?? ''}
              placeholder={t('focus.notes_placeholder')}
              aria-label={t('focus.notes_placeholder')}
              onBlur={(event) => updateParcel(parcel.tracking, { notes: event.target.value })}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
            />
          </article>
        </SwipeableCard>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={callReceiver} className={actionClass}>
            <Phone className="size-4" aria-hidden="true" />
            {t('focus.call')}
          </button>
          <button
            type="button"
            onClick={whatsappClick}
            onPointerDown={whatsappDown}
            onPointerUp={whatsappUp}
            onPointerLeave={whatsappUp}
            onPointerCancel={whatsappUp}
            className={actionClass}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t('focus.whatsapp')}
          </button>
          <button
            type="button"
            onClick={sendSms}
            title={parcel.smsSent ? t('focus.sms_sent') : t('focus.sms')}
            className={`${actionClass} relative`}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            {t('focus.sms')}
            {parcel.smsSent && (
              <Check className="absolute end-1.5 top-1.5 size-3 text-emerald-500" aria-hidden="true" />
            )}
          </button>
          <button type="button" onClick={openYalidine} className={actionClass}>
            <Globe className="size-4" aria-hidden="true" />
            {t('focus.yalidine')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label={t('focus.prev')}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <PrevIcon className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => changeStatus(parcel.tracking, 'delivered')}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
          >
            {t('focus.deliver')}
          </button>
          <button
            type="button"
            onClick={() => changeStatus(parcel.tracking, 'waiting')}
            className="min-h-12 flex-1 rounded-xl border border-gray-300 font-bold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {t('focus.wait')}
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={t('focus.next')}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <NextIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {pickingPhone && (
        <PhonePickDialog
          phones={[parcel.phone, parcel.phone2].filter((phone): phone is string => !!phone)}
          onPick={(phone) => {
            window.location.href = telLink(phone);
            setPickingPhone(false);
          }}
          onClose={() => setPickingPhone(false)}
        />
      )}
    </div>
  );
}
