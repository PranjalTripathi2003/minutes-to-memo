"use client"

import { supabase } from "./supabase"
import { CHUNK_SIZE } from "./supabase-config"

/**
 * Upload a file to Supabase Storage
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path within the bucket where the file will be stored
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  try {
    // For larger files (>50MB), we need to use chunked upload
    if (file.size > 50 * 1024 * 1024) {
      return await uploadChunkedFile(bucketName, filePath, file, onProgress)
    }
    
    // Standard upload for smaller files
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Use upsert to support resumable uploads
      })

    if (error) throw error
    if (onProgress) onProgress(100)
    return { data, error: null }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { data: null, error }
  }
}

/**
 * Upload a large file by splitting it into chunks
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path within the bucket where the file will be stored
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 */
async function uploadChunkedFile(
  bucketName: string,
  filePath: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  try {
    // Split file into multiple chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    let uploadedChunks = 0
    let uploadedBytes = 0
    
    console.log(`Uploading file ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB) in ${totalChunks} chunks`);
    
    // Create temporary folder to store chunks
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const chunkFolderPath = `temp/${timestamp}`;
    
    // Upload each chunk separately
    const uploadPromises = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkSize = end - start;
      const chunk = file.slice(start, end);
      
      // Create a unique name for this chunk
      const chunkFilePath = `${chunkFolderPath}/chunk_${i}.part`;
      
      // Upload this chunk
      const uploadPromise = (async () => {
        try {
          const { error } = await supabase.storage
            .from(bucketName)
            .upload(chunkFilePath, chunk, {
              cacheControl: '3600',
              upsert: true,
            });
          
          if (error) throw error;
          
          uploadedChunks++;
          uploadedBytes += chunkSize;
          
          if (onProgress) {
            const progress = Math.floor((uploadedBytes / file.size) * 100);
            onProgress(progress);
          }
          
          return { chunkFilePath, index: i };
        } catch (error) {
          console.error(`Error uploading chunk ${i}:`, error);
          throw error;
        }
      })();
      
      uploadPromises.push(uploadPromise);
    }
    
    // Wait for all chunks to be uploaded
    const results = await Promise.all(uploadPromises);
    
    // Sort results to ensure chunks are in order
    results.sort((a, b) => a.index - b.index);
    
    // Now combine the chunks by creating a client-side file
    const combinedFile = await combineChunks(bucketName, results.map(r => r.chunkFilePath), file.type);
    
    // Upload the combined file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, combinedFile, {
        cacheControl: '3600',
        upsert: true,
      });
      
    if (error) throw error;
    
    // Clean up chunks
    for (const { chunkFilePath } of results) {
      await supabase.storage.from(bucketName).remove([chunkFilePath]);
    }
    
    if (onProgress) onProgress(100);
    return { data, error: null };
    
  } catch (error) {
    console.error("Error in chunked upload:", error);
    return { data: null, error };
  }
}

/**
 * Combine uploaded chunks into a single file
 * @param bucketName - The name of the storage bucket
 * @param chunkPaths - Array of chunk file paths
 * @param fileType - MIME type of the original file
 */
async function combineChunks(bucketName: string, chunkPaths: string[], fileType: string): Promise<File> {
  const chunkBlobs = [];
  
  for (const chunkPath of chunkPaths) {
    // Get a signed URL for the chunk
    const { data } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(chunkPath, 60);
      
    if (!data?.signedUrl) {
      throw new Error(`Failed to get signed URL for chunk: ${chunkPath}`);
    }
    
    // Download the chunk
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    chunkBlobs.push(blob);
  }
  
  // Combine all blobs
  const combinedBlob = new Blob(chunkBlobs, { type: fileType });
  
  // Convert to File
  return new File([combinedBlob], `combined-${Date.now()}`, { type: fileType });
}

/**
 * Get a URL for a file in Supabase Storage
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path of the file within the bucket
 * @param expiresIn - Seconds until the signed URL expires (default: 60)
 * @param signed - Whether to return a signed URL (default: false)
 */
export async function getFileUrl(bucketName: string, filePath: string, expiresIn = 60, signed = false) {
  try {
    if (signed) {
      // Return a signed URL
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn)

      if (error) throw error
      return { signedUrl: data.signedUrl, error: null }
    } else {
      // Return a public URL
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
      return { signedUrl: data.publicUrl, error: null }
    }
  } catch (error) {
    console.error("Error getting file URL:", error)
    return { signedUrl: null, error }
  }
}

/**
 * Generate a signed URL for secure access to a file
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path of the file within the bucket
 * @param expiresIn - Seconds until the signed URL expires (default: 60)
 */
export async function getSignedUrl(bucketName: string, filePath: string, expiresIn = 60) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn)

    if (error) throw error
    return { signedUrl: data.signedUrl, error: null }
  } catch (error) {
    console.error("Error creating signed URL:", error)
    return { signedUrl: null, error }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path of the file within the bucket
 */
export async function deleteFile(bucketName: string, filePath: string) {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath])
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error("Error deleting file:", error)
    return { error }
  }
}

/**
 * List all files in a bucket or folder
 * @param bucketName - The name of the storage bucket
 * @param folderPath - Optional folder path within the bucket
 */
export async function listFiles(bucketName: string, folderPath?: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath || '')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error("Error listing files:", error)
    return { data: null, error }
  }
}