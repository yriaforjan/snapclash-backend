import multer from "multer";
import { Request, Response, NextFunction } from "express";

const IMAGE_SIGNATURES: { bytes: (number | null)[]; offset?: number }[] = [
  { bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF
  { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WebP (bytes 8-11)
  { bytes: [0x42, 0x4d] }, // BMP
];

function isImageBuffer(buf: Buffer): boolean {
  return IMAGE_SIGNATURES.some(({ bytes, offset = 0 }) => {
    if (buf.length < offset + bytes.length) return false;
    return bytes.every((b, i) => b === null || buf[offset + i] === b);
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  },
});

export function validateImageBytes(req: Request, res: Response, next: NextFunction): void {
  if (!req.file?.buffer || !isImageBuffer(req.file.buffer)) {
    res.status(400).json({ error: "El archivo no es una imagen válida" });
    return;
  }
  next();
}

export default upload;
