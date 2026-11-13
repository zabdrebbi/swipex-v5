import { useCallback, useState } from 'react';
import { useUser } from '@/features/auth/AuthProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { readPdfPages } from '@/lib/pdf/readPdf';
import { parsePage } from '@/domain/pdf/parseLabel';
import { groupMultiPiece, toImportedParcel } from '@/domain/pdf/mergePieces';
import type { ParsedPdfParcel } from '@/domain/pdf/types';
import { ensureWorkDay, todayString } from '@/features/archive/useNewDayArchive';
import { ingestParsedParcels, INITIAL_IMPORT_STATE, type ImportState } from './ingest';

/**
 * Full import pipeline: read the PDF -> parse every label -> group multi-piece
 * shipments -> run the shared merge tail (dedupe + archive restore). Mirrors
 * v4's `handlePdfUpload` + `findAndMerge`.
 */
export function usePdfImport() {
  const user = useUser();
  const { parcels, addParcels } = useParcels();
  const { settings } = useSettings();
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE);

  const reset = useCallback(() => setState(INITIAL_IMPORT_STATE), []);

  const importFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setState({ ...INITIAL_IMPORT_STATE, phase: 'error', errorMessage: 'not_pdf' });
        return;
      }
      setState({ ...INITIAL_IMPORT_STATE, phase: 'reading' });

      try {
        // A label imported after midnight belongs to the NEW day: archive the
        // old one first (shared guard makes this a no-op when it already ran).
        await ensureWorkDay(user.uid, settings.sessionDate, parcels, todayString());

        const pages = await readPdfPages(file, (page, pageCount) =>
          setState((prev) => ({ ...prev, phase: 'reading', page, pageCount })),
        );

        setState((prev) => ({ ...prev, phase: 'parsing' }));
        const parsed: ParsedPdfParcel[] = pages.flatMap(parsePage);
        const grouped = groupMultiPiece(parsed);
        const now = new Date().toISOString();
        const candidates = grouped.map((label) => toImportedParcel(label, undefined, 0, now));

        setState((prev) => ({ ...prev, phase: 'merging' }));
        const summary = await ingestParsedParcels({
          uid: user.uid,
          activeParcels: parcels,
          candidates,
          addParcels,
        });

        setState({
          phase: 'done',
          page: pages.length,
          pageCount: pages.length,
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
    // `parcels` is intentionally a dependency: importing twice in a row must
    // see the first batch and report those as duplicates.
    [user.uid, parcels, addParcels, settings.sessionDate],
  );

  return { ...state, importFile, reset };
}
