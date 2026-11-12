import type { SubPiece } from '../parcel/types';

/**
 * Raw text item as extracted by pdfjs from one PDF page: the string plus its
 * baseline position in PDF user-space coordinates (origin bottom-left).
 */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

/** One page of extracted items with the page size (for quadrant splitting). */
export interface PdfPageContent {
  width: number;
  height: number;
  items: PdfTextItem[];
}

/** Raw label data parsed from a single quadrant, before multi-piece grouping. */
export interface ParsedPdfParcel {
  tracking: string;
  type: string;
  sender: string;
  senderAddress: string;
  senderPhone: string;
  senderPhone2: string;
  receiver: string;
  address: string;
  municipality: string;
  wilaya: string;
  phone: string;
  phone2: string;
  pin: string;
  content: string;
  /** Cash amount as printed on the label; '' or '0' means none. */
  amount: string;
  /** Label date `DD-MM-YYYY` as printed. */
  createdDate: string;
  /** Multi-piece group code (e.g. `CMP-SH58HC`); '' for standalone labels. */
  multiPieceCode: string;
  pieceIndex: number;
  pieceTotal: number;
  /** Individual `YAL-` numbers of a group (filled by `groupMultiPiece`). */
  pieceTrackings: SubPiece[];
  /** null = the label does not say (older labels). */
  openingAllowed: boolean | null;
}
