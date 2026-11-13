/** A worksheet cell as `xlsx` returns it (`cellDates: true` yields Date objects). */
export type ExcelCell = string | number | boolean | Date | null;

/** One sheet row: original header text -> cell value. */
export type ExcelRow = Record<string, ExcelCell>;

/**
 * Matching key for headers and status labels: case-insensitive, accent-free and
 * spacing/punctuation-free. Exported so status lookup maps use the exact rules.
 */
export function normalizeCellKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_\-.·°]+/g, '')
    .trim();
}

export function cellToString(value: ExcelCell): string {
  if (value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return value.trim();
}

/** Cash amount; accepts `1 500`, `1,500.5` style cells; 0 when unreadable. */
export function parseAmount(value: ExcelCell): number {
  const text = typeof value === 'number' ? String(value) : cellToString(value);
  const cleaned = text.replace(/[\s\u00A0]/g, '').replace(',', '.');
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Date cells exist at local or UTC midnight depending on the `xlsx` build. */
function fromJsDate(date: Date): string {
  const utc = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  const day = utc ? date.getUTCDate() : date.getDate();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Excel serial day number -> `YYYY-MM-DD` (epoch: 1899-12-30). */
function fromSerial(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Accepts Date cells, Excel serials, `YYYY-MM-DD` and `DD-MM-YYYY` text. */
export function parseDateCell(value: ExcelCell): string | undefined {
  if (value === null) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : fromJsDate(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1 || value > 200_000) return undefined;
    return fromSerial(value);
  }
  if (typeof value === 'boolean') return undefined;
  const text = value.trim();
  if (text === '') return undefined;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso !== null) return `${iso[1]}-${pad2(Number(iso[2]))}-${pad2(Number(iso[3]))}`;
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy !== null) return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;
  return undefined;
}

/**
 * Words accepted in the opening column (matches `excel.yes`/`excel.no` in all
 * three languages plus v4's own export words). Escapes keep this file ASCII.
 */
const OPENING_YES = new Set([
  'true',
  'oui',
  'yes',
  'y',
  '1',
  '\u0646\u0639\u0645', // ar yes
  '\u0645\u0633\u0645\u0648\u062d', // v4 allowed
]);
const OPENING_NO = new Set([
  'false',
  'non',
  'no',
  'n',
  '0',
  '\u0644\u0627', // ar no
  '\u063a\u064a\u0631\u0645\u0633\u0645\u0648\u062d', // v4 forbidden
]);

export function parseOpening(value: ExcelCell): boolean | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  const key = normalizeCellKey(cellToString(value));
  if (key === '') return null;
  if (OPENING_YES.has(key)) return true;
  if (OPENING_NO.has(key)) return false;
  return null;
}

export function splitTrackings(value: ExcelCell): string[] {
  return cellToString(value)
    .split(/[|,;\n/]+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

export function parsePieces(value: ExcelCell, subCount: number): number {
  const parsed = typeof value === 'number' ? Math.round(value) : parseInt(cellToString(value), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return subCount > 1 ? subCount : 1;
}

/** ISO datetimes only: `Parcel.reminderTime` is an ISO timestamp. */
export function parseReminder(value: ExcelCell): string | undefined {
  if (value instanceof Date) return value.toISOString();
  const text = cellToString(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) ? text : undefined;
}
