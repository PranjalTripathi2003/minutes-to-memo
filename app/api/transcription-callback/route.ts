import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    console.warn("DEPRECATED: The transcription-callback endpoint is no longer in use as transcriptions are now processed directly via Deepgram")
    
    // Get transcription result from the request
    const {
      recordingId,
      transcription,
      status,
      error: transcriptionError
    } = await request.json()

    if (!recordingId) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createServerClient()

    // Fetch the recording to make sure it exists
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      )
    }

    // This endpoint is kept for legacy purposes but we log a warning
    console.log(`Received legacy callback for recording ${recordingId}`)

    // Update recording status based on the transcription result
    if (status === "completed" && transcription) {
      // Update recording status
      await supabase
        .from("recordings")
        .update({ status: "completed" })
        .eq("id", recordingId)

      // Create a transcription record
      const { error: insertError } = await supabase
        .from("transcriptions")
        .insert({
          recording_id: recordingId,
          content: transcription,
          status: "completed",
        })

      if (insertError) {
        throw new Error(`Failed to save transcription: ${insertError.message}`)
      }

      return NextResponse.json({
        message: "Transcription saved successfully",
      })
    }
    else if (status === "failed") {
      // Update recording with error status
      await supabase
        .from("recordings")
        .update({
          status: "failed",
          error_message: transcriptionError || "Transcription failed"
        })
        .eq("id", recordingId)

      return NextResponse.json({
        message: "Transcription failure recorded",
      })
    }
    else {
      // Update with progress status
      await supabase
        .from("recordings")
        .update({ status: status || "processing" })
        .eq("id", recordingId)

      return NextResponse.json({
        message: `Recording status updated to: ${status || "processing"}`,
      })
    }

  } catch (error: any) {
    console.error("Transcription callback error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process transcription callback" },
      { status: 500 }
    )
  }
}