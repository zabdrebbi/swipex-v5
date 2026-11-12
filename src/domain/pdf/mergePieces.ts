import type { ParsedPdfParcel } from './types';
import type { Parcel } from '../parcel/types';
import type { ArchiveEntry } from '../archive/types';
import { DEFAULT_STATUS } from '../status/statuses';

/**
 * Groups multi-piece labels: every label carrying the same `multiPieceCode`
 * becomes ONE parcel whose identity is the group code, with the individual
 * `YAL-` numbers kept as sub-trackings (v4's grouping rule).
 */
export function groupMultiPiece(parsed: ParsedPdfParcel[]): ParsedPdfParcel[] {
  const groups = new Map<string, ParsedPdfParcel[]>();
  const standalone: ParsedPdfParcel[] = [];

  for (const parcel of parsed) {
    if (parcel.multiPieceCode === '') {
      standalone.push(parcel);
      continue;
    }
    const bucket = groups.get(parcel.multiPieceCode);
    if (bucket === undefined) groups.set(parcel.multiPieceCode, [parcel]);
    else bucket.push(parcel);
  }

  const grouped: ParsedPdfParcel[] = [];
  for (const [code, pieces] of groups) {
    pieces.sort((a, b) => a.pieceIndex - b.pieceIndex);
    const first = pieces[0];
    // Prefer a piece that actually carries recipient data for the merged view.
    const withData = pieces.find((p) => p.receiver !== '') ?? first;

    const contents = [...new Set(pieces.map((p) => p.content.trim()).filter(Boolean))];
    const firstAmount = pieces.find((p) => p.amount !== '' && p.amount !== '0');

    grouped.push({
      ...withData,
      tracking: code,
      multiPieceCode: '',
      pieceIndex: 0,
      pieceTotal: first.pieceTotal || pieces.length,
      pieceTrackings: pieces.map((p) =>
        p.pin !== '' ? { tracking: p.tracking, pin: p.pin } : { tracking: p.tracking },
      ),
      amount: firstAmount !== undefined ? firstAmount.amount : '0',
      content: contents.length > 0 ? contents.join('\u060C ') : '',
      openingAllowed: pieces.some((p) => p.openingAllowed === true),
      ...(first.pin !== '' ? { pin: first.pin } : {}),
    });
  }

  return [...grouped, ...standalone];
}

/** `DD-MM-YYYY` (label) -> `YYYY-MM-DD` (stored `createdDate`). */
export function toIsoDate(labelDate: string): string | undefined {
  const match = labelDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match === null) return undefined;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** Parses the cash amount into a number; 0 when absent/unreadable. */
export function toAmount(raw: string): number {
  const value = Number(raw.replace(/\s/g, ''));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Builds the domain parcel for a freshly imported label (status = default). */
export function toImportedParcel(
  parsed: ParsedPdfParcel,
  existing: Parcel | undefined,
  sortOrder: number,
  now: string,
): Parcel {
  const isMultiPiece = parsed.pieceTrackings.length > 1 || parsed.pieceTotal > 1;
  const parcel: Parcel = {
    tracking: parsed.tracking,
    receiver: parsed.receiver,
    phone: parsed.phone,
    municipality: parsed.municipality,
    amount: toAmount(parsed.amount),
    type: parsed.type,
    status: DEFAULT_STATUS,
    statusUpdatedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sortOrder,
    smsSent: existing?.smsSent ?? false,
    senderSmsSent: existing?.senderSmsSent ?? false,
    isMultiPiece,
    piecesCount: isMultiPiece ? parsed.pieceTotal || parsed.pieceTrackings.length : 1,
    subTrackings: parsed.pieceTrackings,
    openingAllowed: parsed.openingAllowed,
  };

  if (parsed.phone2 !== '') parcel.phone2 = parsed.phone2;
  if (parsed.address !== '') parcel.address = parsed.address;
  if (parsed.wilaya !== '') parcel.wilaya = parsed.wilaya;
  if (parsed.content !== '') parcel.content = parsed.content;
  if (parsed.pin !== '') parcel.pin = parsed.pin;
  if (parsed.sender !== '') parcel.sender = parsed.sender;
  if (parsed.senderPhone !== '') parcel.senderPhone = parsed.senderPhone;
  if (parsed.senderPhone2 !== '') parcel.senderPhone2 = parsed.senderPhone2;
  if (parsed.senderAddress !== '') parcel.senderAddress = parsed.senderAddress;
  const isoDate = toIsoDate(parsed.createdDate);
  if (isoDate !== undefined) parcel.createdDate = isoDate;
  return parcel;
}

/**
 * v4's `findAndMerge` restore rule: a re-imported label that already exists in
 * the archive keeps its last known sms/notes/identity fields, but the fresh
 * PDF data wins for contact details (the label is newer than the archive).
 * Status stays default: PDFs never carry a status.
 */
export function mergeWithArchive(parcel: Parcel, entry: ArchiveEntry | undefined): Parcel {
  if (entry === undefined) return parcel;
  const latest = entry.latest;
  return {
    ...parcel,
    smsSent: latest.smsSent || parcel.smsSent,
    senderSmsSent: latest.senderSmsSent || parcel.senderSmsSent,
    notes: latest.notes !== undefined && latest.notes !== '' ? latest.notes : parcel.notes,
    tag: latest.tag ?? parcel.tag,
    receiver: latest.receiver || parcel.receiver,
    municipality: latest.municipality || parcel.municipality,
    phone: latest.phone || parcel.phone,
    phone2: latest.phone2 || parcel.phone2,
    location: parcel.location ?? latest.location,
  };
}
