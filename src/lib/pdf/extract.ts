import { PDFDocument } from "pdf-lib";

export interface PdfPageExtract {
  pageNumber: number;
  text: string;
  hasEmbeddedText: boolean;
}

export interface PdfExtractionResult {
  totalPages: number;
  pages: PdfPageExtract[];
  hasEmbeddedText: boolean;
}

export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Placeholder implementation. Currently we always fallback to OCR.
 * This keeps API compatibility while we evaluate a Node-friendly text extraction strategy.
 */
export async function extractPdfEmbeddedText(
  input: ArrayBuffer,
): Promise<PdfExtractionResult> {
  const totalPages = await getPdfPageCount(input);
  return {
    totalPages,
    pages: [],
    hasEmbeddedText: false,
  };
}
