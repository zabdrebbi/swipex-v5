import type { PdfPageContent, PdfTextItem, ParsedPdfParcel } from './types';
import { cleanMunLine, extractAmountByCoords, extractPhones, mergeLines, type PdfLine } from './helpers';

/** Empty shell used to accumulate one quadrant's fields. */
function emptyParcel(): ParsedPdfParcel {
  return {
    tracking: '',
    type: '',
    sender: '',
    senderAddress: '',
    senderPhone: '',
    senderPhone2: '',
    receiver: '',
    address: '',
    municipality: '',
    wilaya: '',
    phone: '',
    phone2: '',
    pin: '',
    content: '',
    amount: '0',
    createdDate: '',
    multiPieceCode: '',
    pieceIndex: 0,
    pieceTotal: 0,
    pieceTrackings: [],
    openingAllowed: null,
  };
}

const TYPE_KEYWORDS: readonly string[] = [
  'E-COMMERCE',
  'PARTICULIER',
  'ECONOMIQUE',
  'AVEC ÉCHANGE',
  'AVEC ECHANGE',
  'CLASSIQUE',
  'AVEC ACCUSÉ',
  'AVEC ACCUSE',
];

function detectType(lineText: string): string {
  for (const keyword of TYPE_KEYWORDS) {
    if (lineText.includes(keyword)) {
      if (keyword === 'AVEC ÉCHANGE' || keyword === 'AVEC ECHANGE') return 'AVEC ÉCHANGE';
      if (keyword === 'AVEC ACCUSÉ' || keyword === 'AVEC ACCUSE') return 'AVEC ACCUSÉ';
      return keyword;
    }
  }
  return '';
}

/** Skips label noise in the recipient block (wilaya numbers, zone codes, big numbers). */
function isNoiseLine(line: string): boolean {
  const isWilayaNum = /^\d{1,2}$/.test(line) && Number(line) >= 1 && Number(line) <= 58;
  const isZoneCode = /^([A-Z]{2,4}\d{1,2}\s*)+$/.test(line);
  const isBigNum = /^\d{4,}$/.test(line) && !/^0[5-7]\d{8}$/.test(line);
  return isWilayaNum || isZoneCode || isBigNum;
}

/** Recipient block: name, address, municipality/wilaya, phones (v4's 4 steps). */
function parseRecipient(parcel: ParsedPdfParcel, lines: PdfLine[]): void {
  const destIdx = lines.findIndex((l) => l.text.includes('Destinataire'));
  if (destIdx === -1) return;

  const destLines: string[] = [];
  for (let j = destIdx + 1; j < Math.min(destIdx + 11, lines.length); j++) {
    const raw = lines[j].text.trim();
    if (
      raw.includes('Description') ||
      raw.includes('Recouvrement') ||
      raw.includes('Assurance') ||
      raw.includes('trajet') ||
      raw.includes('Expéditeur')
    ) {
      break;
    }
    if (raw === '') continue;
    if (isNoiseLine(raw)) continue;
    const cleaned = raw
      .replace(/\b[A-Z]{2,4}\d{1,2}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned !== '') destLines.push(cleaned);
  }
  if (destLines.length === 0) return;

  // Step 1: phones live on the lowest line of the block.
  let phoneLineIdx = -1;
  for (let j = destLines.length - 1; j >= 0; j--) {
    const phones = extractPhones(destLines[j]);
    if (phones.length > 0) {
      parcel.phone = phones[0];
      if (phones.length > 1) parcel.phone2 = phones[1];
      phoneLineIdx = j;
      break;
    }
  }

  // Step 2: municipality/wilaya sit directly above the phones.
  let munLineIdx = -1;
  if (phoneLineIdx > 0) {
    munLineIdx = phoneLineIdx - 1;
    const parts = cleanMunLine(destLines[munLineIdx])
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 1) parcel.municipality = parts[0];
    if (parts.length >= 2) parcel.wilaya = parts[1];
  } else if (phoneLineIdx === 0) {
    for (let j = 0; j < destLines.length; j++) {
      if (destLines[j].includes(',') || destLines[j].includes('\u060C')) {
        const parts = cleanMunLine(destLines[j])
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 1) parcel.municipality = parts[0];
        if (parts.length >= 2) parcel.wilaya = parts[1];
        munLineIdx = j;
        break;
      }
    }
  }

  // Step 3: the receiver name is the first line.
  parcel.receiver = destLines[0].replace(/^\*+\s*|^\.\s*/, '').trim();

  // Step 4: address = everything between the name and the municipality line.
  const addrEnd = munLineIdx > 0 ? munLineIdx : phoneLineIdx > 0 ? phoneLineIdx : destLines.length;
  if (addrEnd > 1) {
    const parts: string[] = [];
    for (let j = 1; j < addrEnd; j++) {
      const line = destLines[j];
      if (/Autorisation|ouverture|colis/i.test(line)) continue;
      if (line === parcel.municipality || line === parcel.wilaya) continue;
      parts.push(line);
    }
    parcel.address = parts.join(' ').trim();
  }
}

