import { useCallback, useState } from 'react';
import { useUser } from '@/features/auth/AuthProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { readPdfPages } from '@/lib/pdf/readPdf';
import { getArchiveEntries } from '@/lib/firebase/archiveRepo';
import { parsePage } from '@/domain/pdf/parseLabel';
import { groupMultiPiece, mergeWithArchive, toImportedParcel } from '@/domain/pdf/mergePieces';
import type { ParsedPdfParcel } from '@/domain/pdf/types';
import type { Parcel } from '@/domain/parcel/types';
import { ensureWorkDay, todayString } from '@/features/archive/useNewDayArchive';

export type ImportPhase = 'idle' | 'reading' | 'parsing' | 'merging' | 'done' | 'error';

export interface ImportSummary {
  total: number;
  added: number;
  /** Labels whose tracking already exists in today's list (skipped). */
  duplicates: number;
  /** Grouped multi-piece shipments (their parts collapse into one parcel). */
  groups: number;
  /** Parcels restored from the archive (sms/notes/history kept). */
  restored: number;
}

interface ImportState {
  phase: ImportPhase;
  page: number;
  pageCount: number;
  summary: ImportSummary | null;
  errorMessage: string | null;
}

const INITIAL: ImportState = {
  phase: 'idle',
  page: 0,
  pageCount: 0,
  summary: null,
  errorMessage: null,
};

/**
 * Full import pipeline: read the PDF -> parse every label -> group multi-piece
 * shipments -> skip trackings already active -> restore archived history ->
 * push the new parcels. Mirrors v4's `handlePdfUpload` + `findAndMerge`.
 */
export function usePdfImport() {
  const user = useUser();
  const { parcels, addParcels } = useParcels();
  const { settings } = useSettings();
  const [state, setState] = useState<ImportState>(INITIAL);

  const reset = useCallback(() => setState(INITIAL), []);

  const importFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setState({ ...INITIAL, phase: 'error', errorMessage: 'not_pdf' });
        return;
      }
      setState({ ...INITIAL, phase: 'reading' });

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

        setState((prev) => ({ ...prev, phase: 'merging' }));
        const activeTrackings = new Set(parcels.map((p) => p.tracking));
        const fresh = grouped.filter((p) => !activeTrackings.has(p.tracking));
        const duplicates = grouped.length - fresh.length;

        const archiveEntries = await getArchiveEntries(
          user.uid,
          fresh.map((p) => p.tracking),
        );

        const now = new Date().toISOString();
        const batch: Parcel[] = [];
        let restored = 0;

        for (const label of fresh) {
          // sortOrder 0: `addParcels` assigns the final stacked order itself.
          let parcel = toImportedParcel(label, undefined, 0, now);
          const entry = archiveEntries.get(parcel.tracking);
          if (entry !== undefined) {
            parcel = mergeWithArchive(parcel, entry);
            restored += 1;
          }
          batch.push(parcel);
        }
        addParcels(batch);

        setState({
          phase: 'done',
          page: pages.length,
          pageCount: pages.length,
          summary: {
            total: grouped.length,
            added: fresh.length,
            duplicates,
            groups: grouped.filter((p) => p.pieceTrackings.length > 1).length,
            restored,
          },
          errorMessage: null,
        });
      } catch (error) {
        setState({
          ...INITIAL,
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
