/**
 * Media tools: upload_image, event_set_poster, gallery_upload.
 *
 * upload_image  -> POST /api/admin/upload?folder=X (multipart; folder must also be a form field)
 * gallery_upload -> POST /api/admin/photos/presign, PUT bytes to the signed R2 URL,
 *                   POST /api/admin/photos/finalize once per photo.
 * The signed R2 URL carries its own signature: the bearer token is NEVER sent to it.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, fail, guard, ok, redact } from "../client.js";
import { patchEvent } from "./events.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // /api/admin/upload cap
const MAX_GALLERY_FILE_BYTES = 25 * 1024 * 1024; // presign cap per original
const PRESIGN_BATCH = 200; // presign MAX_FILES
const FINALIZE_CONCURRENCY = 3; // finalize is CPU-bound server-side
const PUT_CONCURRENCY = 4;

const FOLDERS = ["events", "blog", "team", "community"] as const;

const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Content type from the file extension, or undefined when not an allowed image. */
function imageTypeOf(filePath: string): string | undefined {
  return IMAGE_TYPES[extname(filePath).toLowerCase()];
}

/** Run `worker` over `items` with at most `limit` in flight; results keep input order. */
async function mapLimited<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

type UploadOutcome = { ok: true; url: string; size: number } | { ok: false; message: string };

