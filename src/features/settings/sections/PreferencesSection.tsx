import { Monitor, Moon, Sparkles, Sun, AlignLeft, AlignRight } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useTheme, type ThemeMode } from '@/lib/theme';
import { useSettings } from '../SettingsProvider';
import { Group, Row, Segmented, Switch } from '../ui';
import type { DirectionMode } from '@/domain/settings/types';

const THEMES: { mode: ThemeMode; labelKey: TranslationKey; icon: typeof Sun }[] = [
  { mode: 'light', labelKey: 'theme.light', icon: Sun },
  { mode: 'dark', labelKey: 'theme.dark', icon: Moon },
  { mode: 'system', labelKey: 'theme.system', icon: Monitor },
];

const DIRECTIONS: { mode: DirectionMode; labelKey: TranslationKey; icon: typeof Sun }[] = [
  { mode: 'rtl', labelKey: 'settings.direction_rtl', icon: AlignRight },
  { mode: 'ltr', labelKey: 'settings.direction_ltr', icon: AlignLeft },
  { mode: 'auto', labelKey: 'settings.direction_auto', icon: Sparkles },
];

/** Appearance (theme / language / writing direction) + the duplicate alert. */
export default function PreferencesSection() {
  const { t, lang, languages, setLang, dirOverride, setDirOverride } = useI18n();
  const { mode, setMode } = useTheme();
  const { settings, updateSettings } = useSettings();

  return (
    <Group title={t('settings.group_preferences')}>
      <Row title={t('settings.theme_mode')}>
        <Segmented
          ariaLabel={t('settings.theme_mode')}
          value={mode}
          onChange={setMode}
          options={THEMES.map(({ mode: value, labelKey, icon: Icon }) => ({
            value,
            label: t(labelKey),
            icon: <Icon className="size-4" aria-hidden="true" />,
          }))}
        />
      </Row>

      <Row title={t('settings.language_label')} hint={t('settings.language_hint')}>
        <Segmented
          ariaLabel={t('settings.language_label')}
          value={lang}
          onChange={setLang}
          options={languages.map((locale) => ({ value: locale.code, label: locale.nativeLabel }))}
        />
      </Row>

      <Row title={t('settings.direction_label')} hint={t('settings.direction_hint')}>
        <Segmented
          ariaLabel={t('settings.direction_label')}
          value={dirOverride}
          onChange={setDirOverride}
          options={DIRECTIONS.map(({ mode: value, labelKey, icon: Icon }) => ({
            value,
            label: t(labelKey),
            icon: <Icon className="size-4" aria-hidden="true" />,
          }))}
        />
      </Row>

      <Row title={t('settings.duplicates_title')} hint={t('settings.duplicates_desc')}>
        <Switch
          checked={settings.showDuplicates}
          onChange={(showDuplicates) => updateSettings({ showDuplicates })}
          label={t('settings.duplicates_title')}
        />
      </Row>
    </Group>
  );
}
