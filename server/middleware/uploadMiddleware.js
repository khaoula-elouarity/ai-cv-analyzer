const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Multer needs the destination to exist or it throws ENOENT. `uploads/` is
// gitignored and must be created on boot (e.g. after a fresh clone on Render).
const UPLOAD_ROOT = path.resolve(__dirname, '..', env.uploadDir);
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  // Some Windows clients send this for .jpg instead of image/jpeg.
  'image/jpg',
]);

const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
};

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

/** Image types are routed through OCR rather than a text parser. */
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg']);

/**
 * Cryptographically random, collision-free filename. The user-supplied name
 * is never used on disk, which blocks path traversal ("../../etc/passwd") and
 * stored filename injection.
 */
const safeFilename = (req, file, cb) => {
  const ext = (EXT_BY_MIME[file.mimetype] || '.bin').toLowerCase();
  const random = crypto.randomBytes(12).toString('hex');
  cb(null, `${req.userId}-${Date.now()}-${random}${ext}`);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: safeFilename,
});

/**
 * Validate the *content* type reported by the client and the extension.
 * Browsers always send a MIME type, but they are trivially spoofed, so this is
 * defence-in-depth rather than a guarantee — the extraction service still
 * sniffs the actual file signature.
 */
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        'Only PDF, Word documents and images are accepted (.pdf, .doc, .docx, .png, .jpg, .jpeg)'
      )
    );
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext && !ALLOWED_EXT.includes(ext)) {
    return cb(
      ApiError.badRequest(
        'File extension must be .pdf, .doc, .docx, .png, .jpg or .jpeg'
      )
    );
  }
  // Fail before writing anything to disk when OCR is switched off.
  if (IMAGE_MIME.has(file.mimetype) && !env.ocrEnabled) {
    return cb(
      ApiError.badRequest(
        'Image uploads are disabled on this server. Please upload a text-based PDF or .docx.'
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadMb * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  upload,
  UPLOAD_ROOT,
  ALLOWED_MIME,
  ALLOWED_EXT,
  IMAGE_MIME,
  /** Wrap multer so its errors become clean JSON instead of HTML. */
  handleUpload: (req, res, next) =>
    upload.single('resume')(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.payloadTooLarge(
              `File is too large. Maximum size is ${env.maxUploadMb} MB.`
            )
          );
        }
        return next(ApiError.badRequest(`Upload error: ${err.message}`));
      }
      return next(err);
    }),
};
