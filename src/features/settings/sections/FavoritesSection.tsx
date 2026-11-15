import { useState } from 'react';
import { Phone, Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSettings } from '../SettingsProvider';
import { useToast } from '@/components/Toast';
import { Row, SubSection, Switch, buttonClass, inputClass } from '../ui';
import type { FavoritePhone } from '@/domain/settings/types';

const EMPTY_FORM = { phone: '', name: '', municipality: '' };

/** Normalises an Algerian phone number for comparison (spaces/dashes/+213). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('213') ? digits.slice(3) : digits;
}

/**
 * Receiver favourites: saved phone numbers with a name/municipality that the
 * list's "favourite" filter and the phone picker read from (v4 favourites).
 */
export default function FavoritesSection() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);

  function addFavorite() {
    const phone = form.phone.trim();
    if (phone === '') {
      showToast(t('settings.fav_phone_required'));
      return;
    }
    const normalized = normalizePhone(phone);
    if (settings.favoritePhones.some((fav) => normalizePhone(fav.phone) === normalized)) {
      showToast(t('settings.fav_exists'));
      return;
    }
    const entry: FavoritePhone = { phone, name: form.name.trim() };
    if (form.municipality.trim() !== '') entry.municipality = form.municipality.trim();
    updateSettings({ favoritePhones: [...settings.favoritePhones, entry] });
    setForm(EMPTY_FORM);
  }

  function removeFavorite(phone: string) {
    updateSettings({ favoritePhones: settings.favoritePhones.filter((fav) => fav.phone !== phone) });
  }

  return (
    <SubSection
      title={t('settings.section_favorites')}
      badge={settings.favoritePhonesEnabled ? String(settings.favoritePhones.length) : undefined}
    >
        <Row title={t('settings.fav_enable')} hint={t('settings.fav_enable_desc')}>
          <Switch
            checked={settings.favoritePhonesEnabled}
            onChange={(favoritePhonesEnabled) => updateSettings({ favoritePhonesEnabled })}
            label={t('settings.fav_enable')}
          />
        </Row>

        {settings.favoritePhonesEnabled && (
          <>
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label htmlFor="settings-fav-phone" className="mb-1 block text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {t('settings.fav_phone')}
                  </label>
                  <input
                    id="settings-fav-phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="0550123456"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="settings-fav-name" className="mb-1 block text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {t('settings.fav_name')}
                  </label>
                  <input
                    id="settings-fav-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="settings-fav-municipality" className="mb-1 block text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {t('filter.municipality')}
                  </label>
                  <input
                    id="settings-fav-municipality"
                    value={form.municipality}
                    onChange={(event) => setForm({ ...form, municipality: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="button" onClick={addFavorite} className={`${buttonClass('primary')} w-full`}>
                <Plus className="size-4" aria-hidden="true" />
                {t('settings.fav_add')}
              </button>
            </div>

            {settings.favoritePhones.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">{t('settings.fav_empty')}</p>
            ) : (
              <ul className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                {settings.favoritePhones.map((fav) => (
                  <li
                    key={fav.phone}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <Phone className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{fav.name !== '' ? fav.name : fav.phone}</span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                        {fav.phone}
                        {fav.municipality !== undefined ? ` · ${fav.municipality}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFavorite(fav.phone)}
                      aria-label={`${t('settings.fav_remove')} ${fav.phone}`}
                      className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
    </SubSection>
  );
}
