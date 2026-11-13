import ar from '../../i18n/locales/ar';
import { normalizeCellKey } from './cells';

/** The parcel fields an imported row may carry (the `order` column is display-only). */
export type ExcelField =
  | 'tracking'
  | 'type'
  | 'pin'
  | 'content'
  | 'amount'
  | 'createdDate'
  | 'receiver'
  | 'address'
  | 'municipality'
  | 'wilaya'
  | 'phone'
  | 'phone2'
  | 'sender'
  | 'senderAddress'
  | 'senderPhone'
  | 'senderPhone2'
  | 'status'
  | 'notes'
  | 'reminderTime'
  | 'tag'
  | 'piecesCount'
  | 'subTrackings'
  | 'openingAllowed';

/** Claim order: when two fields accept the same header, the earlier one wins. */
const FIELD_ORDER: readonly ExcelField[] = [
  'tracking',
  'type',
  'pin',
  'content',
  'amount',
  'createdDate',
  'receiver',
  'address',
  'municipality',
  'wilaya',
  'phone',
  'phone2',
  'sender',
  'senderAddress',
  'senderPhone',
  'senderPhone2',
  'status',
  'notes',
  'reminderTime',
  'tag',
  'piecesCount',
  'subTrackings',
  'openingAllowed',
];

/**
 * Arabic header spellings come from the locale file (never inlined here, per
 * the i18n check) and match both this app's exports and v4's export columns.
 */
const AR = ar.strings;

/**
 * Accepted header spellings per field: ar/fr/en variants (v4's convention)
 * plus this app's own export headers, so an export re-imports cleanly.
 */
const ALIASES: Record<ExcelField, readonly string[]> = {
  tracking: ['tracking', 'numéro de suivi', 'n° de suivi', 'n°', 'suivi', 'track', AR['excel.col_tracking']],
  type: ['type', 'type de colis', AR['excel.col_type']],
  pin: ['pin', 'code pin', 'pin code', 'code de sécurité', AR['excel.col_pin']],
  content: ['content', 'contenu', AR['excel.col_content']],
  amount: ['amount', 'montant', AR['excel.col_amount']],
  createdDate: ['created date', 'date de création', 'date', AR['excel.col_created']],
  receiver: ['receiver', 'destinataire', 'nom du destinataire', 'nom', AR['excel.col_receiver']],
  address: ['address', 'adresse', AR['excel.col_address']],
  municipality: ['municipality', 'commune', AR['excel.col_municipality']],
  wilaya: ['wilaya', AR['excel.col_wilaya']],
  phone: [
    'phone',
    'phone number',
    'numéro',
    'numero',
    'num',
    'téléphone',
    'telephone',
    'tel',
    'gsm',
    AR['excel.col_phone'],
  ],
  phone2: [
    'phone2',
    'phone 2',
    'numéro 2',
    'numero 2',
    'téléphone 2',
    'telephone 2',
    AR['excel.col_phone2'],
  ],
  sender: ['sender', 'expéditeur', 'expediteur', 'nom expediteur', AR['excel.col_sender']],
  senderAddress: ['sender address', 'adresse expediteur', AR['excel.col_sender_address']],
  senderPhone: [
    'sender phone',
    'telephone expediteur',
    'tel expediteur',
    AR['excel.col_sender_phone'],
  ],
  senderPhone2: [
    'sender phone 2',
    'telephone expediteur 2',
    AR['excel.col_sender_phone2'],
  ],
  status: ['status', 'statut', AR['excel.col_status']],
  notes: ['notes', 'note', 'remarques', AR['excel.col_notes']],
  reminderTime: ['reminder', 'reminder time', 'rappel', AR['excel.col_reminder']],
  tag: ['tag', AR['excel.col_tag']],
  piecesCount: ['pieces', 'nombre de pieces', 'piece count', AR['excel.col_pieces']],
  subTrackings: [
    'sub trackings',
    'subtrackings',
    'sous numeros',
    'sous numeros de suivi',
    'sub numbers',
    AR['excel.col_subtrackings'],
  ],
  openingAllowed: [
    'opening',
    'opening allowed',
    'ouverture',
    'ouverture autorisee',
    AR['excel.col_opening'],
  ],
};

/** Maps normalized header text -> the original column key of the first match. */
export function buildFieldIndex(headers: string[]): Map<ExcelField, string> {
  const aliasKeys = new Map<ExcelField, Set<string>>();
  for (const field of FIELD_ORDER) {
    aliasKeys.set(field, new Set(ALIASES[field].map(normalizeCellKey)));
  }
  const index = new Map<ExcelField, string>();
  const claimed = new Set<string>();
  for (const header of headers) {
    const key = normalizeCellKey(header);
    if (key === '' || claimed.has(key)) continue;
    for (const field of FIELD_ORDER) {
      if (aliasKeys.get(field)?.has(key) === true) {
        index.set(field, header);
        claimed.add(key);
        break;
      }
    }
  }
  return index;
}
