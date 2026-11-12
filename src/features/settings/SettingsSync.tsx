import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n';
import { useTheme, type ThemeMode as DeviceThemeMode } from '@/lib/theme';
import type { LangCode } from '@/domain/localized';
import type { ThemeMode as SettingsThemeMode } from '@/domain/settings/types';
import { useSettings } from './SettingsProvider';

/**
 * Two-way bridge between the cloud settings and the device preferences:
 * - settings -> device: applied whenever the cloud value differs (first load,
 *   backup import, another tab); device prefs stay authoritative before ready
 *   so there is no flash of the wrong language/theme at boot.
 * - device -> settings: a user change (tracked via refs) is queued for the
 *   cloud through updateSettings (debounced, changed keys only).
 */

function toSettingsTheme(mode: DeviceThemeMode): SettingsThemeMode {
  return mode === 'system' ? 'auto' : mode;
}

function toDeviceTheme(mode: SettingsThemeMode): DeviceThemeMode {
  return mode === 'auto' ? 'system' : mode;
}

export default function SettingsSync() {
  const { status, settings, updateSettings } = useSettings();
  const { lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();

  const lastLang = useRef(lang);
  const lastMode = useRef(mode);

  useEffect(() => {
    if (status !== 'ready') return;
    if (lang === lastLang.current) {
      // Cloud changed (first load or import): push into i18n.
      if (settings.language !== lang) setLang(settings.language);
    } else if (settings.language !== lang) {
      // The user picked a language: persist it.
      updateSettings({ language: lang as LangCode });
    }
    lastLang.current = lang;
  }, [lang, settings.language, status, setLang, updateSettings]);

  useEffect(() => {
    if (status !== 'ready') return;
    const cloudTheme = toSettingsTheme(mode);
    if (mode === lastMode.current) {
      if (settings.themeMode !== cloudTheme) setMode(toDeviceTheme(settings.themeMode));
    } else if (settings.themeMode !== cloudTheme) {
      updateSettings({ themeMode: cloudTheme });
    }
    lastMode.current = mode;
  }, [mode, settings.themeMode, status, setMode, updateSettings]);

  return null;
}
