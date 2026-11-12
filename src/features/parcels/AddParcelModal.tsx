import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import { normalizePhone } from '@/domain/parcel/phone';

interface AddParcelModalProps {
  /** Municipalities already used by other parcels (for the datalist). */
  municipalities: string[];
  onAdd: (parcel: Parcel) => void;
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
  sender: string;
  senderPhone: string;
}

const EMPTY_FORM: FormState = {
  tracking: '',
  receiver: '',
  phone: '',
  phone2: '',
  address: '',
  municipality: '',
  amount: '',
  content: '',
  sender: '',
  senderPhone: '',
};

function fieldClass(error: boolean): string {
  return `min-h-11 w-full rounded-xl border px-3 text-sm ${
    error
      ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
      : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950'
  }`;
}

/** Manual "add parcel" form (scanning arrives with the PDF import step). */
export default function AddParcelModal({ municipalities, onAdd, onClose }: AddParcelModalProps) {
  const { t, formatNumber } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ tracking?: true; phone?: true; phone2?: true }>({});
  const [phoneWarning, setPhoneWarning] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const tracking = form.tracking.trim();
    const nextErrors: typeof errors = {};
    if (tracking === '') nextErrors.tracking = true;

    // Empty optional phones are fine; malformed ones block with a warning.
    const phone = normalizePhone(form.phone);
    const phone2 = normalizePhone(form.phone2);
    if (form.phone.trim() !== '' && phone === '') nextErrors.phone = true;
    if (form.phone2.trim() !== '' && phone2 === '') nextErrors.phone2 = true;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setPhoneWarning(nextErrors.phone === true || nextErrors.phone2 === true);
      return;
    }

    const now = new Date().toISOString();
    const parcel: Parcel = {
      tracking,
      receiver: form.receiver.trim(),
      phone,
      address: form.address.trim(),
      municipality: form.municipality.trim(),
      amount: Number(form.amount) || 0,
      content: form.content.trim(),
      type: '',
      status: 'no_action',
      statusUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      sortOrder: 0,
      smsSent: false,
      senderSmsSent: false,
      isMultiPiece: false,
      piecesCount: 1,
      subTrackings: [],
      openingAllowed: null,
    };
    if (phone2 !== '') parcel.phone2 = phone2;
    if (form.sender.trim() !== '') parcel.sender = form.sender.trim();
    if (normalizePhone(form.senderPhone) !== '') parcel.senderPhone = normalizePhone(form.senderPhone);

    onAdd(parcel);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('parcels.add.title')}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('parcels.add.title')}</h2>
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
            autoFocus
            value={form.tracking}
            onChange={(e) => set('tracking', e.target.value)}
            className={fieldClass(errors.tracking === true)}
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('parcels.field.receiver')}
          </span>
          <input
            value={form.receiver}
            onChange={(e) => set('receiver', e.target.value)}
            className={fieldClass(false)}
          />
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
              className={fieldClass(errors.phone === true)}
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
              className={fieldClass(errors.phone2 === true)}
            />
          </label>
        </div>
        {phoneWarning && (
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
              className={fieldClass(false)}
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
              className={fieldClass(false)}
              placeholder={formatNumber(0)}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('parcels.field.address')}
          </span>
          <input
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            className={fieldClass(false)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('parcels.field.content')}
          </span>
          <input
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            className={fieldClass(false)}
          />
        </label>

        <fieldset className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <legend className="px-1 text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('parcels.add.sender_section')}
          </legend>
          <input
            value={form.sender}
            onChange={(e) => set('sender', e.target.value)}
            placeholder={t('parcels.field.sender')}
            className={fieldClass(false)}
          />
          <input
            dir="ltr"
            inputMode="tel"
            value={form.senderPhone}
            onChange={(e) => set('senderPhone', e.target.value)}
            placeholder={t('parcels.field.sender_phone')}
            className={fieldClass(false)}
          />
        </fieldset>

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
            {t('parcels.add.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
