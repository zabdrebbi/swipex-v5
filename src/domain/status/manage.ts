import type { Settings, StatusActionEnabled } from '../settings/types';
import type { CustomStatus, CustomStatusId, StatusGroup, StatusRef } from './types';
import { BUILT_IN_STATUSES, customStatusRef } from './statuses';

/** The nine palette colours offered for a custom status (v4 statusColors). */
export const STATUS_COLORS: readonly string[] = [
  '#9ca3af',
  '#f97316',
  '#eab308',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

/** The nine palette colours offered for a status group (last one is neutral). */
export const GROUP_COLORS: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#6b7280',
];

/** Lucide icon names offered for a custom status (mapped in the UI layer). */
export const STATUS_ICONS: readonly string[] = [
  'Tag',
  'Flag',
  'Star',
  'Ban',
  'RotateCcw',
  'MapPin',
  'UserX',
  'Hand',
  'ArrowLeftRight',
  'PauseCircle',
];

/** Lucide icon names offered for a status group. */
export const GROUP_ICONS: readonly string[] = [
  'Layers',
  'AlertTriangle',
  'XCircle',
  'Clock',
  'Star',
  'Flag',
  'Ban',
  'PauseCircle',
  'FolderOpen',
  'Bell',
];

/** `cs_` + time + randomness: unique enough for a document id, valid for convertSettings. */
export function newCustomStatusId(): CustomStatusId {
  return `cs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function newStatusGroupId(): string {
  return `sg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Every status the account can show: the eight built-ins, then the customs. */
export function allStatusRefs(customStatuses: readonly CustomStatus[]): StatusRef[] {
  const builtIns: StatusRef[] = BUILT_IN_STATUSES.map((status) => status.key);
  const customs: StatusRef[] = customStatuses.map((status) => customStatusRef(status.id));
  return [...builtIns, ...customs];
}

/**
 * Display order: the user's `statusOrder` first (unknown/duplicate entries are
 * dropped), then everything it left out in its default order. A missing or
 * empty `statusOrder` therefore behaves exactly like the default order.
 */
export function orderedStatusRefs(
  customStatuses: readonly CustomStatus[],
  statusOrder: readonly StatusRef[],
): StatusRef[] {
  const known = new Set(allStatusRefs(customStatuses));
  const ordered: StatusRef[] = [];
  for (const ref of statusOrder) {
    if (known.has(ref) && !ordered.includes(ref)) ordered.push(ref);
  }
  for (const ref of known) {
    if (!ordered.includes(ref)) ordered.push(ref);
  }
  return ordered;
}

export interface StatusLayoutGroup {
  group: StatusGroup;
  /** Group members that still exist, in the group's own order. */
  refs: StatusRef[];
}

export interface StatusLayout {
  /** Every group (an empty `refs` means the group only holds stale refs). */
  groups: StatusLayoutGroup[];
  /** Statuses not assigned to any group, in display order. */
  loose: StatusRef[];
}

/**
 * Splits the display order into groups + leftovers. A status belongs to at
 * most one group (first group wins, mirroring the normalisation on load).
 */
export function layoutStatuses(
  customStatuses: readonly CustomStatus[],
  statusOrder: readonly StatusRef[],
  statusGroups: readonly StatusGroup[],
): StatusLayout {
  const ordered = orderedStatusRefs(customStatuses, statusOrder);
  const known = new Set(ordered);
  const assigned = new Set<StatusRef>();

  const groups: StatusLayoutGroup[] = statusGroups.map((group) => {
    const refs = group.statuses.filter((ref) => {
      if (!known.has(ref) || assigned.has(ref)) return false;
      assigned.add(ref);
      return true;
    });
    return { group, refs };
  });

  return { groups, loose: ordered.filter((ref) => !assigned.has(ref)) };
}

/** The settings fields a custom-status deletion touches (write only these). */
export interface CustomStatusRemovalPatch {
  customStatuses: CustomStatus[];
  statusOrder: StatusRef[];
  statusGroups: StatusGroup[];
  statusActionEnabled: StatusActionEnabled;
}

export interface CustomStatusRemovalPlan {
  /** Reference the parcels holding it must be reset from. */
  removedRef: StatusRef;
  patch: CustomStatusRemovalPatch;
}

/**
 * Computes the settings patch for deleting a custom status. Parcels are NOT
 * part of the patch: the caller resets them in one batch with `removedRef`.
 * Returns null when the status does not exist (nothing to do).
 */
export function planCustomStatusRemoval(
  state: Pick<Settings, 'customStatuses' | 'statusOrder' | 'statusGroups' | 'statusActionEnabled'>,
  id: CustomStatusId,
): CustomStatusRemovalPlan | null {
  if (!state.customStatuses.some((status) => status.id === id)) return null;
  const removedRef = customStatusRef(id);
  const statusActionEnabled: StatusActionEnabled = { ...state.statusActionEnabled };
  delete statusActionEnabled[removedRef];
  return {
    removedRef,
    patch: {
      customStatuses: state.customStatuses.filter((status) => status.id !== id),
      statusOrder: state.statusOrder.filter((ref) => ref !== removedRef),
      statusGroups: state.statusGroups.map((group) => ({
        ...group,
        statuses: group.statuses.filter((ref) => ref !== removedRef),
      })),
      statusActionEnabled,
    },
  };
}
