const fs = require('fs/promises');
const path = require('path');
const ApiError = require('../utils/ApiError');
const { recognizeImage } = require('./ocrService');

/**
 * pdf-parse@1.x has a side effect in its index: it `require`s a bundled test
 * PDF when the module loads outside of a bundler. Requiring the implementation
 * file directly skips that.
 */
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const mammoth = require('mammoth');

/** Minimum characters for a document to be considered real CV text. */
const MIN_USABLE_CHARS = 200;

/**
 * Normalise text extracted from PDFs/DOCX:
 *  - de-hyphenate words split across line breaks ("data-\nbase" -> "database")
 *  - collapse runs of whitespace while preserving paragraph breaks
 *  - strip control characters that break downstream tokenisation
 */
/** Matches C0/C1 control characters except tab (\x09), LF (\x0A) and CR (\x0D). */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const normalise = (raw) =>
  raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00AD/g, '') // soft hyphen
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, '$1$2') // de-hyphenate line-broken words
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, ' \n ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

/** Verify the file's magic bytes match the extension it was uploaded as. */
const sniffType = async (filePath) => {
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buf, 0, 8, 0);
    const header = buf.subarray(0, bytesRead);

    if (header.subarray(0, 5).toString() === '%PDF-') return 'pdf';

    // DOCX/XLSX/PPTX are ZIP archives: "PK\x03\x04"
    if (header[0] === 0x50 && header[1] === 0x4b) return 'docx';

    // Legacy .doc is OLE2 compound file: D0 CF 11 E0 A1 B1 1A E1
    if (header.toString('hex').startsWith('d0cf11e0a1b11ae1')) return 'doc';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header.toString('hex').startsWith('89504e470d0a1a0a')) return 'png';

    // JPEG: FF D8 FF
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'jpg';

    return 'unknown';
  } finally {
    await handle.close();
  }
};

const extractDocx = async (filePath) => {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value;
};

/**
 * Legacy .doc (binary Word 97-2003) has no reliable pure-JS parser. Rather
 * than silently returning garbage, surface an actionable message.
 */
const extractDoc = async () => {
  throw ApiError.badRequest(
    'Legacy .doc files are not supported. Please re-save your CV as .docx or PDF and try again.'
  );
};

/**
 * Extract plain text from an uploaded CV.
 *
 * @param {string} filePath Absolute path on disk.
 * @returns {Promise<{text: string, pages?: number, charCount: number, type: string, ocr?: object}>}
 */
const extractText = async (filePath) => {
  const detected = await sniffType(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isImage = detected === 'png' || detected === 'jpg';

  if (detected === 'unknown' && ext !== '.doc') {
    throw ApiError.badRequest(
      'That file does not look like a valid PDF, Word document or image. It may be corrupted or renamed.'
    );
  }

  let text;
  let ocr;

  try {
    if (isImage) {
      // Magic bytes win over the extension, so a .png that is really a PDF is
      // parsed as a PDF and a .pdf that is really a JPEG goes through OCR.
      ocr = await recognizeImage(filePath);
      text = ocr.text;
    } else if (detected === 'pdf' || ext === '.pdf') {
      // pdf-parse wants a Buffer, not a path.
      const data = await fs.readFile(filePath);
      text = (await pdfParse(data)).text;
    } else if (detected === 'docx' || ext === '.docx') {
      text = await extractDocx(filePath);
    } else {
      text = await extractDoc();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[extractText] parse failed:', err.message);
    throw ApiError.badRequest(
      'We could not read that document. If it is password-protected or scanned as an image, please upload a text-based PDF or .docx version.'
    );
  }

  const normalised = normalise(text || '');

  if (normalised.length < MIN_USABLE_CHARS) {
    // OCR on a photo of a CV usually yields plenty of text, so a short result
    // means the image was blank, blurred, or not a CV at all.
    throw ApiError.badRequest(
      isImage
        ? `Only ${normalised.length} characters were recognised in that image. Try a sharper, well-lit photo with the CV filling the frame, or upload a text-based PDF.`
        : `Very little text was found in that file (${normalised.length} characters). If your CV is a scanned image, an Applicant Tracking System cannot read it either — export a text-based PDF instead.`
    );
  }

  return {
    text: normalised,
    charCount: normalised.length,
    type: isImage ? 'image' : detected,
    ...(ocr ? { ocr: { confidence: ocr.confidence, durationMs: ocr.durationMs } } : {}),
  };
};

module.exports = { extractText, normalise, sniffType, MIN_USABLE_CHARS };
