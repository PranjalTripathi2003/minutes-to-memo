// Supabase configuration constants
export const STORAGE_BUCKETS = {
  RECORDINGS: 'user-uploads', // Bucket for storing audio/video recordings
  TRANSCRIPTIONS: 'user-uploads', // Bucket for storing transcription files
  DOCUMENTS: 'user-uploads', // Bucket for storing documents
}

// File size limits
export const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
export const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks for large file uploads

// Allowed file types
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/webm']
export const ALLOWED_FILE_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES]