import { useCallback, useMemo, useState } from 'react';
import { useUser } from '@/features/auth/AuthProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { LOCALES } from '@/i18n/registry';
import type { TranslationKey } from '@/i18n';
import { isExcelFile, readSheetRows } from '@/lib/excel/sheetIo';
import { normalizeCellKey, parseExcelRows } from '@/domain/excel/parseRows';
import { BUILT_IN_STATUSES, customStatusRef } from '@/domain/status/statuses';
import type { CustomStatus, StatusRef } from '@/domain/status/types';
import type { LangCode } from '@/domain/localized';
import { ensureWorkDay, todayString } from '@/features/archive/useNewDayArchive';
import { ingestParsedParcels, INITIAL_IMPORT_STATE, type ImportState } from './ingest';

const LANG_CODES: readonly LangCode[] = ['ar', 'fr', 'en'];

/**
 * Status label -> persisted ref, for resolving the `Status` column on import.
 * Covers every built-in status in all three app languages plus the user's
 * custom statuses (their name exists in ar/fr/en by the step-4 rule).
 */
function buildStatusLookup(customStatuses: CustomStatus[]): ReadonlyMap<string, StatusRef> {
  const map = new Map<string, StatusRef>();
  for (const locale of LOCALES) {
    for (const status of BUILT_IN_STATUSES) {
      const label = locale.strings[`status.${status.key}` as TranslationKey];
      if (label.trim() !== '') map.set(normalizeCellKey(label), status.key);
    }
  }
  for (const custom of customStatuses) {
    for (const code of LANG_CODES) {
      const label = custom.name[code];
      if (label.trim() !== '') map.set(normalizeCellKey(label), customStatusRef(custom.id));
    }
  }
  return map;
}

/**
 * Excel import pipeline: same shape and phases as `usePdfImport`, but the
 * source is a spreadsheet (`.xlsx/.xls/.csv`) instead of label PDFs. Used for
 * backups/restores and manual lists (v4's `importExcel.js`).
 */
export function useExcelImport() {
  const user = useUser();
  const { parcels, addParcels } = useParcels();
  const { settings } = useSettings();
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE);

  const statusByText = useMemo(
    () => buildStatusLookup(settings.customStatuses),
    [settings.customStatuses],
  );

  const reset = useCallback(() => setState(INITIAL_IMPORT_STATE), []);

  const importFile = useCallback(
    async (file: File) => {
      if (!isExcelFile(file)) {
        setState({ ...INITIAL_IMPORT_STATE, phase: 'error', errorMessage: 'not_excel' });
        return;
      }
      setState({ ...INITIAL_IMPORT_STATE, phase: 'reading' });

      try {
        // Importing after midnight belongs to the NEW day: archive first
        // (the shared guard makes this a no-op when it already ran).
        await ensureWorkDay(user.uid, settings.sessionDate, parcels, todayString());

        const rows = await readSheetRows(file);

        setState((prev) => ({ ...prev, phase: 'parsing' }));
        const parsed = parseExcelRows(rows, {
          statusByText,
          now: new Date().toISOString(),
        });

        setState((prev) => ({ ...prev, phase: 'merging' }));
        const summary = await ingestParsedParcels({
          uid: user.uid,
          activeParcels: parcels,
          candidates: parsed.parcels,
          addParcels,
        });

        setState({
          phase: 'done',
          page: 0,
          pageCount: 0,
          summary,
          errorMessage: null,
        });
      } catch (error) {
        setState({
          ...INITIAL_IMPORT_STATE,
          phase: 'error',
          errorMessage: error instanceof Error ? error.message : 'read_failed',
        });
      }
    },
    // Same rule as the PDF importer: a second import must see the first batch.
    [user.uid, parcels, addParcels, settings.sessionDate, statusByText],
  );

  return { ...state, importFile, reset };
}
