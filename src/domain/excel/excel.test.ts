import { describe, expect, it } from 'vitest';
import ar from '@/i18n/locales/ar';
import en from '@/i18n/locales/en';
import fr from '@/i18n/locales/fr';
import type { TranslationKey } from '@/i18n/keys';
import { normalizeCellKey, parseExcelRows, type ExcelRow } from './parseRows';
import { buildExportRows } from './serialize';
import type { Parcel } from '../parcel/types';
import type { BuiltInStatusKey, StatusRef } from '../status/types';
import { DEFAULT_STATUS } from '../status/statuses';

const NOW = '2026-11-13T10:00:00.000Z';

const t = (key: TranslationKey): string => en.strings[key];

const statusLabel = (ref: StatusRef): string =>
  ref.startsWith('custom:') ? ref : en.strings[`status.${ref}` as TranslationKey];

/** Label -> ref map for built-in statuses, built exactly like the import hook. */
function enStatusMap(...refs: BuiltInStatusKey[]): Map<string, StatusRef> {
  const map = new Map<string, StatusRef>();
  for (const ref of refs) map.set(normalizeCellKey(en.strings[`status.${ref}`]), ref);
  return map;
}

function makeParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    tracking: 'YAL-0000000001',
    receiver: 'Amine',
    phone: '0550123456',
    municipality: 'Bab Ezzouar',
    amount: 1500,
    type: 'E-COMMERCE',
    status: DEFAULT_STATUS,
    statusUpdatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
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

describe('normalizeCellKey', () => {
  it('is case-, accent- and spacing-insensitive', () => {
    expect(normalizeCellKey('  TéléPHONE 2 ')).toBe('telephone2');
    expect(normalizeCellKey('PIN code')).toBe('pincode');
    expect(normalizeCellKey('N°')).toBe('n');
  });
});

