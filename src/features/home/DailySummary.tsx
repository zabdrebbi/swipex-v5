import { useState } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { DailySummary as SummaryData } from '@/domain/list/dailySummary';
import type { StatusRef } from '@/domain/status/types';

interface DailySummaryProps {
  summary: SummaryData;
  statusLabel: (ref: StatusRef) => string;
  statusColor: (ref: StatusRef) => string;
  /** Parcels matching the current filters (details line). */
  visibleCount: number;
  visibleAmount: number;
  focusEnabled: boolean;
  onFocus: () => void;
}

/**
 * Day dashboard: delivered/total, remaining, percentage, the segmented status
 * bar (ordered by `statusOrder`), expandable details (visible now + amount)
 * and the focus-mode entry point.
 */
export default function DailySummary({
  summary,
  statusLabel,
  statusColor,
  visibleCount,
  visibleAmount,
  focusEnabled,
  onFocus,
}: DailySummaryProps) {
  const { t, formatCurrency } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const { total, delivered, remaining, percentage, segments } = summary;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none" dir="ltr">
            {delivered}/{total}
          </span>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('summary.delivered')}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold dark:bg-gray-800">
            {percentage}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="me-1 text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('summary.remaining')} <b className="text-gray-800 dark:text-gray-100">{remaining}</b>
          </span>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? t('summary.collapse') : t('summary.expand')}
            className="flex size-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onFocus}
            disabled={!focusEnabled}
            aria-label={t('summary.focus')}
            title={t('summary.focus')}
            className="flex size-10 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true">
          {segments.map((segment) => (
            <div
              key={segment.status}
              title={`${statusLabel(segment.status)}: ${segment.count}`}
              style={{
                width: `${(segment.count / total) * 100}%`,
                backgroundColor: statusColor(segment.status),
              }}
            />
          ))}
        </div>
      )}

      {expanded && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-gray-500 dark:text-gray-400">{t('summary.visible')}</dt>
            <dd className="font-extrabold">{visibleCount}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-gray-500 dark:text-gray-400">{t('summary.amount')}</dt>
            <dd className="font-extrabold">{formatCurrency(visibleAmount)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
