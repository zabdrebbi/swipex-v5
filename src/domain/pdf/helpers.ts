import type { PdfTextItem } from './types';

/** One visual line: all items whose baseline y differs by less than `LINE_TOLERANCE`. */
export interface PdfLine {
  y: number;
  text: string;
}

/** Merging tolerance (PDF units) used by v4 to rebuild visual lines. */
export const LINE_TOLERANCE = 5;

/**
 * Merges raw items into visual lines: top-to-bottom, then left-to-right.
 * `y` of a merged line is the y of its first (topmost) item.
 */
export function mergeLines(items: PdfTextItem[]): PdfLine[] {
  const sorted = [...items].sort((a, b) => (b.y !== a.y ? b.y - a.y : a.x - b.x));
  const lines: PdfLine[] = [];
  for (const item of sorted) {
    const text = item.str.trim();
    if (text === '') continue;
    const last = lines[lines.length - 1];
    if (last !== undefined && Math.abs(item.y - last.y) < LINE_TOLERANCE) {
      last.text += ` ${text}`;
    } else {
      lines.push({ y: item.y, text });
    }
  }
  return lines;
}

/**
 * Extracts Algerian mobile numbers from free text: normalises `+213` to `0`,
 * splits on separators, then keeps matches of the canonical 10-digit form.
 */
export function extractPhones(text: string): string[] {
  const normalized = text.replace(/\+213/g, '0');
  const segments = normalized.split(/[\s/\u060C,|]+/);
  const phones: string[] = [];
  for (const segment of segments) {
    const cleaned = segment.replace(/\D/g, '');
    const found = cleaned.match(/0[5-7]\d{8}/g);
    if (found !== null) phones.push(...found);
  }
  return phones;
}

/**
 * Cleans a "municipality, wilaya" line: removes phone numbers, carrier zone
 * codes (`AB12`) and bare wilaya numbers so only the names remain.
 */
export function cleanMunLine(text: string): string {
  let out = text.replace(/\+213/g, '0');
  const segments = out.split(/[\s/\u060C,|]+/);
  for (const segment of segments) {
    const digits = segment.replace(/\D/g, '');
    if (/^0[5-7]\d{8}$/.test(digits)) out = out.replace(segment, '');
  }
  out = out.replace(/\b[A-Z]{2,4}\d{1,2}\b/g, '');
  out = out.replace(/\b([1-9]|[1-4]\d|5[0-8])\b/g, '');
  out = out.replace(/[,\u060C]+/g, ',');
  return out.trim();
}

/** Fixed x of the `Recouvrement` column per half of the sheet (from real labels). */
const RECOUVREMENT_X = { left: 221, right: 516 };
const COLUMN_TOLERANCE = 15;

/**
 * Reads the cash amount by coordinates: the `Recouvrement` line sits at a
 * fixed x (221 left half / 516 right half); when several items share that
 * column, the RIGHTMOST one on the closest line is the amount (content item
 * numbers sit to its left). "Voir pièce N" lines are never amounts.
 */
export function extractAmountByCoords(
  items: PdfTextItem[],
  recY: number,
  isRightQuad: boolean,
): string | null {
  const recX = isRightQuad ? RECOUVREMENT_X.right : RECOUVREMENT_X.left;

  const candidates = items.filter(
    (it) => it.y < recY && it.y > recY - 80 && it.x >= recX - COLUMN_TOLERANCE,
  );
  if (candidates.length === 0) return null;

  const closestY = candidates.reduce((a, b) =>
    Math.abs(a.y - recY) < Math.abs(b.y - recY) ? a : b,
  ).y;

  const sameLine = candidates.filter((it) => Math.abs(it.y - closestY) < 3);
  const target = sameLine
    .filter((it) => /\d/.test(it.str))
    .sort((a, b) => b.x - a.x)[0];
  if (target === undefined) return null;

  const lineText = sameLine.map((it) => it.str).join(' ');
  if (/voir\s*pi[èe]ce/i.test(lineText)) return null;

  const match = target.str.match(/\d[\d\s]*/);
  return match === null ? null : match[0].replace(/\s/g, '');
}
