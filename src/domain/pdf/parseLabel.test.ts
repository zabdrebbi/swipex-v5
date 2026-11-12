import { describe, expect, it } from 'vitest';
import { parsePage, parseQuadrant } from './parseLabel';
import type { PdfPageContent, PdfTextItem } from './types';

/** Sheet geometry used by v4: A4-ish, four labels per page (2x2). */
const PAGE_W = 595;
const PAGE_H = 842;

/**
 * Builds one synthetic label as raw items, positioned inside a quadrant.
 * Coordinates mirror a real Yalidine label: tracking/PIN line at the top,
 * sender block, recipient block, then content + Recouvrement column.
 * `shiftX` moves the label to the right half (column x = 221 + 295).
 */
function labelItems(options: {
  tracking: string;
  shiftX?: number;
  shiftY?: number;
  multiPiece?: string;
  phone?: string;
  amount?: string;
}): PdfTextItem[] {
  const dx = options.shiftX ?? 0;
  const dy = options.shiftY ?? 0;
  const phone = options.phone ?? '0661234567';
  const amount = options.amount ?? '4500';
  const at = (str: string, x: number, y: number): PdfTextItem => ({
    str,
    x: x + dx,
    y: y + dy,
  });

  const items: PdfTextItem[] = [
    at(`YAL-${options.tracking}`, 30, 800),
    at('PIN: 4781', 140, 800),
    at('Le: 12-05-2026', 30, 790),
    at('E-COMMERCE', 30, 780),
    at('Expéditeur', 30, 760),
    at('BOUTIQUE TEST', 30, 750),
    at('RUE DES FRERES 12', 30, 740),
    at('0770112233', 30, 730),
    at('Destinataire', 30, 720),
    at('KHELIL MOHAMED', 30, 710),
    at('CITE 123 BLOC C', 30, 700),
    at('BIR EL DJIR, ORAN', 30, 690),
    at(phone, 30, 680),
    at('Description du contenu', 30, 660),
    at('Recouvrement', 30, 640),
    at('1 x PANTALON TAILLE 40', 30, 630),
    at(amount, 221, 620),
    at('Assurance 0 DA', 30, 610),
    at('OUVERTURE AUTORISÉE', 30, 600),
  ];
  if (options.multiPiece !== undefined) {
    items.push(at(`multi-pièce ${options.multiPiece}`, 30, 770));
  }
  return items;
}

function page(items: PdfTextItem[]): PdfPageContent {
  return { width: PAGE_W, height: PAGE_H, items };
}

describe('parseQuadrant', () => {
  it('parses every field of a full label', () => {
    const parcel = parseQuadrant(labelItems({ tracking: 'A1B2C3D4' }), false);
    expect(parcel).not.toBeNull();
    expect(parcel?.tracking).toBe('YAL-A1B2C3D4');
    expect(parcel?.pin).toBe('4781');
    expect(parcel?.type).toBe('E-COMMERCE');
    expect(parcel?.createdDate).toBe('12-05-2026');
    expect(parcel?.sender).toBe('BOUTIQUE TEST');
    expect(parcel?.senderPhone).toBe('0770112233');
    expect(parcel?.receiver).toBe('KHELIL MOHAMED');
    expect(parcel?.address).toBe('CITE 123 BLOC C');
    expect(parcel?.municipality).toBe('BIR EL DJIR');
    expect(parcel?.wilaya).toBe('ORAN');
    expect(parcel?.phone).toBe('0661234567');
    expect(parcel?.content).toContain('PANTALON');
    expect(parcel?.amount).toBe('4500');
    expect(parcel?.openingAllowed).toBe(true);
  });

  it('returns null when the quadrant has no tracking line', () => {
    const items = labelItems({ tracking: 'X1Y2Z3W4' }).filter((i) => !i.str.includes('YAL-'));
    expect(parseQuadrant(items, false)).toBeNull();
  });

  it('reads the Recouvrement amount from the right half column', () => {
    // Right half: the fixed amount column sits at x = 516 (221 + 295).
    const parcel = parseQuadrant(labelItems({ tracking: 'R1R2R3R4', shiftX: 295 }), true);
    expect(parcel?.amount).toBe('4500');
  });

  it('captures the multi-piece code and piece index', () => {
    const parcel = parseQuadrant(
      labelItems({ tracking: 'M1M2M3M4', multiPiece: 'CMP-SH58HC 1/3' }),
      false,
    );
    expect(parcel?.multiPieceCode).toBe('CMP-SH58HC');
    expect(parcel?.pieceIndex).toBe(1);
    expect(parcel?.pieceTotal).toBe(3);
  });

  it('marks forbidden opening only when the label says so', () => {
    const items = labelItems({ tracking: 'O1O2O3O4' }).filter(
      (i) => !i.str.includes('OUVERTURE'),
    );
    const parcel = parseQuadrant(items, false);
    expect(parcel?.openingAllowed).toBe(false);
  });
});

describe('parsePage', () => {
  it('splits a sheet into four quadrants', () => {
    const items = [
      ...labelItems({ tracking: 'Q1T2L3K4' }), // top-left
      ...labelItems({ tracking: 'Q1T2R3K4', shiftX: 295 }), // top-right
      ...labelItems({ tracking: 'Q1B2L3K4', shiftY: -421 }), // bottom-left
      ...labelItems({ tracking: 'Q1B2R3K4', shiftX: 295, shiftY: -421 }), // bottom-right
    ];
    const parsed = parsePage(page(items));
    expect(parsed.map((p) => p.tracking)).toEqual([
      'YAL-Q1T2L3K4',
      'YAL-Q1T2R3K4',
      'YAL-Q1B2L3K4',
      'YAL-Q1B2R3K4',
    ]);
  });

  it('ignores a page with almost no text', () => {
    expect(parsePage(page([{ str: 'empty', x: 10, y: 10 }]))).toEqual([]);
  });

  it('keeps the right-half labels out of the left column', () => {
    const parsed = parsePage(
      page(labelItems({ tracking: 'S1S2S3S4', shiftX: 295 })),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].amount).toBe('4500');
  });
});
