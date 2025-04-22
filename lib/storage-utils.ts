"use client"

import { supabase } from "./supabase"

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
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { data: null, error }
  }
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