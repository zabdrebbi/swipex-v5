import { normalizePhone } from '../parcel/phone';
import type { Parcel } from '../parcel/types';
import { DEFAULT_STATUS } from '../status/statuses';
import type { StatusRef } from '../status/types';
import {
  cellToString,
  normalizeCellKey,
  parseAmount,
  parseDateCell,
  parseOpening,
  parsePieces,
  parseReminder,
  splitTrackings,
  type ExcelCell,
  type ExcelRow,
} from './cells';
import { buildFieldIndex, type ExcelField } from './headers';

// Stable public surface for the feature layer (importers and tests).
export { normalizeCellKey } from './cells';
export type { ExcelCell, ExcelRow } from './cells';

export interface ExcelParseOptions {
  /** Normalized status label (any language, built-in or custom) -> persisted ref. */
  statusByText: ReadonlyMap<string, StatusRef>;
  /** ISO timestamp stamped on the created parcels. */
  now: string;
}

export interface ExcelParseResult {
  parcels: Parcel[];
  /** Rows without a tracking number (ignored). */
  skipped: number;
  /** Rows whose status text matched nothing (the default status was applied). */
  unmatchedStatuses: number;
  /** Rows read from the sheet. */
  total: number;
}

/**
 * Turns worksheet rows into domain parcels. Mirrors v4's `importExcel.js`:
 * headers are matched across ar/fr/en spellings, phones go through
 * `normalizePhone`, and an unknown status falls back to the default one.
 */
export function parseExcelRows(rows: ExcelRow[], options: ExcelParseOptions): ExcelParseResult {
  const parcels: Parcel[] = [];
  let skipped = 0;
  let unmatchedStatuses = 0;

  // Sheets are rectangular (`defval: null`), so one header index fits every row.
  const headerSet = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) headerSet.add(key);
  const index = buildFieldIndex([...headerSet]);
  const fieldCell = (row: ExcelRow, field: ExcelField): ExcelCell => {
    const header = index.get(field);
    if (header === undefined) return null;
    return row[header] ?? null;
  };

  for (const row of rows) {
    const raw = (field: ExcelField): ExcelCell => fieldCell(row, field);

    const tracking = cellToString(raw('tracking'));
    if (tracking === '') {
      skipped += 1;
      continue;
    }

    const now = options.now;
    const statusText = normalizeCellKey(cellToString(raw('status')));
    let status: StatusRef = DEFAULT_STATUS;
    if (statusText !== '') {
      const resolved = options.statusByText.get(statusText);
      if (resolved !== undefined) status = resolved;
      else unmatchedStatuses += 1;
    }

    const subPieces = splitTrackings(raw('subTrackings')).map((sub) => ({ tracking: sub }));
    const piecesCount = parsePieces(raw('piecesCount'), subPieces.length);

    const parcel: Parcel = {
      tracking,
      receiver: cellToString(raw('receiver')),
      phone: normalizePhone(cellToString(raw('phone'))),
      municipality: cellToString(raw('municipality')),
      amount: parseAmount(raw('amount')),
      type: cellToString(raw('type')),
      status,
      statusUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      // `addParcels` assigns the final stacked order itself.
      sortOrder: 0,
      smsSent: false,
      senderSmsSent: false,
      isMultiPiece: piecesCount > 1 || subPieces.length > 1,
      piecesCount,
      subTrackings: subPieces,
      openingAllowed: parseOpening(raw('openingAllowed')),
    };

    const address = cellToString(raw('address'));
    if (address !== '') parcel.address = address;
    const wilaya = cellToString(raw('wilaya'));
    if (wilaya !== '') parcel.wilaya = wilaya;
    const content = cellToString(raw('content'));
    if (content !== '') parcel.content = content;
    const pin = cellToString(raw('pin'));
    if (pin !== '') parcel.pin = pin;
    const phone2 = normalizePhone(cellToString(raw('phone2')));
    if (phone2 !== '') parcel.phone2 = phone2;
    const sender = cellToString(raw('sender'));
    if (sender !== '') parcel.sender = sender;
    const senderAddress = cellToString(raw('senderAddress'));
    if (senderAddress !== '') parcel.senderAddress = senderAddress;
    const senderPhone = normalizePhone(cellToString(raw('senderPhone')));
    if (senderPhone !== '') parcel.senderPhone = senderPhone;
    const senderPhone2 = normalizePhone(cellToString(raw('senderPhone2')));
    if (senderPhone2 !== '') parcel.senderPhone2 = senderPhone2;
    const notes = cellToString(raw('notes'));
    if (notes !== '') parcel.notes = notes;
    const tag = cellToString(raw('tag'));
    if (tag !== '') parcel.tag = tag;
    const createdDate = parseDateCell(raw('createdDate'));
    if (createdDate !== undefined) parcel.createdDate = createdDate;
    const reminder = parseReminder(raw('reminderTime'));
    if (reminder !== undefined) parcel.reminderTime = reminder;

    parcels.push(parcel);
  }

  return { parcels, skipped, unmatchedStatuses, total: rows.length };
}
