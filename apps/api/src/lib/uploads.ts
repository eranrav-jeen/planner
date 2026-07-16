import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../middleware/error.js';

export const PO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'po');
fs.mkdirSync(PO_UPLOAD_DIR, { recursive: true });

const ALLOWED_PO_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const poUpload = multer({
  storage: multer.diskStorage({
    destination: PO_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 20);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_PO_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(422, 'Unsupported file type. Upload a PDF, Word, Excel, or image file.'));
      return;
    }
    cb(null, true);
  },
});
