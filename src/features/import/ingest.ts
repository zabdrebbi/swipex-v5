import { getArchiveEntries } from '@/lib/firebase/archiveRepo';
import { mergeWithArchive } from '@/domain/pdf/mergePieces';
import type { Parcel } from '@/domain/parcel/types';

/** Pipeline phases shared by the PDF and Excel importers (drives the modal UI). */
export type ImportPhase = 'idle' | 'reading' | 'parsing' | 'merging' | 'done' | 'error';

export interface ImportSummary {
  total: number;
  added: number;
  /** Rows/labels whose tracking already exists in today's list (skipped). */
  duplicates: number;
  /** Multi-piece shipments (their parts count as one parcel). */
  groups: number;
  /** Parcels restored from the archive (sms/notes/history kept). */
  restored: number;
}

export interface ImportState {
  phase: ImportPhase;
  page: number;
  pageCount: number;
  summary: ImportSummary | null;
  errorMessage: string | null;
}

export const INITIAL_IMPORT_STATE: ImportState = {
  phase: 'idle',
  page: 0,
  pageCount: 0,
  summary: null,
  errorMessage: null,
};

export interface IngestInput {
  uid: string;
  /** Today's active list: the identity set used for duplicate detection. */
  activeParcels: readonly Parcel[];
  /** Candidate parcels already parsed (PDF labels or Excel rows). */
  candidates: readonly Parcel[];
  addParcels: (incoming: Parcel[]) => void;
}

/**
 * The merge tail shared by both importers (v4's `findAndMerge`): drop rows
 * whose tracking is already active, restore archived sms/notes/history for the
 * rest, push the batch and report the summary. Archive reads are bounded chunk
 * queries (`getArchiveEntries`) — no realtime listener (Spark quota rule).
 */
export async function ingestParsedParcels(input: IngestInput): Promise<ImportSummary> {
  const active = new Set(input.activeParcels.map((parcel) => parcel.tracking));
  const fresh = input.candidates.filter((parcel) => !active.has(parcel.tracking));
  const duplicates = input.candidates.length - fresh.length;

  const archiveEntries = await getArchiveEntries(
    input.uid,
    fresh.map((parcel) => parcel.tracking),
  );

  const batch: Parcel[] = [];
  let restored = 0;
  for (const parcel of fresh) {
    const entry = archiveEntries.get(parcel.tracking);
    if (entry !== undefined) {
      batch.push(mergeWithArchive(parcel, entry));
      restored += 1;
    } else {
      // sortOrder 0: `addParcels` assigns the final stacked order itself.
      batch.push(parcel);
    }
  }
  input.addParcels(batch);

  return {
    total: input.candidates.length,
    added: fresh.length,
    duplicates,
    groups: input.candidates.filter((parcel) => parcel.isMultiPiece).length,
    restored,
  };
}
