import type { TranslationKey } from '../../i18n/keys';
import type { Parcel } from '../parcel/types';
import type { StatusRef } from '../status/types';
import type { ExcelRow } from './parseRows';

type Translate = (key: TranslationKey) => string;

/**
 * Serializes the active list for `.xlsx` export: one object per parcel, keyed
 * by the translated column header (v4's column set plus wilaya and pieces).
 * Re-importing this output must restore every column (round-trip backup).
 */
export function buildExportRows(
  parcels: readonly Parcel[],
  t: Translate,
  statusLabel: (ref: StatusRef) => string,
): ExcelRow[] {
  const h = {
    order: t('excel.col_order'),
    tracking: t('excel.col_tracking'),
    type: t('excel.col_type'),
    pin: t('excel.col_pin'),
    content: t('excel.col_content'),
    amount: t('excel.col_amount'),
    created: t('excel.col_created'),
    receiver: t('excel.col_receiver'),
    address: t('excel.col_address'),
    municipality: t('excel.col_municipality'),
    wilaya: t('excel.col_wilaya'),
    phone: t('excel.col_phone'),
    phone2: t('excel.col_phone2'),
    sender: t('excel.col_sender'),
    senderAddress: t('excel.col_sender_address'),
    senderPhone: t('excel.col_sender_phone'),
    senderPhone2: t('excel.col_sender_phone2'),
    status: t('excel.col_status'),
    notes: t('excel.col_notes'),
    reminder: t('excel.col_reminder'),
    tag: t('excel.col_tag'),
    pieces: t('excel.col_pieces'),
    subTrackings: t('excel.col_subtrackings'),
    opening: t('excel.col_opening'),
  };
  const yes = t('excel.yes');
  const no = t('excel.no');

  return parcels.map((parcel, index) => ({
    [h.order]: index + 1,
    [h.tracking]: parcel.tracking,
    [h.type]: parcel.type,
    [h.pin]: parcel.pin ?? '',
    [h.content]: parcel.content ?? '',
    [h.amount]: parcel.amount,
    [h.created]: parcel.createdDate ?? parcel.createdAt.slice(0, 10),
    [h.receiver]: parcel.receiver,
    [h.address]: parcel.address ?? '',
    [h.municipality]: parcel.municipality,
    [h.wilaya]: parcel.wilaya ?? '',
    [h.phone]: parcel.phone,
    [h.phone2]: parcel.phone2 ?? '',
    [h.sender]: parcel.sender ?? '',
    [h.senderAddress]: parcel.senderAddress ?? '',
    [h.senderPhone]: parcel.senderPhone ?? '',
    [h.senderPhone2]: parcel.senderPhone2 ?? '',
    [h.status]: statusLabel(parcel.status),
    [h.notes]: parcel.notes ?? '',
    [h.reminder]: parcel.reminderTime ?? '',
    [h.tag]: parcel.tag ?? '',
    [h.pieces]: parcel.piecesCount,
    [h.subTrackings]: parcel.subTrackings.map((piece) => piece.tracking).join(' | '),
    [h.opening]:
      parcel.openingAllowed === null ? '' : parcel.openingAllowed ? yes : no,
  }));
}
