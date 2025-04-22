import { createServerClient } from "./supabase-server";

/**
 * Generate a signed URL for secure access to a file (server-side implementation)
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path of the file within the bucket
 * @param expiresIn - Seconds until the signed URL expires (default: 60)
 */
export async function getSignedUrlServer(bucketName: string, filePath: string, expiresIn = 60) {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return { signedUrl: data.signedUrl, error: null };
  } catch (error) {
    console.error("Error creating signed URL on server:", error);
    return { signedUrl: null, error };
  }
}