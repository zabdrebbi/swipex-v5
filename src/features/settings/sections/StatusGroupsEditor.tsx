import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSettings } from '../SettingsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import StatusIcon from '@/components/StatusIcon';
import { GROUP_COLORS, GROUP_ICONS, allStatusRefs, newStatusGroupId } from '@/domain/status/manage';
import type { StatusGroup, StatusRef } from '@/domain/status/types';
import { IconPicker, Segmented, Swatches, inputClass } from '../ui';

/**
 * Full status-group editor (v4): create/rename/recolour/re-icon a group, pick
 * its layout, and move statuses in and out with ↑/↓. A status belongs to at
 * most one group, so adding one here removes it from any other group.
 */
export default function StatusGroupsEditor() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { statusLabel, statusColor, statusIcon } = useStatusDisplay();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = settings.statusGroups;
  const assigned = new Set<StatusRef>(groups.flatMap((group) => group.statuses));
  const available = allStatusRefs(settings.customStatuses).filter((ref) => !assigned.has(ref));

  function patchGroups(next: StatusGroup[]) {
    updateSettings({ statusGroups: next });
  }

  function updateGroup(id: string, patch: Partial<StatusGroup>) {
    patchGroups(groups.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  }

  function addGroup() {
    const id = newStatusGroupId();
    patchGroups([
      ...groups,
      { id, name: t('settings.status_group_default_name'), color: '#6b7280', icon: 'Layers', layout: 'column', statuses: [] },
    ]);
    setExpandedId(id);
  }

  function moveStatus(group: StatusGroup, index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= group.statuses.length) return;
    const statuses = [...group.statuses];
    const current = statuses[index];
    const swapped = statuses[target];
    if (current === undefined || swapped === undefined) return;
    statuses[index] = swapped;
    statuses[target] = current;
    updateGroup(group.id, { statuses });
  }

  function addStatusToGroup(group: StatusGroup, raw: string) {
    if (raw === '') return;
    const ref = raw as StatusRef;
    patchGroups(
      groups.map((other) => {
        if (other.id === group.id) {
          return other.statuses.includes(ref)
            ? other
            : { ...other, statuses: [...other.statuses, ref] };
        }
        // One status = one group (v4 rule).
        return other.statuses.includes(ref)
          ? { ...other, statuses: other.statuses.filter((item) => item !== ref) }
          : other;
      }),
    );
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('settings.status_group')}
        </h3>
        <button
          type="button"
          onClick={addGroup}
          className="flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t('settings.status_add_group')}
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t('settings.status_group_empty')}</p>
      )}

      {groups.map((group) => {
        const expanded = expandedId === group.id;
        return (
          <div key={group.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : group.id)}
                aria-expanded={expanded}
                aria-label={group.name}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {expanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
              </button>
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: group.color }}
              >
                <StatusIcon name={group.icon} className="size-3.5" />
              </span>
              <input
                value={group.name}
                aria-label={t('settings.status_group_name')}
                placeholder={t('settings.status_group_name')}
                onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                className="min-h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-bold outline-none focus:border-gray-300 focus:bg-white dark:text-white dark:focus:border-gray-700 dark:focus:bg-gray-800"
              />
              {!expanded && (
                <span className="text-[10px] font-bold text-gray-400" dir="ltr">
                  {group.statuses.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => patchGroups(groups.filter((item) => item.id !== group.id))}
                aria-label={t('settings.group_delete')}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            {expanded && (
              <div className="mt-3 space-y-3">
                <Swatches
                  value={group.color}
                  colors={GROUP_COLORS}
                  ariaLabel={t('settings.group_color')}
                  onChange={(color) => updateGroup(group.id, { color })}
                />
                <IconPicker
                  value={group.icon}
                  names={GROUP_ICONS}
                  ariaLabel={t('settings.group_icon')}
                  onChange={(icon) => updateGroup(group.id, { icon })}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.group_layout')}</span>
                  <Segmented
                    ariaLabel={t('settings.group_layout')}
                    value={group.layout}
                    onChange={(layout) => updateGroup(group.id, { layout })}
                    options={[
                      { value: 'row', label: t('settings.group_layout_row') },
                      { value: 'column', label: t('settings.group_layout_column') },
                    ]}
                  />
                </div>

                {group.statuses.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.group_status_empty')}</p>
                ) : (
                  <ul className="space-y-1">
                    {group.statuses.map((ref, index) => (
                      <li key={ref} className="flex items-center gap-2">
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-bold dark:bg-gray-800">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: statusColor(ref) }}
                            aria-hidden="true"
                          />
                          <StatusIcon name={statusIcon(ref)} className="size-3.5 shrink-0" />
                          <span className="truncate">{statusLabel(ref)}</span>
                        </span>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveStatus(group, index, -1)}
                          aria-label={t('status_order.move_up')}
                          className="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={index === group.statuses.length - 1}
                          onClick={() => moveStatus(group, index, 1)}
                          aria-label={t('status_order.move_down')}
                          className="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateGroup(group.id, { statuses: group.statuses.filter((item) => item !== ref) })}
                          aria-label={t('settings.group_remove_status')}
                          className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <select
                  value=""
                  aria-label={t('settings.group_add_status')}
                  disabled={available.length === 0}
                  onChange={(event) => addStatusToGroup(group, event.target.value as StatusRef)}
                  className={`${inputClass} min-h-10`}
                >
                  <option value="">{t('settings.group_add_status')}</option>
                  {available.map((ref) => (
                    <option key={ref} value={ref}>
                      {statusLabel(ref)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
