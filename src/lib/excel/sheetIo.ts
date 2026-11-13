import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';
import type { TranslationKey } from '@/i18n';
import { buildExportRows } from '@/domain/excel/serialize';
import type { ExcelRow } from '@/domain/excel/parseRows';

/**
 * The ONLY module that imports `xlsx` (kept out of the main bundle: the library
 * is fetched on demand via dynamic import when a user picks/exports a file).
 */
export const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;

/** Extension/accept check: `xlsx` parses all three formats through `read`. */
export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Hidden input `accept` attribute for pickers. */
export const EXCEL_ACCEPT = EXCEL_EXTENSIONS.join(',');

/** Reads the FIRST worksheet into plain rows (headers become the keys). */
export async function readSheetRows(file: File): Promise<ExcelRow[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const sheet = firstSheet === undefined ? undefined : workbook.Sheets[firstSheet];
  if (sheet === undefined) throw new Error('empty_workbook');
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: null, raw: true });
  if (rows.length === 0) throw new Error('empty_sheet');
  return rows;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** `swipex-parcels-YYYY-MM-DD.xlsx` */
export function exportFilename(date = new Date()): string {
  return `swipex-parcels-${date.toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Builds and downloads the workbook for the active list (columns translated to
 * the current language; status shown through `statusLabel`).
 */
export async function exportParcelsFile(
  parcels: readonly Parcel[],
  t: (key: TranslationKey) => string,
  statusLabel: (ref: StatusRef) => string,
  date = new Date(),
): Promise<void> {
  const rows = buildExportRows(parcels, t, statusLabel);
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Parcels');
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, exportFilename(date));
}
