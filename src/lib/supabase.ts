import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role (for storage uploads)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const STORAGE_BUCKET = "cck-bucket";

/**
 * Upload a file to Supabase Storage and return the public URL.
 */
export async function uploadImage(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "events"
): Promise<string> {
  const path = `${folder}/${Date.now()}-${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const url = new URL(publicUrl);
  // Extract path after /object/public/{bucket}/
  const pathMatch = url.pathname.match(
    /\/storage\/v1\/object\/public\/[^/]+\/(.+)/
  );
  if (!pathMatch) return;

  const filePath = decodeURIComponent(pathMatch[1]);

  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([filePath]);
}
