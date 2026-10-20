/**
 * Book Segmentation & Structuring Service
 * Detects chapters, sections, headings, and generates the table of contents.
 */

import { BookSection, ExtractedPage } from '../types';

interface DetectedHeading {
  title: string;
  pageNumber: number;
  lineIndex: number;
  confidence: number;
}

// Regex patterns to identify chapter/section titles in French & English
const CHAPTER_PATTERNS = [
  /^(?:chapitre|chapter)\s+([0-9ivxlcdm]+|[a-zÀ-ÿ]+)(?:\s*[:.\-—]\s*(.+))?$/i,
  /^(?:partie|part)\s+([0-9ivxlcdm]+)(?:\s*[:.\-—]\s*(.+))?$/i,
  /^(?:section|module)\s+([0-9ivxlcdm]+)(?:\s*[:.\-—]\s*(.+))?$/i,
  /^(?:introduction|prologue|avant-propos|préface|épilogue|conclusion)(?:\s*[:.\-—]\s*(.+))?$/i,
  /^([0-9]{1,2}\.[0-9]{1,2}(?:\.[0-9]{1,2})?)\s+([A-ZÀ-Ÿ].+)$/,
  /^([ivxlcdm]{1,6}\.)\s+([A-ZÀ-Ÿ].+)$/i,
  /^([0-9]{1,2}\.)\s+([A-ZÀ-Ÿ].+)$/,
];

export function autoSegmentBook(pages: ExtractedPage[]): BookSection[] {
  const headings: DetectedHeading[] = [];

  pages.forEach((page) => {
    const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);

    lines.forEach((line, lineIndex) => {
      // Check if line looks like a chapter/section title
      for (const pattern of CHAPTER_PATTERNS) {
        if (pattern.test(line)) {
          headings.push({
            title: cleanHeadingTitle(line),
            pageNumber: page.pageNumber,
            lineIndex,
            confidence: 0.9,
          });
          return;
        }
      }

      // Check for standalone all-caps short title (between 4 and 60 chars, not just digits)
      if (
        line.length >= 4 &&
        line.length <= 60 &&
        line === line.toUpperCase() &&
        /[A-ZÀ-Ÿ]/.test(line) &&
        !line.startsWith('PAGE ') &&
        !/^[0-9\s.\-_]+$/.test(line)
      ) {
        // High probability if it's near the top of the page
        if (lineIndex < 4) {
          headings.push({
            title: cleanHeadingTitle(line),
            pageNumber: page.pageNumber,
            lineIndex,
            confidence: 0.7,
          });
        }
      }
    });
  });

  // Filter out redundant consecutive headings on the same page or very close
  const uniqueHeadings: DetectedHeading[] = [];
  headings.forEach((h) => {
    const last = uniqueHeadings[uniqueHeadings.length - 1];
    if (!last || last.pageNumber !== h.pageNumber || Math.abs(last.lineIndex - h.lineIndex) > 3) {
      uniqueHeadings.push(h);
    }
  });

  // If headings were found, build sections around them
  if (uniqueHeadings.length >= 2) {
    const sections: BookSection[] = [];
    const totalPages = pages.length;

    for (let i = 0; i < uniqueHeadings.length; i++) {
      const current = uniqueHeadings[i];
      const next = uniqueHeadings[i + 1];
      const pageStart = current.pageNumber;
      const pageEnd = next ? Math.max(pageStart, next.pageNumber - 1) : totalPages;

      // Collect raw text
      const sectionPages = pages.filter(
        (p) => p.pageNumber >= pageStart && p.pageNumber <= pageEnd
      );
      const rawText = sectionPages.map((p) => p.text).join('\n\n');

      sections.push({
        id: `section_${i + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderIndex: i + 1,
        title: current.title,
        pageStart,
        pageEnd,
        rawText,
        charCount: rawText.length,
        status: 'a_traiter',
        humanValidated: false,
        selectedForBatch: true,
      });
    }

    return sections;
  }

  // Fallback: If no distinct headings found, segment by page chunks (~8-12 pages or ~15,000 chars per section)
  return fallbackPageSegmentation(pages);
}

function fallbackPageSegmentation(pages: ExtractedPage[]): BookSection[] {
  const sections: BookSection[] = [];
  const targetCharsPerSection = 14000; // Good chunk size for Gemini prompt & listening
  let currentPages: ExtractedPage[] = [];
  let currentChars = 0;
  let sectionIndex = 1;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    currentPages.push(page);
    currentChars += page.charCount;

    const isLastPage = i === pages.length - 1;
    if (currentChars >= targetCharsPerSection || isLastPage) {
      const pageStart = currentPages[0].pageNumber;
      const pageEnd = currentPages[currentPages.length - 1].pageNumber;
      const rawText = currentPages.map((p) => p.text).join('\n\n');

      const title =
        pageStart === pageEnd
          ? `Section ${sectionIndex} (Page ${pageStart})`
          : `Section ${sectionIndex} (Pages ${pageStart} à ${pageEnd})`;

      sections.push({
        id: `section_${sectionIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderIndex: sectionIndex,
        title,
        pageStart,
        pageEnd,
        rawText,
        charCount: rawText.length,
        status: 'a_traiter',
        humanValidated: false,
        selectedForBatch: true,
      });

      currentPages = [];
      currentChars = 0;
      sectionIndex++;
    }
  }

  return sections;
}

function cleanHeadingTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[:.\-—]\s*/, '')
    .trim();
}

/**
 * Split a section into two at a given midpoint or character split
 */
export function splitSection(
  section: BookSection,
  splitPageIndex: number,
  allPages: ExtractedPage[]
): [BookSection, BookSection] {
  const midPage = Math.max(section.pageStart, Math.min(section.pageEnd, splitPageIndex));
  
  const textPart1 = allPages
    .filter((p) => p.pageNumber >= section.pageStart && p.pageNumber <= midPage)
    .map((p) => p.text)
    .join('\n\n');

  const textPart2 = allPages
    .filter((p) => p.pageNumber > midPage && p.pageNumber <= section.pageEnd)
    .map((p) => p.text)
    .join('\n\n');

  const part1: BookSection = {
    ...section,
    id: `sec_${Date.now()}_1`,
    title: `${section.title} (Partie 1)`,
    pageEnd: midPage,
    rawText: textPart1,
    charCount: textPart1.length,
    status: 'a_traiter',
    humanValidated: false,
  };

  const part2: BookSection = {
    ...section,
    id: `sec_${Date.now()}_2`,
    orderIndex: section.orderIndex + 1,
    title: `${section.title} (Partie 2)`,
    pageStart: midPage + 1,
    rawText: textPart2,
    charCount: textPart2.length,
    status: 'a_traiter',
    humanValidated: false,
  };

  return [part1, part2];
}

/**
 * Merge two adjacent sections
 */
export function mergeSections(
  section1: BookSection,
  section2: BookSection
): BookSection {
  const mergedText = `${section1.rawText}\n\n---\n\n${section2.rawText}`;
  return {
    ...section1,
    id: `sec_${Date.now()}_merged`,
    title: `${section1.title} + ${section2.title}`,
    pageEnd: Math.max(section1.pageEnd, section2.pageEnd),
    rawText: mergedText,
    charCount: mergedText.length,
    status: 'a_traiter',
    humanValidated: false,
    ideaInventory: undefined,
    oralScript: undefined,
    coverageReport: undefined,
    audioBlobId: undefined,
  };
}
