import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import { normalizePhone } from '@/domain/parcel/phone';
import ConfirmDialog from '@/components/ConfirmDialog';

interface EditParcelModalProps {
  parcel: Parcel;
  municipalities: string[];
  /** Returns false when another parcel already owns this tracking. */
  isTrackingFree: (tracking: string, exceptTracking: string) => boolean;
  onSave: (tracking: string, patch: Partial<Parcel>) => void;
  onClose: () => void;
}

interface FormState {
  tracking: string;
  receiver: string;
  phone: string;
  phone2: string;
  address: string;
  municipality: string;
  amount: string;
  content: string;
  notes: string;
}

function toForm(parcel: Parcel): FormState {
  return {
    tracking: parcel.tracking,
    receiver: parcel.receiver,
    phone: parcel.phone,
    phone2: parcel.phone2 ?? '',
    address: parcel.address ?? '',
    municipality: parcel.municipality,
    amount: parcel.amount > 0 ? String(parcel.amount) : '',
    content: parcel.content ?? '',
    notes: parcel.notes ?? '',
  };
}

/** Edit form: changing the price always asks first (v4 rule). */
export default function EditParcelModal({
  parcel,
  municipalities,
  isTrackingFree,
  onSave,
  onClose,
}: EditParcelModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => toForm(parcel));
  const [trackingError, setTrackingError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [confirmPrice, setConfirmPrice] = useState(false);

  const originalAmount = useMemo(() => parcel.amount, [parcel.amount]);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'tracking') setTrackingError(false);
    if (key === 'phone' || key === 'phone2') setPhoneError(false);
  }

  function buildPatch(): Partial<Parcel> | null {
    const tracking = form.tracking.trim();
    if (tracking === '' || !isTrackingFree(tracking, parcel.tracking)) {
      setTrackingError(true);
      return null;
    }
    const phone = normalizePhone(form.phone);
    const phone2 = normalizePhone(form.phone2);
    if ((form.phone.trim() !== '' && phone === '') || (form.phone2.trim() !== '' && phone2 === '')) {
      setPhoneError(true);
      return null;
    }

    const patch: Partial<Parcel> = {
      receiver: form.receiver.trim(),
      phone,
      address: form.address.trim(),
      municipality: form.municipality.trim(),
      amount: Number(form.amount) || 0,
      content: form.content.trim(),
      notes: form.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (tracking !== parcel.tracking) patch.tracking = tracking;
    // Empty string clears the optional field on the next read (optStr drops '').
    patch.phone2 = phone2;
    return patch;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const patch = buildPatch();
    if (patch === null) return;
    if (patch.amount !== originalAmount) {
      setConfirmPrice(true);
      return;
    }
    onSave(parcel.tracking, patch);
    onClose();
  }

  function confirmPriceChange() {
    const patch = buildPatch();
    if (patch === null) return;
    onSave(parcel.tracking, patch);
    onClose();
  }

  const inputClass =
    'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950';

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('parcels.edit.title')}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('parcels.edit.title')}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('parcels.field.tracking')} *
            </span>
            <input
              dir="ltr"
              value={form.tracking}
              onChange={(e) => set('tracking', e.target.value)}
              className={`${inputClass}${trackingError ? ' border-red-400' : ''}`}
            />
            {trackingError && (
              <span role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
                {t('parcels.edit.tracking_taken')}
              </span>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('parcels.field.receiver')}
            </span>
            <input value={form.receiver} onChange={(e) => set('receiver', e.target.value)} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('parcels.field.phone')}
              </span>
              <input
                dir="ltr"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={`${inputClass}${phoneError ? ' border-red-400' : ''}`}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('parcels.field.phone2')}
              </span>
              <input
                dir="ltr"
                inputMode="tel"
                value={form.phone2}
                onChange={(e) => set('phone2', e.target.value)}
                className={`${inputClass}${phoneError ? ' border-red-400' : ''}`}
              />
            </label>
          </div>
          {phoneError && (
            <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
              {t('parcels.field.phone_invalid')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('parcels.field.municipality')}
              </span>
              <input
                list="swipex-municipalities"
                value={form.municipality}
                onChange={(e) => set('municipality', e.target.value)}
                className={inputClass}
              />
              <datalist id="swipex-municipalities">
                {municipalities.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('parcels.field.amount')}
              </span>
              <input
                dir="ltr"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('parcels.field.address')}
            </span>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('parcels.field.content')}
            </span>
            <input value={form.content} onChange={(e) => set('content', e.target.value)} className={inputClass} />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('parcels.field.notes')}
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="min-h-11 flex-1 rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              {t('parcels.edit.submit')}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmPrice}
        title={t('parcels.edit.price_confirm_title')}
        description={t('parcels.edit.price_confirm_body')}
        onConfirm={confirmPriceChange}
        onCancel={() => setConfirmPrice(false)}
      />
    </>
  );
}
