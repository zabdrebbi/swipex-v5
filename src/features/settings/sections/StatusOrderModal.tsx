import { useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSettings } from '../SettingsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import StatusIcon from '@/components/StatusIcon';
import { orderedStatusRefs } from '@/domain/status/manage';
import type { StatusRef } from '@/domain/status/types';

interface StatusOrderModalProps {
  onClose: () => void;
}

/**
 * Reorders every status (built-in + custom) with explicit ↑/↓ buttons, as the
 * plan specifies instead of v4's drag list. Saving stores the full order;
 * "reset" clears it back to the default relative order.
 */
export default function StatusOrderModal({ onClose }: StatusOrderModalProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { statusLabel, statusColor, statusIcon } = useStatusDisplay();
  const [order, setOrder] = useState<StatusRef[]>(() =>
    orderedStatusRefs(settings.customStatuses, settings.statusOrder),
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const current = next[index];
    const swapped = next[target];
    if (current === undefined || swapped === undefined) return;
    next[index] = swapped;
    next[target] = current;
    setOrder(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('status_order.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('status_order.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {order.map((ref, index) => {
            const isCustom = ref.startsWith('custom:');
            return (
              <div
                key={ref}
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`${t('status_order.move_up')} ${statusLabel(ref)}`}
                    className="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`${t('status_order.move_down')} ${statusLabel(ref)}`}
                    className="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: statusColor(ref) }}
                >
                  <StatusIcon name={statusIcon(ref)} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{statusLabel(ref)}</span>
                {isCustom && (
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                    {t('settings.status_custom_badge')}
                  </span>
                )}
                <span className="font-mono text-xs text-gray-400" dir="ltr">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              updateSettings({ statusOrder: order });
              onClose();
            }}
            className="min-h-11 flex-1 rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
          >
            {t('status_order.save')}
          </button>
          <button
            type="button"
            onClick={() => {
              updateSettings({ statusOrder: [] });
              onClose();
            }}
            title={t('status_order.reset_title')}
            aria-label={t('status_order.reset_title')}
            className="flex min-h-11 w-12 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
