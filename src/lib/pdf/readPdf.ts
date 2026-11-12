import * as pdfjs from 'pdfjs-dist';
// Vite resolves this to a bundled worker asset URL (no CDN, works offline).
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PdfPageContent, PdfTextItem } from '@/domain/pdf/types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Page-by-page extraction of positioned text items (the parser's raw input). */
export async function readPdfPages(
  file: File,
  onPage?: (current: number, total: number) => void,
): Promise<PdfPageContent[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const pages: PdfPageContent[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onPage?.(pageNumber, pdf.numPages);
    const page = await pdf.getPage(pageNumber);
    const [textContent, viewport] = await Promise.all([
      page.getTextContent(),
      Promise.resolve(page.getViewport({ scale: 1 })),
    ]);

    const items: PdfTextItem[] = [];
    for (const item of textContent.items) {
      // pdfjs emits two shapes; only text items carry `str`.
      if (!('str' in item)) continue;
      const str = item.str;
      if (str.trim() === '') continue;
      items.push({ str, x: item.transform[4], y: item.transform[5] });
    }
    pages.push({ width: viewport.width, height: viewport.height, items });
  }

  await pdf.destroy();
  return pages;
}
