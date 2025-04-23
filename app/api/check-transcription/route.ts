import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  // Get the recording ID from the query params
  const url = new URL(request.url)
  const recordingId = url.searchParams.get('recordingId')

  if (!recordingId) {
    return NextResponse.json(
      { error: "Recording ID is required" },
      { status: 400 }
    )
  }

  try {
    // Initialize Supabase client
    const supabase = await createServerClient()

    // Get the recording status
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("status, error_message")
      .eq("id", recordingId)
      .single()

    if (recordingError) {
      // Check if the error is related to the missing column
      if (recordingError.message?.includes("column") && recordingError.message?.includes("error_message")) {
        console.log("Attempting to add missing error_message column...")
        
        // First get recording without the missing column
        const { data: basicRecording, error: basicError } = await supabase
          .from("recordings")
          .select("status")
          .eq("id", recordingId)
          .single()
          
        if (basicError) {
          return NextResponse.json(
            { error: "Recording not found" },
            { status: 404 }
          )
        }
        
        // Return the data without the missing column
        return NextResponse.json({
          recording: {
            id: recordingId,
            status: basicRecording.status,
            error: null // Since column doesn't exist
          },
          transcription: null,
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json(
          { error: "Recording not found" },
          { status: 404 }
        )
      }
    }

    // Check if a transcription exists
    const { data: transcription, error: transcriptionError } = await supabase
      .from("transcriptions")
      .select("id, content, created_at")
      .eq("recording_id", recordingId)
      .single()

    // Return both recording status and transcription info (if exists)
    return NextResponse.json({
      recording: {
        id: recordingId,
        status: recording.status,
        error: recording.error_message || null
      },
      transcription: transcription || null,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Error checking transcription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check transcription" },
      { status: 500 }
    )
  }
} 