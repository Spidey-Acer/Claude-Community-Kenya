/**
 * Pure upload-acceptance rule for /api/admin/upload, extracted from the route
 * so it can be unit-tested without mocking a Next.js request.
 *
 * A matrix, not a switch: every folder accepts the standard image types up to
 * 5MB, and the `guides` folder additionally accepts a PDF up to MAX_PDF_BYTES
 * — a guide's cover image still goes through the 5MB image path, only the
 * guide document itself gets the PDF allowance.
 */

export const UPLOAD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const UPLOAD_PDF_TYPE = "application/pdf";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
// 4MB, not the 25MB originally spec'd: Vercel's serverless functions cap the
// request body at 4.5MB, so anything larger fails with a platform 413 before
// our own "File too large" error ever runs. Getting past this needs a signed
// direct-to-Supabase upload (browser -> Supabase, bypassing our function
// entirely) — not implemented here; this cap just keeps the failure mode the
// one we control instead of Vercel's generic one.
export const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4MB

/** Folders allowed to receive a PDF (in addition to the standard image types). */
const PDF_FOLDERS = new Set(["guides"]);

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateUpload(input: {
  folder: string;
  contentType: string;
  size: number;
}): UploadValidationResult {
  const { folder, contentType, size } = input;

  if (contentType === UPLOAD_PDF_TYPE) {
    if (!PDF_FOLDERS.has(folder)) {
      return { ok: false, error: "PDF uploads are only allowed in the guides folder" };
    }
    if (size > MAX_PDF_BYTES) {
      return { ok: false, error: "File too large. Maximum size: 4MB" };
    }
    return { ok: true };
  }

  if (!(UPLOAD_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return { ok: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" };
  }
  if (size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "File too large. Maximum size: 5MB" };
  }
  return { ok: true };
}

/**
 * `%PDF-` magic-byte check on the uploaded buffer. `file.type` is whatever
 * the client's multipart request claims it is — trivially spoofable — so
 * passing `validateUpload` on content-type alone is not proof the bytes are
 * actually a PDF. Call this in addition, not instead, once the buffer is in
 * hand.
 */
export function hasPdfMagicBytes(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}
