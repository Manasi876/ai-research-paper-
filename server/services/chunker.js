import pdfParse from "pdf-parse/lib/pdf-parse.js";

export class PdfValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "PdfValidationError";
    this.statusCode = statusCode;
  }
}

function cleanFilenameToTitle(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPdfText(buffer, originalFilename) {
  if (!buffer || buffer.length === 0) {
    throw new PdfValidationError("Uploaded PDF file is empty.", 400);
  }

  let data;
  try {
    data = await pdfParse(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to parse PDF";
    throw new PdfValidationError(
      `Could not read PDF file (${msg}). Ensure the file is a valid, unencrypted PDF.`,
      422
    );
  }

  const normalizedText = (data.text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalizedText.length < 40) {
    throw new PdfValidationError(
      "No extractable text found in this PDF. It may be empty or a scanned image-only document without OCR.",
      422
    );
  }

  const rawMetaTitle = typeof data.info?.Title === "string" ? data.info.Title.trim() : "";
  const isGenericTitle =
    !rawMetaTitle ||
    rawMetaTitle.length < 3 ||
    /^(untitled|document|microsoft word|latex)/i.test(rawMetaTitle);

  const title = isGenericTitle ? cleanFilenameToTitle(originalFilename) : rawMetaTitle;
  const pageCount = Math.max(1, data.numpages || 1);

  return {
    title: title || "Untitled Research Paper",
    text: normalizedText,
    pageCount,
  };
}

export function splitTextIntoChunks(text, pageCount, chunkSize = 900, overlap = 160) {
  const chunks = [];
  const totalLength = text.length;

  if (totalLength === 0) return chunks;

  let start = 0;
  let index = 0;

  while (start < totalLength) {
    let end = Math.min(start + chunkSize, totalLength);

    if (end < totalLength) {
      const searchWindowStart = Math.max(start + Math.floor(chunkSize * 0.6), start);
      const windowSlice = text.slice(searchWindowStart, end);

      const sentenceBreak = Math.max(
        windowSlice.lastIndexOf(". "),
        windowSlice.lastIndexOf(".\n"),
        windowSlice.lastIndexOf("? "),
        windowSlice.lastIndexOf("! ")
      );

      if (sentenceBreak !== -1) {
        end = searchWindowStart + sentenceBreak + 1;
      } else {
        const spaceBreak = windowSlice.lastIndexOf(" ");
        if (spaceBreak !== -1) {
          end = searchWindowStart + spaceBreak;
        }
      }
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      const progressRatio = start / totalLength;
      const pageEstimate = Math.min(
        pageCount,
        Math.max(1, Math.floor(progressRatio * pageCount) + 1)
      );
      chunks.push({
        chunkIndex: index,
        pageEstimate,
        content,
        charStart: start,
        charEnd: end,
      });
      index += 1;
    }

    if (end >= totalLength) break;

    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}
