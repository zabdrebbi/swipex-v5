import { useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { usePdfImport } from './usePdfImport';
import { useExcelImport } from './useExcelImport';
import { EXCEL_ACCEPT } from '@/lib/excel/sheetIo';
import type { ImportSummary } from './ingest';

interface ImportModalProps {
  onClose: () => void;
}

/** Which pipeline runs: label PDFs or a spreadsheet (v4 had two dialogs). */
type Source = 'pdf' | 'excel';

/** Maps the pipeline phase to its i18n key (single place to keep in sync). */
function phaseKey(phase: string): TranslationKey {
  switch (phase) {
    case 'reading':
      return 'import.phase_reading';
    case 'parsing':
      return 'import.phase_parsing';
    case 'merging':
      return 'import.phase_merging';
    default:
      return 'import.phase_idle';
  }
}

/** Maps the raw pipeline error to its i18n key. */
function errorKey(message: string | null): TranslationKey {
  switch (message) {
    case 'not_pdf':
      return 'import.error_not_pdf';
    case 'not_excel':
      return 'import.error_not_excel';
    case 'empty_workbook':
    case 'empty_sheet':
      return 'import.error_empty';
    default:
      return 'import.error_read';
  }
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <span className="text-sm font-bold" dir="ltr">
        {value}
      </span>
    </div>
  );
}

/**
 * Unified import dialog: PDF labels and Excel sheets share one shell (phases,
 * summary and errors), each source owning its own pipeline hook.
 */
export default function ImportModal({ onClose }: ImportModalProps) {
  const { t } = useI18n();
  const pdf = usePdfImport();
  const excel = useExcelImport();
  const [source, setSource] = useState<Source>('pdf');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const active = source === 'pdf' ? pdf : excel;
  const { phase, page, pageCount, summary, errorMessage } = active;
  const busy = phase === 'reading' || phase === 'parsing' || phase === 'merging';

  function pick(next: Source) {
    setSource(next);
    (next === 'pdf' ? pdfInputRef : excelInputRef).current?.click();
  }

  function handlePick(next: Source) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Allow re-picking the same file after an error.
      event.target.value = '';
      if (file === undefined) return;
      setSource(next);
      if (next === 'pdf') void pdf.importFile(file);
      else void excel.importFile(file);
    };
  }

  function summaryRows(s: ImportSummary) {
    return (
      <>
        <SummaryRow label={t('import.summary_added')} value={s.added} />
        <SummaryRow label={t('import.summary_duplicates')} value={s.duplicates} />
        <SummaryRow label={t('import.summary_groups')} value={s.groups} />
        <SummaryRow label={t('import.summary_restored')} value={s.restored} />
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('import.title')}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('import.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {phase === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('import.hint')}</p>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handlePick('pdf')}
            />
            <input
              ref={excelInputRef}
              type="file"
              accept={EXCEL_ACCEPT}
              className="hidden"
              onChange={handlePick('excel')}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pick('pdf')}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                <FileText className="size-5" aria-hidden="true" />
                {t('import.pick')}
              </button>
              <button
                type="button"
                onClick={() => pick('excel')}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <FileSpreadsheet className="size-5" aria-hidden="true" />
                {t('import.pick_excel')}
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="space-y-3 py-4 text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto size-8 animate-spin text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <p className="text-sm font-bold">{t(phaseKey(phase))}</p>
            {phase === 'reading' && pageCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                {page} / {pageCount}
              </p>
            )}
          </div>
        )}

        {phase === 'done' && summary !== null && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              {t('import.done', { count: summary.total })}
            </p>
            <div className="space-y-2">{summaryRows(summary)}</div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 w-full rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              {t('common.close')}
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-3">
            <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400">
              {t(errorKey(errorMessage))}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={active.reset}
                className="min-h-11 flex-1 rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                {t('import.retry')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
