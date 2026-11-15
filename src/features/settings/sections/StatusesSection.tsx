import { useState } from 'react';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useUser } from '@/features/auth/AuthProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useToast } from '@/components/Toast';
import { useSettings } from '../SettingsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusIcon from '@/components/StatusIcon';
import StatusOrderModal from './StatusOrderModal';
import StatusGroupsEditor from './StatusGroupsEditor';
import { IconPicker, Row, SubSection, Swatches, Switch, buttonClass, inputClass } from '../ui';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  newCustomStatusId,
  planCustomStatusRemoval,
} from '@/domain/status/manage';
import { customStatusRef } from '@/domain/status/statuses';
import { resetParcelsStatus } from '@/lib/firebase/parcelsRepo';
import { isLocalizedTextComplete, type LangCode } from '@/domain/localized';
import type { CustomStatus } from '@/domain/status/types';

const NAME_LANGS: { code: LangCode; labelKey: 'settings.name_ar' | 'settings.name_fr' | 'settings.name_en' }[] = [
  { code: 'ar', labelKey: 'settings.name_ar' },
  { code: 'fr', labelKey: 'settings.name_fr' },
  { code: 'en', labelKey: 'settings.name_en' },
];

const EMPTY_NAME = { ar: '', fr: '', en: '' };

/** Delivery countdown, custom statuses (3-language names) and their ordering. */
export default function StatusesSection() {
  const { t } = useI18n();
  const user = useUser();
  const { settings, updateSettings } = useSettings();
  const { parcels } = useParcels();
  const { statusLabel } = useStatusDisplay();
  const { showToast } = useToast();

  const [name, setName] = useState(EMPTY_NAME);
  const [color, setColor] = useState(STATUS_COLORS[0] ?? '#9ca3af');
  const [icon, setIcon] = useState(STATUS_ICONS[0] ?? 'Tag');
  const [pendingDelete, setPendingDelete] = useState<CustomStatus | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  const canAdd = isLocalizedTextComplete(name);

  function addStatus() {
    if (!canAdd) return;
    const trimmed: CustomStatus['name'] = {
      ar: name.ar.trim(),
      fr: name.fr.trim(),
      en: name.en.trim(),
    };
    if (!isLocalizedTextComplete(trimmed)) return;
    updateSettings({
      customStatuses: [...settings.customStatuses, { id: newCustomStatusId(), name: trimmed, color, icon }],
    });
    setName(EMPTY_NAME);
  }

  function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target === null) return;
    const plan = planCustomStatusRemoval(settings, target.id);
    if (plan === null) return;
    updateSettings(plan.patch);
    // Parcels holding the deleted status go back to "no action" in ONE batch.
    const affected = parcels
      .filter((parcel) => parcel.status === plan.removedRef)
      .map((parcel) => parcel.tracking);
    void resetParcelsStatus(user.uid, affected, 'no_action').catch(() => {
      showToast(t('settings.status_reset_failed'));
    });
  }

  return (
    <SubSection
      title={t('settings.section_statuses')}
      badge={t('settings.custom_statuses_count', { count: settings.customStatuses.length })}
    >
        <Row
          title={t('settings.delivery_confirm')}
          hint={t('settings.delivery_confirm_desc')}
        >
          <Switch
            checked={settings.deliveryConfirmEnabled}
            onChange={(deliveryConfirmEnabled) => updateSettings({ deliveryConfirmEnabled })}
            label={t('settings.delivery_confirm')}
          />
        </Row>
        <Row
          title={t('settings.delivery_confirm_seconds')}
          htmlFor="settings-delivery-seconds"
        >
          <input
            id="settings-delivery-seconds"
            type="number"
            min={1}
            max={30}
            inputMode="numeric"
            disabled={!settings.deliveryConfirmEnabled}
            value={settings.deliveryConfirmSeconds}
            onChange={(event) =>
              updateSettings({
                deliveryConfirmSeconds: Math.max(1, Math.min(30, Number(event.target.value) || 1)),
              })
            }
            className={`${inputClass} w-20 text-center`}
          />
        </Row>

        {/* --- custom status creator --- */}
        <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('settings.status_add')}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {NAME_LANGS.map(({ code, labelKey }) => (
              <div key={code}>
                <label
                  htmlFor={`settings-status-${code}`}
                  className="mb-1 block text-[11px] font-bold text-gray-500 dark:text-gray-400"
                >
                  {t(labelKey)}
                </label>
                <input
                  id={`settings-status-${code}`}
                  value={name[code]}
                  onChange={(event) => setName({ ...name, [code]: event.target.value })}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Swatches value={color} colors={STATUS_COLORS} ariaLabel={t('settings.tag_color')} onChange={setColor} />
            <IconPicker value={icon} names={STATUS_ICONS} ariaLabel={t('settings.status_icon')} onChange={setIcon} />
          </div>
          <button type="button" onClick={addStatus} disabled={!canAdd} className={buttonClass('primary')}>
            <Plus className="size-4" aria-hidden="true" />
            {t('settings.status_add')}
          </button>
        </div>

        {/* --- existing custom statuses --- */}
        {settings.customStatuses.length === 0 ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t('settings.status_empty')}</p>
        ) : (
          <ul className="space-y-2">
            {settings.customStatuses.map((status) => (
              <li
                key={status.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: status.color }}
                >
                  <StatusIcon name={status.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{statusLabel(customStatusRef(status.id))}</span>
                <span className="hidden text-[10px] text-gray-400 sm:block" dir="ltr">
                  {status.name.en}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(status)}
                  aria-label={`${t('parcels.card.delete')} ${status.name.ar}`}
                  className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setOrderOpen(true)}
          className={`${buttonClass('soft')} w-full`}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('settings.status_reorder')}
        </button>

        <StatusGroupsEditor />

      {orderOpen && <StatusOrderModal onClose={() => setOrderOpen(false)} />}

      {pendingDelete !== null && (
        <ConfirmDialog
          open
          danger
          title={t('settings.status_delete_title')}
          description={
            <>
              <span className="font-bold">{statusLabel(customStatusRef(pendingDelete.id))}</span>
              {' — '}
              {t('settings.status_delete_body')}
            </>
          }
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </SubSection>
  );
}

