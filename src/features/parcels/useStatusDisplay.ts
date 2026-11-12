import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/features/settings/SettingsProvider';
import { getBuiltInStatus, parseStatusRef } from '@/domain/status/statuses';
import type { StatusRef } from '@/domain/status/types';
import type { LangCode } from '@/domain/localized';

export interface StatusDisplay {
  /** Built-in -> `t('status.*')`; custom -> the user's name in the active language. */
  statusLabel: (ref: StatusRef) => string;
  /** Built-in -> palette colour; custom -> the stored colour. */
  statusColor: (ref: StatusRef) => string;
}

/**
 * Resolves status labels/colours for the card and modals. Custom labels follow
 * the active language because they are stored as `{ar,fr,en}` (step 4 rule).
 */
export function useStatusDisplay(): StatusDisplay {
  const { t, lang } = useI18n();
  const { settings } = useSettings();

  return useMemo<StatusDisplay>(() => {
    const customById = new Map(settings.customStatuses.map((s) => [s.id, s]));
    const statusLabel = (ref: StatusRef): string => {
      const parsed = parseStatusRef(ref);
      if (parsed.kind === 'built-in') return t(`status.${parsed.key}`);
      const custom = customById.get(parsed.id);
      return custom ? custom.name[lang as LangCode] ?? custom.name.ar : ref;
    };
    const statusColor = (ref: StatusRef): string => {
      const parsed = parseStatusRef(ref);
      if (parsed.kind === 'custom') {
        const custom = customById.get(parsed.id);
        if (custom !== undefined) return custom.color;
      }
      return getBuiltInStatus(parsed.kind === 'built-in' ? parsed.key : '')?.color ?? '#9ca3af';
    };
    return { statusLabel, statusColor };
  }, [t, lang, settings.customStatuses]);
}
