import { useMemo, useState } from 'react';
import { Link2, Search, Unlink } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useParcels } from '@/features/parcels/ParcelsProvider';

interface TaskParcelLinkProps {
  /** Currently linked tracking (undefined = nothing linked yet). */
  tracking: string | undefined;
  onLink: (tracking: string) => void;
  onUnlink: () => void;
}

/** A manual link needs at least this many characters (v4). */
const MIN_MANUAL_TRACKING = 3;
const PICKER_LIMIT = 6;

const fieldClass =
  'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950';

/**
 * Parcel-linking field of the task composer: shows the linked tracking with
 * an unlink button, or (when nothing is linked) the internal picker — search
 * the current list, plus a manual tracking number of >= 3 characters.
 */
export default function TaskParcelLink({ tracking, onLink, onUnlink }: TaskParcelLinkProps) {
  const { t } = useI18n();
  const { parcels } = useParcels();
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return [];
    return parcels
      .filter(
        (parcel) =>
          parcel.tracking.toLowerCase().includes(needle) ||
          parcel.receiver.toLowerCase().includes(needle),
      )
      .slice(0, PICKER_LIMIT);
  }, [parcels, query]);

  function linkManual() {
    const value = manual.trim();
    if (value.length < MIN_MANUAL_TRACKING) return;
    onLink(value);
    setManual('');
  }

  if (tracking !== undefined && tracking !== '') {
    return (
      <div className="flex items-center gap-2">
        <span
          dir="ltr"
          className="flex min-h-9 flex-1 items-center gap-1.5 rounded-lg bg-gray-100 px-3 font-mono text-sm font-bold dark:bg-gray-800"
        >
          {tracking}
        </span>
        <button
          type="button"
          onClick={onUnlink}
          className="flex min-h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-bold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Unlink className="size-3.5" aria-hidden="true" />
          {t('task_composer.parcel_unlink')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('task_composer.parcel_search')}
          aria-label={t('task_composer.parcel_search')}
          className={`${fieldClass} ps-9`}
        />
      </div>
      {query.trim() !== '' && matches.length === 0 && (
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
          {t('task_composer.parcel_not_found')}
        </p>
      )}
      {matches.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {matches.map((parcel) => (
            <li key={parcel.tracking}>
              <button
                type="button"
                onClick={() => {
                  onLink(parcel.tracking);
                  setQuery('');
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span dir="ltr" className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
                  {parcel.tracking}
                </span>
                <span className="truncate text-sm font-bold">{parcel.receiver}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          dir="ltr"
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              linkManual();
            }
          }}
          placeholder={t('task_composer.parcel_manual')}
          aria-label={t('task_composer.parcel_manual')}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={linkManual}
          disabled={manual.trim().length < MIN_MANUAL_TRACKING}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <Link2 className="size-4" aria-hidden="true" />
          {t('task_composer.parcel_link')}
        </button>
      </div>
    </>
  );
}
