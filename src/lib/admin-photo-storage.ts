import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export class PhotoValidationError extends Error {}

// Sniff real type from magic bytes — never trust the client filename or MIME.
function detectImageExtension(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) {
    return "gif";
  }
  return null;
}

export async function saveAdminPhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoValidationError("Photo exceeds the 5 MB limit.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
    throw new PhotoValidationError("Photo exceeds the 5 MB limit.");
  }

  const extension = detectImageExtension(bytes);
  if (!extension) {
    throw new PhotoValidationError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDirectory, { recursive: true });

  const filename = `${crypto.randomUUID()}.${extension}`;
  await writeFile(path.join(uploadsDirectory, filename), bytes);

  return `/uploads/${filename}`;
}
