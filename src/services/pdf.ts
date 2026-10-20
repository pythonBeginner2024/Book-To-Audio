/**
 * Local PDF text extraction service using PDF.js.
 * Operates 100% locally in the browser with no external OCR server.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedPage } from '../types';

// Configure PDF.js worker
try {
  // Use Vite's worker import mechanism
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  // Fallback to official cdnjs worker if dynamic URL fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
}

export interface ExtractionProgressCallback {
  (currentPage: number, totalPages: number, pageTextLength: number): void;
}

export interface PdfExtractionResult {
  filename: string;
  fileSizeBytes: number;
  totalPages: number;
  extractedPages: ExtractedPage[];
  totalChars: number;
  isScannedOrInsufficient: boolean;
  warningMessage?: string;
}

export async function extractPdfText(
  file: File,
  onProgress?: ExtractionProgressCallback
): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const extractedPages: ExtractedPage[] = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by line position to preserve structural line breaks & paragraphs
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      hasEOL?: boolean;
    }>;

    let pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of items) {
      if (!('str' in item)) continue;
      const text = item.str;
      const y = item.transform ? Math.round(item.transform[5]) : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
        // Vertical distance indicates a new line
        if (currentLine.trim().length > 0) {
          pageLines.push(currentLine.trim());
        }
        currentLine = text;
      } else {
        currentLine += (currentLine.length > 0 && !currentLine.endsWith(' ') && !text.startsWith(' ') ? ' ' : '') + text;
      }

      if (y !== null) {
        lastY = y;
      }
    }

    if (currentLine.trim().length > 0) {
      pageLines.push(currentLine.trim());
    }

    const pageText = pageLines.join('\n');
    const charCount = pageText.trim().length;
    totalChars += charCount;

    // Detect if a page has suspiciously low text (under 40 chars, likely image or blank)
    const hasInsufficientText = charCount < 40;

    extractedPages.push({
      pageNumber: pageNum,
      text: pageText,
      charCount,
      hasInsufficientText,
    });

    if (onProgress) {
      onProgress(pageNum, totalPages, charCount);
    }

    // Small yield to UI thread every few pages to keep the UI smooth
    if (pageNum % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Scanned PDF detection: if total characters is under 300 or average chars per page is < 60
  const avgCharsPerPage = totalPages > 0 ? totalChars / totalPages : 0;
  const isScannedOrInsufficient = totalChars < 300 || avgCharsPerPage < 50;

  let warningMessage: string | undefined;
  if (isScannedOrInsufficient) {
    warningMessage = 
      "Ce fichier PDF semble être composé d'images scannées ou contient trop peu de texte textuel extractible. " +
      "L'application effectue l'extraction localement dans le navigateur et n'embarque pas d'OCR lourd. " +
      "Veuillez utiliser un PDF contenant une couche de texte sélectionnable (PDF natif ou préalablement océrisé).";
  }

  return {
    filename: file.name,
    fileSizeBytes: file.size,
    totalPages,
    extractedPages,
    totalChars,
    isScannedOrInsufficient,
    warningMessage,
  };
}
