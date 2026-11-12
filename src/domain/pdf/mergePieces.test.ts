import { describe, expect, it } from 'vitest';
import { groupMultiPiece, mergeWithArchive, toAmount, toIsoDate, toImportedParcel } from './mergePieces';
import type { ParsedPdfParcel } from './types';
import type { Parcel } from '../parcel/types';
import type { ArchiveEntry } from '../archive/types';

function parsed(overrides: Partial<ParsedPdfParcel>): ParsedPdfParcel {
  return {
    tracking: 'YAL-TEST0001',
    type: 'E-COMMERCE',
    sender: '',
    senderAddress: '',
    senderPhone: '',
    senderPhone2: '',
    receiver: 'KHELIL MOHAMED',
    address: 'CITE 123',
    municipality: 'BIR EL DJIR',
    wilaya: 'ORAN',
    phone: '0661234567',
    phone2: '',
    pin: '',
    content: 'PANTALON',
    amount: '4500',
    createdDate: '12-05-2026',
    multiPieceCode: '',
    pieceIndex: 0,
    pieceTotal: 0,
    pieceTrackings: [],
    openingAllowed: null,
    ...overrides,
  };
}

function parcel(overrides: Partial<Parcel>): Parcel {
  return {
    tracking: 'YAL-TEST0001',
    receiver: 'KHELIL MOHAMED',
    phone: '0661234567',
    municipality: 'BIR EL DJIR',
    amount: 4500,
    type: 'E-COMMERCE',
    status: 'no_action',
    statusUpdatedAt: '2026-05-12T08:00:00.000Z',
    createdAt: '2026-05-12T08:00:00.000Z',
    updatedAt: '2026-05-12T08:00:00.000Z',
    sortOrder: 0,
    smsSent: false,
    senderSmsSent: false,
    isMultiPiece: false,
    piecesCount: 1,
    subTrackings: [],
    openingAllowed: null,
    ...overrides,
  };
}

describe('groupMultiPiece', () => {
  it('collapses labels sharing a group code into one parcel', () => {
    const pieces = [
      parsed({ tracking: 'YAL-P1', multiPieceCode: 'CMP-SH58HC', pieceIndex: 1, pieceTotal: 2 }),
      parsed({ tracking: 'YAL-P2', multiPieceCode: 'CMP-SH58HC', pieceIndex: 2, pieceTotal: 2 }),
    ];
    const grouped = groupMultiPiece(pieces);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].tracking).toBe('CMP-SH58HC');
    expect(grouped[0].pieceTrackings.map((p) => p.tracking)).toEqual(['YAL-P1', 'YAL-P2']);
    expect(grouped[0].pieceTotal).toBe(2);
  });

  it('keeps standalone labels untouched', () => {
    const single = parsed({ tracking: 'YAL-ALONE' });
    const grouped = groupMultiPiece([single]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].tracking).toBe('YAL-ALONE');
    expect(grouped[0].pieceTrackings).toEqual([]);
  });

  it('takes the amount from the first piece that carries one', () => {
    const grouped = groupMultiPiece([
      parsed({ tracking: 'YAL-A1', multiPieceCode: 'CMP-X1', pieceIndex: 1, pieceTotal: 2, amount: '0' }),
      parsed({ tracking: 'YAL-A2', multiPieceCode: 'CMP-X1', pieceIndex: 2, pieceTotal: 2, amount: '7000' }),
    ]);
    expect(grouped[0].amount).toBe('7000');
  });

  it('merges contents without duplicates', () => {
    const grouped = groupMultiPiece([
      parsed({ tracking: 'YAL-C1', multiPieceCode: 'CMP-X2', pieceIndex: 1, pieceTotal: 2, content: 'TV' }),
      parsed({ tracking: 'YAL-C2', multiPieceCode: 'CMP-X2', pieceIndex: 2, pieceTotal: 2, content: 'TV' }),
    ]);
    expect(grouped[0].content).toBe('TV');
  });
});

describe('toIsoDate', () => {
  it('converts DD-MM-YYYY to ISO', () => {
    expect(toIsoDate('12-05-2026')).toBe('2026-05-12');
  });

  it('rejects malformed dates', () => {
    expect(toIsoDate('2026-05-12')).toBeUndefined();
    expect(toIsoDate('')).toBeUndefined();
  });
});

describe('toAmount', () => {
  it('parses spaced digits', () => {
    expect(toAmount('4 500')).toBe(4500);
  });

  it('returns 0 for absent or invalid values', () => {
    expect(toAmount('')).toBe(0);
    expect(toAmount('0')).toBe(0);
    expect(toAmount('abc')).toBe(0);
  });
});

describe('toImportedParcel', () => {
  it('builds a default-status parcel from a label', () => {
    const built = toImportedParcel(parsed({}), undefined, 5, '2026-05-12T09:00:00.000Z');
    expect(built.status).toBe('no_action');
    expect(built.sortOrder).toBe(5);
    expect(built.amount).toBe(4500);
    expect(built.createdDate).toBe('2026-05-12');
    expect(built.smsSent).toBe(false);
    expect(built.piecesCount).toBe(1);
  });

  it('keeps the original creation time of an existing parcel', () => {
    const existing = parcel({ createdAt: '2026-01-01T00:00:00.000Z', smsSent: true });
    const built = toImportedParcel(parsed({}), existing, 0, '2026-05-12T09:00:00.000Z');
    expect(built.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(built.smsSent).toBe(true);
  });

  it('marks multi-piece groups with their sub-trackings', () => {
    const grouped = groupMultiPiece([
      parsed({ tracking: 'YAL-M1', multiPieceCode: 'CMP-MG', pieceIndex: 1, pieceTotal: 2 }),
      parsed({ tracking: 'YAL-M2', multiPieceCode: 'CMP-MG', pieceIndex: 2, pieceTotal: 2 }),
    ]);
    const built = toImportedParcel(grouped[0], undefined, 0, '2026-05-12T09:00:00.000Z');
    expect(built.isMultiPiece).toBe(true);
    expect(built.piecesCount).toBe(2);
    expect(built.subTrackings).toHaveLength(2);
  });
});

describe('mergeWithArchive', () => {
  it('returns the fresh parcel when the archive has no entry', () => {
    const fresh = parcel({});
    expect(mergeWithArchive(fresh, undefined)).toBe(fresh);
  });

  it('restores sms flags and notes from the archive', () => {
    const fresh = parcel({ smsSent: false, notes: undefined });
    const entry: ArchiveEntry = {
      tracking: 'YAL-TEST0001',
      events: [],
      latest: {
        lastUpdate: '2026-05-10T10:00:00.000Z',
        archivedDate: '2026-05-10',
        status: 'delivered',
        statusUpdatedAt: '2026-05-10T10:00:00.000Z',
        notes: 'left with the neighbour',
        amount: 4500,
        municipality: 'BIR EL DJIR',
        smsSent: true,
        senderSmsSent: false,
        isMultiPiece: false,
        piecesCount: 1,
        subTrackings: [],
        openingAllowed: null,
      },
    };
    const merged = mergeWithArchive(fresh, entry);
    expect(merged.smsSent).toBe(true);
    expect(merged.notes).toBe('left with the neighbour');
    // Fresh PDF data still wins for contact details.
    expect(merged.phone).toBe('0661234567');
    expect(merged.status).toBe('no_action');
  });
});
