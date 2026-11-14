import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Star, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TAG_NONE, hasActiveFilters, type ListFilters } from '@/domain/list/query';
import type { StatusRef } from '@/domain/status/types';
import type { ListFiltersApi } from './useListFilters';

interface FilterBarProps {
  filters: ListFilters;
  api: ListFiltersApi;
  /** Search field visibility: hides the redundant active-query chip. */
  searchOpen: boolean;
  /** Per-status counts in the current filter context (status dimension removed). */
  counts: ReadonlyMap<StatusRef, number>;
  municipalities: readonly string[];
  tags: readonly string[];
  statusOrder: readonly StatusRef[];
  tagsEnabled: boolean;
  favoriteEnabled: boolean;
  statusLabel: (ref: StatusRef) => string;
  statusColor: (ref: StatusRef) => string;
}

type MenuId = 'municipality' | 'tag';

const chipClass = (active: boolean): string =>
  `flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors ${
    active
      ? 'border-blue-600 bg-blue-600 text-white'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
  }`;

const rowClass = (active: boolean): string =>
  `flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-start text-sm font-bold ${
    active
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
  }`;

/**
 * Sticky chip row: clear-all, active-query, municipality, tag, favourite and
 * the status chips with their counts. Dropdowns close on an outside press.
 */
export default function FilterBar({
  filters,
  api,
  searchOpen,
  counts,
  municipalities,
  tags,
  statusOrder,
  tagsEnabled,
  favoriteEnabled,
  statusLabel,
  statusColor,
}: FilterBarProps) {
  const { t } = useI18n();
  const [menu, setMenu] = useState<MenuId | null>(null);
  const municipalityWrapRef = useRef<HTMLDivElement | null>(null);
  const tagWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (menu === null) return;
    const wrap = menu === 'municipality' ? municipalityWrapRef.current : tagWrapRef.current;
    const onPointerDown = (event: PointerEvent) => {
      if (wrap && wrap.contains(event.target as Node)) return; // the chip itself toggles
      setMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menu]);

  // Status chips: every referenced status (counted or selected), ordered by
  // the user's statusOrder with unknown refs appended stably.
  const statusChips = useMemo(() => {
    const refs = new Set<StatusRef>([...counts.keys(), ...filters.statuses]);
    const orderIndex = new Map<StatusRef, number>(statusOrder.map((ref, index) => [ref, index]));
    return [...refs].sort(
      (a, b) =>
        (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [counts, filters.statuses, statusOrder]);

  const showTagChip = tagsEnabled && (tags.length > 0 || filters.tag !== '');

  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 bg-white/95 px-4 pb-2 pt-3 backdrop-blur dark:bg-gray-950/95 lg:-mx-8 lg:px-8">
      {!searchOpen && filters.search !== '' && (
        <button type="button" onClick={() => api.setSearch('')} className={chipClass(true)}>
          <Search className="size-3.5" aria-hidden="true" />
          <span className="max-w-40 truncate">{filters.search}</span>
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {hasActiveFilters(filters) && (
        <button type="button" onClick={api.clearAll} className={chipClass(false)}>
          <X className="size-3.5" aria-hidden="true" />
          {t('filter.clear_all')}
        </button>
      )}

      <div className="relative" ref={municipalityWrapRef}>
        <button
          type="button"
          onClick={() => setMenu(menu === 'municipality' ? null : 'municipality')}
          aria-expanded={menu === 'municipality'}
          className={chipClass(filters.municipality !== '')}
        >
          <span className="max-w-36 truncate">
            {filters.municipality !== '' ? filters.municipality : t('filter.municipality')}
          </span>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        {menu === 'municipality' && (
          <div className="absolute end-0 top-full z-30 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => {
                api.setMunicipality('');
                setMenu(null);
              }}
              className={rowClass(filters.municipality === '')}
            >
              {t('filter.all')}
              {filters.municipality === '' && <Check className="size-4" aria-hidden="true" />}
            </button>
            {municipalities.map((municipality) => (
              <button
                key={municipality}
                type="button"
                onClick={() => {
                  api.setMunicipality(municipality);
                  setMenu(null);
                }}
                className={rowClass(filters.municipality === municipality)}
              >
                <span className="truncate">{municipality}</span>
                {filters.municipality === municipality && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {showTagChip && (
        <div className="relative" ref={tagWrapRef}>
          <button
            type="button"
            onClick={() => setMenu(menu === 'tag' ? null : 'tag')}
            aria-expanded={menu === 'tag'}
            className={chipClass(filters.tag !== '')}
          >
            <span className="max-w-36 truncate">
              {filters.tag === ''
                ? t('filter.tag')
                : filters.tag === TAG_NONE
                  ? t('filter.no_tag')
                  : `@${filters.tag}`}
            </span>
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
          {menu === 'tag' && (
            <div className="absolute end-0 top-full z-30 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => {
                  api.setTag('');
                  setMenu(null);
                }}
                className={rowClass(filters.tag === '')}
              >
                {t('filter.all')}
                {filters.tag === '' && <Check className="size-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  api.setTag(TAG_NONE);
                  setMenu(null);
                }}
                className={rowClass(filters.tag === TAG_NONE)}
              >
                {t('filter.no_tag')}
                {filters.tag === TAG_NONE && <Check className="size-4" aria-hidden="true" />}
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    api.setTag(tag);
                    setMenu(null);
                  }}
                  className={rowClass(filters.tag === tag)}
                >
                  <span className="truncate">@{tag}</span>
                  {filters.tag === tag && <Check className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {favoriteEnabled && (
        <button
          type="button"
          onClick={api.toggleFavorite}
          aria-pressed={filters.favorite}
          className={chipClass(filters.favorite)}
        >
          <Star className="size-3.5" aria-hidden="true" fill={filters.favorite ? 'currentColor' : 'none'} />
          {t('filter.favorite')}
        </button>
      )}

      {statusChips.map((status) => {
        const { selected, ...handlers } = api.statusChipProps(status);
        const color = statusColor(status);
        return (
          <button
            key={status}
            type="button"
            {...handlers}
            aria-pressed={selected}
            // Long-press (multi-select) must not open the browser context menu.
            onContextMenu={(event) => event.preventDefault()}
            className={chipClass(selected)}
            style={selected ? { backgroundColor: color, borderColor: color } : undefined}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected ? '#ffffff' : color }}
              aria-hidden="true"
            />
            <span className="truncate">{statusLabel(status)}</span>
            <span className="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/10">
              {counts.get(status) ?? 0}
            </span>
          </button>
        );
      })}

      {statusChips.length > 0 && (
        <button
          type="button"
          onClick={api.toggleMultiStatus}
          aria-pressed={api.multi}
          className={chipClass(api.multi)}
        >
          {t('filter.multi')}
        </button>
      )}
    </div>
  );
}
