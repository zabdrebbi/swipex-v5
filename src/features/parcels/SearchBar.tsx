import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/i18n';

interface SearchBarProps {
  value: string;
  /** Field visibility (v4's `showFilters` for the search row). */
  open: boolean;
  onToggleOpen: () => void;
  onChange: (value: string) => void;
}

/**
 * Live search field with v4's toggle rule: while the field is CLOSED a
 * non-empty query means "clear it" (the query keeps applying until cleared);
 * otherwise the button opens/closes the field. Closing keeps the query active.
 */
export default function SearchBar({ value, open, onToggleOpen, onChange }: SearchBarProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleToggle() {
    if (!open && value !== '') {
      onChange('');
      return;
    }
    onToggleOpen();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={t('search.toggle')}
        aria-expanded={open}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <Search className="size-4" aria-hidden="true" />
        {value !== '' && !open && (
          <span aria-hidden="true" className="absolute end-1.5 top-1.5 size-2 rounded-full bg-blue-500" />
        )}
      </button>
      {open && (
        <>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          {value !== '' && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                onToggleOpen();
              }}
              aria-label={t('search.clear')}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