/** Validate and upload one local image to /api/admin/upload. */
async function uploadLocalImage(filePath: string, folder: (typeof FOLDERS)[number]): Promise<UploadOutcome> {
  if (!isAbsolute(filePath)) return { ok: false, message: `filePath must be absolute: ${filePath}` };
  const contentType = imageTypeOf(filePath);
  if (!contentType) return { ok: false, message: "Only .jpg, .jpeg, .png, .webp and .gif files are accepted." };
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch (err) {
    return { ok: false, message: `Cannot read ${filePath}: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `File is ${(bytes.length / 1048576).toFixed(1)} MB; the limit is 5 MB.` };
  }
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: contentType }), basename(filePath));
  form.append("folder", folder);
  // The route gates permission on the query string and requires the form field to agree.
  const res = await apiRequest("POST", "/api/admin/upload", { query: { folder }, form });
  const body = res.data as { url?: string; size?: number } | null;
  if (!res.ok || !body?.url) return { ok: false, message: res.errorText ?? "Upload returned no url." };
  return { ok: true, url: body.url, size: body.size ?? bytes.length };
}

interface PresignedUpload {
  photoId: string;
  fileName: string;
  uploadUrl: string;
  contentType: string;
  ext: string;
}

interface LocalPhoto {
  fileName: string;
  path: string;
  size: number;
  contentType: string;
}

interface GalleryFailure {
  file: string;
  stage: string;
  message: string;
  photoId?: string;
}

/** Presign, PUT and finalize one batch (<= 200 files). Returns the count finalized. */
async function uploadBatch(
  batch: LocalPhoto[],
  eventId: string,
  photographer: string | undefined,
  failures: GalleryFailure[],
): Promise<number> {
  const presign = await apiRequest("POST", "/api/admin/photos/presign", {
    json: {
      eventId,
      ...(photographer ? { photographer } : {}),
      files: batch.map((f) => ({ fileName: f.fileName, contentType: f.contentType, size: f.size })),
    },
  });
  const uploads = (presign.data as { data?: { uploads?: PresignedUpload[] } } | null)?.data?.uploads;
  if (!presign.ok || !uploads) {
    for (const f of batch) {
      failures.push({ file: f.fileName, stage: "presign", message: presign.errorText ?? "No uploads returned" });
    }
    return 0;
  }

  const outcomes = await mapLimited(batch, PUT_CONCURRENCY, async (file, index) => {
    const slot = uploads[index];
    if (!slot || slot.fileName !== file.fileName) {
      failures.push({ file: file.fileName, stage: "presign", message: "Presign response did not match the request order" });
      return false;
    }
    try {
      const bytes = await readFile(file.path);
      // Plain fetch, no Authorization header: the URL is pre-signed for this exact Content-Type.
      const put = await fetch(slot.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": slot.contentType },
        body: bytes,
        signal: AbortSignal.timeout(300_000),
      });
      if (!put.ok) {
        failures.push({ file: file.fileName, stage: "put", message: `HTTP ${put.status}`, photoId: slot.photoId });
        return false;
      }
      return true;
    } catch (err) {
      failures.push({ file: file.fileName, stage: "put", message: redact(String(err)), photoId: slot.photoId });
      return false;
    }
  });

  const finalizeTargets = uploads.filter((_slot, index) => outcomes[index]);
  const finalized = await mapLimited(finalizeTargets, FINALIZE_CONCURRENCY, async (slot) => {
    const res = await apiRequest("POST", "/api/admin/photos/finalize", {
      json: { photoId: slot.photoId, ext: slot.ext, contentType: slot.contentType },
    });
    if (!res.ok) {
      failures.push({ file: slot.fileName, stage: "finalize", message: res.errorText ?? "failed", photoId: slot.photoId });
    }
    return res.ok;
  });
  return finalized.filter(Boolean).length;
}

/** Register the media tools on the server. */
export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "upload_image",
    {
      title: "Upload image",
      description: "Upload one local image (jpg, png, webp or gif, max 5 MB) to the site's storage and return its public URL.",
      inputSchema: {
        filePath: z.string().min(1).describe("Absolute local path to the image file"),
        folder: z.enum(FOLDERS).describe("Storage folder: events, blog, team or community"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard("upload_image", async ({ filePath, folder }) => {
      const result = await uploadLocalImage(filePath, folder);
      if (!result.ok) return fail(`Upload failed. ${result.message}`);
      return ok(`Uploaded ${basename(filePath)} to ${folder}: ${result.url}`, { url: result.url, size: result.size });
    }),
  );

  server.registerTool(
    "event_set_poster",
    {
      title: "Set event poster",
      description: "Upload a local image to the events folder and set it as the event's posterUrl, in one call.",
      inputSchema: {
        eventId: z.string().min(1).describe("Event id (cuid)"),
        filePath: z.string().min(1).describe("Absolute local path to the poster image (jpg, png, webp, gif; max 5 MB)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard("event_set_poster", async ({ eventId, filePath }) => {
      const upload = await uploadLocalImage(filePath, "events");
      if (!upload.ok) return fail(`Poster upload failed. ${upload.message}`);
      const patch = await patchEvent(eventId, { posterUrl: upload.url });
      if (!patch.ok) {
        return fail(`Image uploaded to ${upload.url} but setting posterUrl failed. ${patch.errorText ?? ""}`);
      }
      return ok(`Poster set for event ${eventId}: ${upload.url}`, { eventId, posterUrl: upload.url });
    }),
  );

  server.registerTool(
    "gallery_upload",
    {
      title: "Upload event gallery photos",
      description:
        "Upload every image in a local directory (not recursive) to an event's photo gallery. Files go straight to storage via signed URLs, then each is finalized into thumbnail and full sizes. Max 25 MB per file, 200 files per batch; larger folders run as several batches. Failed files are listed by name.",
      inputSchema: {
        eventId: z.string().min(1).describe("Event id (cuid) the photos belong to"),
        directory: z.string().min(1).describe("Absolute local path of a directory containing jpg, png, webp or gif files"),
        photographer: z.string().max(120).optional().describe("Photographer credit applied to every photo (max 120 chars)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard("gallery_upload", async ({ eventId, directory, photographer }) => {
      if (!isAbsolute(directory)) return fail(`directory must be an absolute path: ${directory}`);
      let names: string[];
      try {
        names = (await readdir(directory)).sort();
      } catch (err) {
        return fail(`Cannot read directory ${directory}: ${err instanceof Error ? err.message : String(err)}`);
      }
      const failures: GalleryFailure[] = [];
      const photos: LocalPhoto[] = [];
      for (const name of names) {
        const contentType = imageTypeOf(name);
        if (!contentType) continue;
        const path = join(directory, name);
        const info = await stat(path);
        if (!info.isFile()) continue;
        if (info.size > MAX_GALLERY_FILE_BYTES) {
          failures.push({ file: name, stage: "precheck", message: "Larger than 25 MB" });
          continue;
        }
        photos.push({ fileName: name, path, size: info.size, contentType });
      }
      if (photos.length === 0 && failures.length === 0) return fail(`No jpg, png, webp or gif files found in ${directory}.`);

      let finalized = 0;
      for (let start = 0; start < photos.length; start += PRESIGN_BATCH) {
        finalized += await uploadBatch(photos.slice(start, start + PRESIGN_BATCH), eventId, photographer, failures);
      }
      const summary = `Gallery upload for event ${eventId}: ${finalized} of ${photos.length + failures.filter((f) => f.stage === "precheck").length} photo(s) finalized, ${failures.length} failed.`;
      const payload = { eventId, found: photos.length, finalized, failed: failures.length, failures };
      // A fully failed run is an error so callers do not mistake it for success.
      return finalized === 0 && failures.length > 0
        ? { content: [{ type: "text", text: redact(`Error: ${summary}\n${JSON.stringify(payload, null, 2)}`) }], isError: true }
        : ok(summary, payload);
    }),
  );
}

