import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import type { TagDef } from '@/domain/settings/types';

interface TagPickerModalProps {
  parcel: Parcel;
  /** Active tag definitions (settings) — already limited to enabled tags. */
  tags: readonly TagDef[];
  /** `null` clears the parcel's tag. */
  onPick: (tag: string | null) => void;
  onClose: () => void;
}

/**
 * The card's "@" dialog: pick one of the account tags. Municipality-scoped
 * tags only appear when they match the parcel's municipality (v4 rule);
 * creating tags stays in the settings screen.
 */
export default function TagPickerModal({ parcel, tags, onPick, onClose }: TagPickerModalProps) {
  const { t } = useI18n();

  const visible = tags.filter(
    (tag) => tag.scope === 'global' || (tag.municipality ?? '') === parcel.municipality,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('tagpicker.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('tagpicker.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-2 truncate text-sm text-gray-500 dark:text-gray-400">
          {parcel.receiver} · <span className="font-mono" dir="ltr">{parcel.tracking}</span>
        </p>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('tagpicker.empty')}
            </p>
          ) : (
            visible.map((tag) => {
              const active = parcel.tag === tag.name;
              return (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => {
                    onPick(tag.name);
                    onClose();
                  }}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${
                    active
                      ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                      : 'border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-start" dir="ltr">
                    @{tag.name}
                  </span>
                  {tag.scope === 'municipality' && (
                    <span className="shrink-0 text-[10px] opacity-70">{tag.municipality}</span>
                  )}
                </button>
              );
            })
          )}

          {parcel.tag !== undefined && parcel.tag !== '' && (
            <button
              type="button"
              onClick={() => {
                onPick(null);
                onClose();
              }}
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {t('tagpicker.clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
