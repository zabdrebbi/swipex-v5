import { Phone, X } from 'lucide-react';
import { useI18n } from '@/i18n';

interface PhonePickDialogProps {
  /** Two numbers to choose from (a single number never opens the dialog). */
  phones: readonly string[];
  onPick: (phone: string) => void;
  onClose: () => void;
}

/**
 * Chooser shown when a receiver has two phone numbers — v4's phone picker,
 * shared by the card swipe (right) and the focus mode call button.
 */
export default function PhonePickDialog({ phones, onPick, onClose }: PhonePickDialogProps) {
  const { t } = useI18n();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('swipe.pick_phone')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">{t('swipe.pick_phone')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-10 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {phones.map((phone, index) => (
            <li key={phone}>
              <button
                type="button"
                onClick={() => onPick(phone)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-gray-200 px-3 text-start hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Phone className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span dir="ltr" className="font-mono text-sm font-bold">
                  {phone}
                </span>
                <span className="ms-auto text-xs font-medium text-gray-500 dark:text-gray-400">
                  {index === 0 ? t('parcels.field.phone') : t('parcels.field.phone2')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
