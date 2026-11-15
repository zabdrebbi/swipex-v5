import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useToast } from '@/components/Toast';
import { useSettings } from '../SettingsProvider';
import { Row, SubSection, Switch, buttonClass, inputClass } from '../ui';
import { trackingsWithTag, usedMunicipalities } from '@/domain/list/query';
import type { TagDef } from '@/domain/settings/types';

const DEFAULT_TAG_COLOR = '#8b5cf6';

type Scope = TagDef['scope'];

/** Tag order as a complete list: stored order first, then anything it missed. */
function orderedTagNames(tags: readonly TagDef[], stored: readonly string[]): string[] {
  const known = new Set(tags.map((tag) => tag.name));
  const order: string[] = [];
  for (const name of stored) {
    if (known.has(name) && !order.includes(name)) order.push(name);
  }
  for (const tag of tags) {
    if (!order.includes(tag.name)) order.push(tag.name);
  }
  return order;
}

/**
 * Tag system: enable switch, creation (name + colour + scope), smart sorting,
 * card tracking and the ordered list with ↑/↓. Deleting a tag never rewrites
 * parcels (see `trackingsWithTag`): the stale name simply stops being shown.
 */
export default function TagsSection() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { parcels } = useParcels();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [scope, setScope] = useState<Scope>('global');
  const [municipality, setMunicipality] = useState('');

  const municipalities = usedMunicipalities(parcels);

  function addTag() {
    const trimmed = name.trim().replace(/^@/, '');
    if (trimmed === '') return;
    if (scope === 'municipality' && municipality.trim() === '') {
      showToast(t('settings.tag_municipality_required'));
      return;
    }
    if (settings.tags.some((tag) => tag.name === trimmed)) {
      showToast(t('settings.tag_exists'));
      return;
    }
    const tag: TagDef = { name: trimmed, color, scope };
    if (scope === 'municipality') tag.municipality = municipality.trim();
    updateSettings({
      tags: [...settings.tags, tag],
      tagOrder: [...orderedTagNames(settings.tags, settings.tagOrder), trimmed],
    });
    setName('');
  }

  function moveTag(index: number, delta: number) {
    const order = orderedTagNames(settings.tags, settings.tagOrder);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const current = next[index];
    const swapped = next[target];
    if (current === undefined || swapped === undefined) return;
    next[index] = swapped;
    next[target] = current;
    updateSettings({ tagOrder: next });
  }

  function removeTag(tagName: string) {
    updateSettings({
      tags: settings.tags.filter((tag) => tag.name !== tagName),
      tagOrder: settings.tagOrder.filter((item) => item !== tagName),
    });
  }

  const order = orderedTagNames(settings.tags, settings.tagOrder);
  const byName = new Map(settings.tags.map((tag) => [tag.name, tag]));

  return (
    <SubSection title={t('settings.section_tags')} badge={settings.tagsEnabled ? String(settings.tags.length) : undefined}>
        <Row title={t('settings.tags_enable')}>
          <Switch
            checked={settings.tagsEnabled}
            onChange={(tagsEnabled) => updateSettings({ tagsEnabled })}
            label={t('settings.tags_enable')}
          />
        </Row>

        {settings.tagsEnabled && (
          <>
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('settings.tag_add')}
                  aria-label={t('settings.tag_name')}
                  className={`${inputClass} sm:flex-1`}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  title={t('settings.tag_color')}
                  aria-label={t('settings.tag_color')}
                  className="h-11 w-full shrink-0 cursor-pointer rounded-xl border border-gray-300 bg-transparent p-1 dark:border-gray-700 sm:w-14"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value as Scope)}
                  aria-label={t('settings.tag_scope')}
                  className={`${inputClass} sm:flex-1`}
                >
                  <option value="global">{t('tagpicker.scope_global')}</option>
                  <option value="municipality">{t('tagpicker.scope_municipality')}</option>
                </select>
                {scope === 'municipality' && (
                  <select
                    value={municipality}
                    onChange={(event) => setMunicipality(event.target.value)}
                    aria-label={t('filter.municipality')}
                    className={`${inputClass} sm:flex-1`}
                  >
                    <option value="">{t('settings.tag_pick_municipality')}</option>
                    {municipalities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button type="button" onClick={addTag} className={`${buttonClass('primary')} w-full`}>
                <Plus className="size-4" aria-hidden="true" />
                {t('settings.tag_add')}
              </button>
            </div>

            <Row
              title={t('settings.tags_smart_sort')}
              hint={t('settings.tags_smart_sort_desc')}
            >
              <Switch
                checked={settings.smartTagSortingEnabled}
                onChange={(smartTagSortingEnabled) => updateSettings({ smartTagSortingEnabled })}
                label={t('settings.tags_smart_sort')}
              />
            </Row>
            <Row title={t('settings.card_tracking')} hint={t('settings.card_tracking_desc')}>
              <Switch
                checked={settings.cardTrackingEnabled}
                onChange={(cardTrackingEnabled) => updateSettings({ cardTrackingEnabled })}
                label={t('settings.card_tracking')}
              />
            </Row>

            {order.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t('settings.tag_empty')}</p>
            ) : (
              <ul className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                {order.map((tagName, index) => {
                  const tag = byName.get(tagName);
                  const usedBy = trackingsWithTag(parcels, tagName).length;
                  return (
                    <li key={tagName} className="flex items-center gap-2">
                      <span
                        className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 text-sm font-bold"
                        style={{
                          borderColor: tag?.color ?? DEFAULT_TAG_COLOR,
                          color: tag?.color ?? DEFAULT_TAG_COLOR,
                        }}
                      >
                        <span className="truncate" dir="ltr">
                          @{tagName}
                        </span>
                        {tag?.scope === 'municipality' && (
                          <span className="shrink-0 text-[10px] opacity-80">{tag.municipality}</span>
                        )}
                        {usedBy > 0 && (
                          <span
                            className="shrink-0 text-[10px] font-bold opacity-70"
                            title={t('settings.tag_used_by', { count: usedBy })}
                            dir="ltr"
                          >
                            {usedBy}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveTag(index, -1)}
                        aria-label={`${t('status_order.move_up')} @${tagName}`}
                        className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={index === order.length - 1}
                        onClick={() => moveTag(index, 1)}
                        aria-label={`${t('status_order.move_down')} @${tagName}`}
                        className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTag(tagName)}
                        aria-label={`${t('settings.tag_remove')} @${tagName}`}
                        className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
    </SubSection>
  );
}