describe('parseExcelRows', () => {
  it('parses an English-header row into a full parcel', () => {
    const rows: ExcelRow[] = [
      {
        Tracking: 'YAL-123',
        Phone: '+213550123456',
        Receiver: 'Amine',
        Municipality: 'Bab Ezzouar',
        Wilaya: 'Alger',
        Address: 'Cite A',
        Amount: 2500,
        'Created date': '2026-11-02',
        Status: 'Delivered',
        Pieces: 3,
        'Sub trackings': 'YAL-1 | YAL-2 | YAL-3',
        Opening: 'Yes',
        Notes: 'call after 5pm',
        Tag: 'urgent',
        Content: 'phone case',
        'PIN code': '4589',
        Sender: 'Yacine',
        'Sender phone': '0661234567',
        Reminder: '2026-11-14T08:00:00.000Z',
      },
    ];
    const result = parseExcelRows(rows, { statusByText: enStatusMap('delivered'), now: NOW });

    expect(result.total).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.unmatchedStatuses).toBe(0);
    const parcel = result.parcels[0];
    expect(parcel.tracking).toBe('YAL-123');
    expect(parcel.phone).toBe('0550123456');
    expect(parcel.amount).toBe(2500);
    expect(parcel.createdDate).toBe('2026-11-02');
    expect(parcel.status).toBe('delivered');
    expect(parcel.piecesCount).toBe(3);
    expect(parcel.isMultiPiece).toBe(true);
    expect(parcel.subTrackings.map((piece) => piece.tracking)).toEqual([
      'YAL-1',
      'YAL-2',
      'YAL-3',
    ]);
    expect(parcel.openingAllowed).toBe(true);
    expect(parcel.notes).toBe('call after 5pm');
    expect(parcel.tag).toBe('urgent');
    expect(parcel.content).toBe('phone case');
    expect(parcel.pin).toBe('4589');
    expect(parcel.wilaya).toBe('Alger');
    expect(parcel.sender).toBe('Yacine');
    expect(parcel.senderPhone).toBe('0661234567');
    expect(parcel.reminderTime).toBe('2026-11-14T08:00:00.000Z');
    expect(parcel.createdAt).toBe(NOW);
    expect(parcel.sortOrder).toBe(0);
  });

  it('matches Arabic headers and Arabic status labels', () => {
    const rows: ExcelRow[] = [
      {
        [ar.strings['excel.col_tracking']]: 'YAL-789',
        [ar.strings['excel.col_phone']]: '0550123456',
        [ar.strings['excel.col_receiver']]: 'Sami',
        [ar.strings['excel.col_municipality']]: 'Oran',
        [ar.strings['excel.col_amount']]: 900,
        [ar.strings['excel.col_status']]: ar.strings['status.delivered'],
      },
    ];
    const statusByText = new Map<string, StatusRef>([
      [normalizeCellKey(ar.strings['status.delivered']), 'delivered'],
    ]);
    const { parcels } = parseExcelRows(rows, { statusByText, now: NOW });

    expect(parcels).toHaveLength(1);
    expect(parcels[0].tracking).toBe('YAL-789');
    expect(parcels[0].municipality).toBe('Oran');
    expect(parcels[0].amount).toBe(900);
    expect(parcels[0].status).toBe('delivered');
  });

  it('matches French headers and French status labels', () => {
    const rows: ExcelRow[] = [
      {
        'Numéro de suivi': 'YAL-9',
        Téléphone: '0550123456',
        Destinataire: 'Karim',
        Montant: 1200,
        Statut: fr.strings['status.delivered'],
        Ouverture: fr.strings['excel.no'],
      },
    ];
    const statusByText = new Map<string, StatusRef>([
      [normalizeCellKey(fr.strings['status.delivered']), 'delivered'],
    ]);
    const { parcels } = parseExcelRows(rows, { statusByText, now: NOW });

    expect(parcels[0].tracking).toBe('YAL-9');
    expect(parcels[0].status).toBe('delivered');
    expect(parcels[0].amount).toBe(1200);
    expect(parcels[0].openingAllowed).toBe(false);
  });

  it('skips rows without a tracking number', () => {
    const rows: ExcelRow[] = [
      { Receiver: 'No tracking here', Phone: '0550123456' },
      { Tracking: 'YAL-1', Receiver: 'Kept' },
      {},
    ];
    const result = parseExcelRows(rows, { statusByText: new Map(), now: NOW });

    expect(result.total).toBe(3);
    expect(result.skipped).toBe(2);
    expect(result.parcels).toHaveLength(1);
    expect(result.parcels[0].tracking).toBe('YAL-1');
  });

  it('falls back to the default status for unknown or empty status text', () => {
    const rows: ExcelRow[] = [
      { Tracking: 'YAL-1', Status: 'Not a status' },
      { Tracking: 'YAL-2' },
      { Tracking: 'YAL-3', Status: 'Delivered' },
    ];
    const result = parseExcelRows(rows, { statusByText: enStatusMap(), now: NOW });

    expect(result.parcels.map((parcel) => parcel.status)).toEqual([
      DEFAULT_STATUS,
      DEFAULT_STATUS,
      DEFAULT_STATUS,
    ]);
    expect(result.unmatchedStatuses).toBe(2);
  });

  it('resolves a custom status name', () => {
    const statusByText = enStatusMap();
    statusByText.set(normalizeCellKey('Expr\u00E8s 24h'), 'custom:cs_x1');
    const rows: ExcelRow[] = [{ Tracking: 'YAL-1', Status: 'Expr\u00E8s 24h' }];
    const { parcels, unmatchedStatuses } = parseExcelRows(rows, {
      statusByText,
      now: NOW,
    });

    expect(parcels[0].status).toBe('custom:cs_x1');
    expect(unmatchedStatuses).toBe(0);
  });

  it('parses dates from serials, Date cells and DD-MM-YYYY text', () => {
    const serial = (Date.UTC(2026, 10, 13) - Date.UTC(1899, 11, 30)) / 86_400_000;
    const rows: ExcelRow[] = [
      { Tracking: 'YAL-1', 'Created date': serial },
      { Tracking: 'YAL-2', 'Created date': new Date(Date.UTC(2026, 10, 13)) },
      { Tracking: 'YAL-3', 'Created date': '13-11-2026' },
      { Tracking: 'YAL-4', 'Created date': 'not a date' },
    ];
    const { parcels } = parseExcelRows(rows, { statusByText: new Map(), now: NOW });

    expect(parcels[0].createdDate).toBe('2026-11-13');
    expect(parcels[1].createdDate).toBe('2026-11-13');
    expect(parcels[2].createdDate).toBe('2026-11-13');
    expect(parcels[3].createdDate).toBeUndefined();
  });

  it('normalizes phone numbers and drops unreadable ones', () => {
    const rows: ExcelRow[] = [
      { Tracking: 'YAL-1', Phone: '+213550123456' },
      { Tracking: 'YAL-2', Phone: '213661234567' },
      { Tracking: 'YAL-3', Phone: 'not a phone' },
      { Tracking: 'YAL-4', Phone: '0661234567', 'Phone 2': '0550987654' },
    ];
    const { parcels } = parseExcelRows(rows, { statusByText: new Map(), now: NOW });

    expect(parcels[0].phone).toBe('0550123456');
    expect(parcels[1].phone).toBe('0661234567');
    expect(parcels[2].phone).toBe('');
    expect(parcels[3].phone).toBe('0661234567');
    expect(parcels[3].phone2).toBe('0550987654');
  });

  it('reads opening-allowed cells in every app language', () => {
    const rows: ExcelRow[] = [
      { Tracking: 'YAL-1', Opening: ar.strings['excel.yes'] },
      { Tracking: 'YAL-2', Opening: ar.strings['excel.no'] },
      { Tracking: 'YAL-3', Opening: '' },
      { Tracking: 'YAL-4' },
    ];
    const { parcels } = parseExcelRows(rows, { statusByText: new Map(), now: NOW });

    expect(parcels[0].openingAllowed).toBe(true);
    expect(parcels[1].openingAllowed).toBe(false);
    expect(parcels[2].openingAllowed).toBeNull();
    expect(parcels[3].openingAllowed).toBeNull();
  });

  it('derives pieces from the sub-trackings when the count cell is missing', () => {
    const rows: ExcelRow[] = [{ Tracking: 'YAL-1', 'Sub trackings': 'YAL-1|YAL-2' }];
    const { parcels } = parseExcelRows(rows, { statusByText: new Map(), now: NOW });

    expect(parcels[0].piecesCount).toBe(2);
    expect(parcels[0].isMultiPiece).toBe(true);
    expect(parcels[0].subTrackings).toHaveLength(2);
  });
});

