import type { ReactNode } from 'react';
import { useI18n, type TranslationKey } from '@/i18n';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Extra line (e.g. "3 parcels will be deleted"). */
  description?: ReactNode;
  confirmLabelKey?: TranslationKey;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shared confirmation modal (delete, clear, destructive actions). */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabelKey = 'common.confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        {description !== undefined && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900'
            }`}
          >
            {t(confirmLabelKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