/** Content + amount block that follows the `Recouvrement` label. */
function parseContentAndAmount(
  parcel: ParsedPdfParcel,
  lines: PdfLine[],
  items: PdfTextItem[],
  isRightQuad: boolean,
): void {
  const recIdx = lines.findIndex((l) => l.text.includes('Recouvrement'));
  if (recIdx === -1) return;

  const contentParts: string[] = [];
  for (let j = recIdx + 1; j < lines.length; j++) {
    const line = lines[j].text.trim();
    if (
      line.includes('Assurance') ||
      line.includes('Utilisez') ||
      line.includes('Taille') ||
      line.includes('Moins de') ||
      line.includes('Poids') ||
      /^(OUVERTURE|Autorisation)/i.test(line)
    ) {
      break;
    }
    if (line !== '' && !/^\d[\d\s]*$/.test(line)) contentParts.push(line);
  }
  parcel.content = contentParts
    .join(' ')
    .replace(/\bDA\s*\d[\d\s]*/gi, '')
    .replace(/\d[\d\s]*\s*DA\b/gi, '')
    .trim();

  const byCoords = extractAmountByCoords(items, lines[recIdx].y, isRightQuad);
  if (byCoords !== null) {
    parcel.amount = byCoords;
    return;
  }

  // Fallback: a line that is nothing but an amount (`DA 4000`, `4000 DA`, `4000`).
  for (let j = recIdx + 1; j < Math.min(recIdx + 4, lines.length); j++) {
    const line = lines[j].text.trim();
    if (/voir\s*pi[èe]ce/i.test(line)) continue;
    const match = line.match(/^(DA\s*)?([\d\s]+?)(\s*DA)?$/i);
    if (match !== null) {
      const value = match[2].replace(/\s/g, '');
      if (value !== '') {
        parcel.amount = value;
        return;
      }
    }
  }
}

/** Parses ONE quadrant (= one label) of a page; null when it carries no tracking. */
export function parseQuadrant(
  items: PdfTextItem[],
  isRightQuad: boolean,
): ParsedPdfParcel | null {
  const lines = mergeLines(items);
  if (lines.length < 5) return null;

  // The tracking line is mandatory: without it the quadrant is not a label.
  const trackingLine = lines.find((l) => l.text.includes('YAL-'));
  if (trackingLine === undefined) return null;
  const trackingMatch = trackingLine.text.match(/YAL-[A-Z0-9]+/);
  if (trackingMatch === null) return null;

  const parcel = emptyParcel();
  parcel.tracking = trackingMatch[0];

  const pinMatch = trackingLine.text.match(/PIN:\s*(\d+)/);
  if (pinMatch !== null) parcel.pin = pinMatch[1];

  const quadText = lines.map((l) => l.text).join(' ');
  parcel.openingAllowed = /OUVERTURE\s*AUTORIS[ÉE]E/i.test(quadText);

  const typeLine = lines.find((l) => detectType(l.text) !== '');
  if (typeLine !== undefined) parcel.type = detectType(typeLine.text);

  // Multi-piece: `multi-pièce CMP-SH58HC 1/3` anywhere in the quadrant.
  const multiMatch = quadText.match(/multi[-\s]?pi[èe]ce/i);
  if (multiMatch !== null && multiMatch.index !== undefined) {
    const after = quadText.slice(multiMatch.index);
    const codeMatch = after.match(/([A-Z]{2,5}-[A-Z0-9]{2,12})/);
    if (codeMatch !== null) parcel.multiPieceCode = codeMatch[1];
    const pieceMatch = after.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (pieceMatch !== null) {
      parcel.pieceIndex = Number(pieceMatch[1]);
      parcel.pieceTotal = Number(pieceMatch[2]);
    }
  }

  const expIdx = lines.findIndex((l) => l.text.includes('Expéditeur'));
  if (expIdx !== -1) {
    if (expIdx + 1 < lines.length) parcel.sender = lines[expIdx + 1].text.trim();
    if (expIdx + 2 < lines.length) parcel.senderAddress = lines[expIdx + 2].text.trim();
    if (expIdx + 3 < lines.length) {
      const phones = extractPhones(lines[expIdx + 3].text);
      if (phones.length > 0) parcel.senderPhone = phones[0];
      if (phones.length > 1) parcel.senderPhone2 = phones[1];
    }
  }

  parseRecipient(parcel, lines);
  parseContentAndAmount(parcel, lines, items, isRightQuad);

  const dateLine = lines.find((l) => /\bLe:\s*\d{2}-\d{2}-\d{4}/i.test(l.text));
  if (dateLine !== undefined) {
    const match = dateLine.text.match(/(\d{2}-\d{2}-\d{4})/);
    if (match !== null) parcel.createdDate = match[1];
  }

  return parcel;
}

/** Splits a page into 4 quadrants (2x2 labels) and parses each one. */
export function parsePage(page: PdfPageContent): ParsedPdfParcel[] {
  const raw = page.items.map((it) => it.str).join(' ');
  if (raw.length < 50) return [];

  const midX = page.width / 2;
  const midY = page.height / 2;
  const quadrants: Record<'TL' | 'TR' | 'BL' | 'BR', PdfTextItem[]> = {
    TL: [],
    TR: [],
    BL: [],
    BR: [],
  };

  for (const item of page.items) {
    const text = item.str.trim();
    if (text === '') continue;
    if (item.x < midX && item.y > midY) quadrants.TL.push(item);
    else if (item.x >= midX && item.y > midY) quadrants.TR.push(item);
    else if (item.x < midX && item.y <= midY) quadrants.BL.push(item);
    else quadrants.BR.push(item);
  }

  const parsed: ParsedPdfParcel[] = [];
  for (const key of ['TL', 'TR', 'BL', 'BR'] as const) {
    const parcel = parseQuadrant(quadrants[key], key === 'TR' || key === 'BR');
    if (parcel !== null) parsed.push(parcel);
  }
  return parsed;
}