describe('buildExportRows', () => {
  it('serializes every parcel column under translated headers', () => {
    const parcel = makeParcel({
      pin: '1234',
      content: 'TV',
      wilaya: 'Alger',
      address: 'Rue 1',
      phone2: '0661234567',
      sender: 'Ali',
      senderAddress: 'Rue 2',
      senderPhone: '0770123456',
      senderPhone2: '0550987654',
      notes: 'note',
      tag: 'vip',
      reminderTime: '2026-11-14T08:00:00.000Z',
      createdDate: '2026-11-02',
      piecesCount: 2,
      subTrackings: [{ tracking: 'YAL-1' }, { tracking: 'YAL-2' }],
      isMultiPiece: true,
      openingAllowed: true,
      status: 'delivered',
    });
    const rows = buildExportRows([parcel], t, statusLabel);
    const row = rows[0];

    expect(Object.keys(row)).toHaveLength(24);
    expect(row[en.strings['excel.col_order']]).toBe(1);
    expect(row[en.strings['excel.col_tracking']]).toBe('YAL-0000000001');
    expect(row[en.strings['excel.col_status']]).toBe('Delivered');
    expect(row[en.strings['excel.col_opening']]).toBe('Yes');
    expect(row[en.strings['excel.col_subtrackings']]).toBe('YAL-1 | YAL-2');
    expect(row[en.strings['excel.col_pieces']]).toBe(2);
    expect(row[en.strings['excel.col_amount']]).toBe(1500);
    expect(row[en.strings['excel.col_created']]).toBe('2026-11-02');
    expect(row[en.strings['excel.col_reminder']]).toBe('2026-11-14T08:00:00.000Z');
    expect(row[en.strings['excel.col_sender_phone2']]).toBe('0550987654');
  });

  it('round-trips an export through the parser', () => {
    const original = [
      makeParcel({ status: 'delivered', createdDate: '2026-11-02', openingAllowed: null }),
      makeParcel({
        tracking: 'YAL-2',
        piecesCount: 3,
        subTrackings: [{ tracking: 'YAL-A' }, { tracking: 'YAL-B' }, { tracking: 'YAL-C' }],
        isMultiPiece: true,
        openingAllowed: false,
        amount: 0,
      }),
    ];
    const rows = buildExportRows(original, t, statusLabel);
    const statusByText = enStatusMap('delivered', 'no_action');
    const { parcels, unmatchedStatuses } = parseExcelRows(rows, { statusByText, now: NOW });

    expect(unmatchedStatuses).toBe(0);
    expect(parcels.map((parcel) => parcel.tracking)).toEqual(['YAL-0000000001', 'YAL-2']);
    expect(parcels[0].status).toBe('delivered');
    expect(parcels[0].receiver).toBe('Amine');
    expect(parcels[0].phone).toBe('0550123456');
    expect(parcels[0].createdDate).toBe('2026-11-02');
    expect(parcels[0].openingAllowed).toBeNull();
    expect(parcels[0].amount).toBe(1500);
    expect(parcels[1].status).toBe('no_action');
    expect(parcels[1].amount).toBe(0);
    expect(parcels[1].piecesCount).toBe(3);
    expect(parcels[1].isMultiPiece).toBe(true);
    expect(parcels[1].openingAllowed).toBe(false);
    expect(parcels[1].subTrackings.map((piece) => piece.tracking)).toEqual([
      'YAL-A',
      'YAL-B',
      'YAL-C',
    ]);
  });
});
