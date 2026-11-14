import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_FILTERS, type ListFilters } from '@/domain/list/query';
import type { StatusRef } from '@/domain/status/types';
import { USER_KEY_PREFIX } from '@/lib/storage';

const STORAGE_KEY = `${USER_KEY_PREFIX}filters`;
const LONG_PRESS_MS = 500;

interface StoredListState {
  filters: ListFilters;
  /** Long-press mode: chip clicks toggle membership instead of replacing it. */
  multi: boolean;
}

const DEFAULT_STATE: StoredListState = { filters: EMPTY_FILTERS, multi: false };

export interface StatusChipHandlers {
  selected: boolean;
  onClick: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}

/** The API half of the hook (the current filters are passed separately). */
export interface ListFiltersApi {
  multi: boolean;
  setSearch: (value: string) => void;
  setMunicipality: (value: string) => void;
  setTag: (value: string) => void;
  toggleFavorite: () => void;
  clearAll: () => void;
  toggleMultiStatus: () => void;
  /** Event handlers for one status chip (click = single, 500ms press = multi). */
  statusChipProps: (status: StatusRef) => StatusChipHandlers;
}

function isFilters(value: unknown): value is ListFilters {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ListFilters>;
  return (
    typeof candidate.search === 'string' &&
    typeof candidate.municipality === 'string' &&
    typeof candidate.tag === 'string' &&
    typeof candidate.favorite === 'boolean' &&
    Array.isArray(candidate.statuses) &&
    candidate.statuses.every((status) => typeof status === 'string')
  );
}

function loadState(): StoredListState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STATE;
    const candidate = parsed as { filters?: unknown; multi?: unknown };
    if (!isFilters(candidate.filters)) return DEFAULT_STATE;
    return { filters: candidate.filters, multi: candidate.multi === true };
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Search + filter state for the main list, persisted per user under
 * `swipex:u:filters` (wiped on sign-out with every other user-scoped key).
 *
 * Status chips: a plain click selects a single status (or clears the selected
 * one), a 500ms press turns multi-select ON and adds the status — v4's
 * quick-status long press.
 */
export function useListFilters(): { filters: ListFilters } & ListFiltersApi {
  const [state, setState] = useState<StoredListState>(loadState);
  const { filters, multi } = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: filters simply do not survive a reload */
    }
  }, [state]);

  const patch = useCallback((partial: Partial<ListFilters>) => {
    setState((current) => ({ ...current, filters: { ...current.filters, ...partial } }));
  }, []);

  const setSearch = useCallback((search: string) => patch({ search }), [patch]);
  const setMunicipality = useCallback((municipality: string) => patch({ municipality }), [patch]);
  const setTag = useCallback((tag: string) => patch({ tag }), [patch]);
  const toggleFavorite = useCallback(
    () => setState((current) => ({ ...current, filters: { ...current.filters, favorite: !current.filters.favorite } })),
    [],
  );
  const clearAll = useCallback(
    () => setState((current) => ({ ...current, filters: { ...EMPTY_FILTERS, statuses: [] } })),
    [],
  );
  const toggleMultiStatus = useCallback(() => setState((current) => ({ ...current, multi: !current.multi })), []);

  const pressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const clearPress = useCallback(() => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Leaving the page mid-press must not fire a stray long-press action.
  useEffect(() => clearPress, [clearPress]);

  const statusChipProps = useCallback(
    (status: StatusRef): StatusChipHandlers => {
      const selected = filters.statuses.includes(status);
      return {
        selected,
        onPointerDown: () => {
          longPressedRef.current = false;
          clearPress();
          pressTimerRef.current = window.setTimeout(() => {
            pressTimerRef.current = null;
            longPressedRef.current = true;
            setState((current) => ({
              ...current,
              multi: true,
              filters: {
                ...current.filters,
                statuses: current.filters.statuses.includes(status)
                  ? current.filters.statuses
                  : [...current.filters.statuses, status],
              },
            }));
          }, LONG_PRESS_MS);
        },
        onPointerUp: clearPress,
        onPointerCancel: clearPress,
        onPointerLeave: clearPress,
        onClick: () => {
          if (longPressedRef.current) {
            longPressedRef.current = false; // the press already applied the change
            return;
          }
          setState((current) => {
            const has = current.filters.statuses.includes(status);
            if (current.multi) {
              return {
                ...current,
                filters: {
                  ...current.filters,
                  statuses: has
                    ? current.filters.statuses.filter((ref) => ref !== status)
                    : [...current.filters.statuses, status],
                },
              };
            }
            const statuses = has && current.filters.statuses.length === 1 ? [] : [status];
            return { ...current, filters: { ...current.filters, statuses } };
          });
        },
      };
    },
    [filters.statuses, clearPress],
  );

  return {
    filters,
    multi,
    setSearch,
    setMunicipality,
    setTag,
    toggleFavorite,
    clearAll,
    toggleMultiStatus,
    statusChipProps,
  };
}
