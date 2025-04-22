import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSignedUrlServer } from "@/lib/server-storage-utils"
import { STORAGE_BUCKETS } from "@/lib/supabase-config"

export async function POST(request: Request) {
  try {
    // Get the recording ID from the request
    const { recordingId } = await request.json()

    if (!recordingId) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createServerClient()

    // Get the session to verify the user
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch recording details
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .eq("user_id", session.user.id)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      )
    }

    // Generate a signed URL for the recording file
    // This URL will expire after 5 minutes
    const { signedUrl, error: signedUrlError } = await getSignedUrlServer(
      STORAGE_BUCKETS.RECORDINGS,
      recording.file_path,
      300 // 5 minutes
    )

    if (signedUrlError || !signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      )
    }

    // Update recording status
    await supabase
      .from("recordings")
      .update({ status: "transcribing" })
      .eq("id", recordingId)

    // Use the configured transcription service URL from environment variables
    const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL

    // Forward the signed URL to your transcription service
    console.log(`Sending request to transcription service: ${TRANSCRIPTION_SERVICE_URL}`)
    console.log(`File URL: ${signedUrl.substring(0, 50)}...`)

    const transcriptionResponse = await fetch(TRANSCRIPTION_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any authentication headers needed for your Oracle server
        "Authorization": `Bearer ${process.env.TRANSCRIPTION_API_KEY || "your-api-key"}`,
      },
      body: JSON.stringify({
        recordingId: recording.id,
        fileUrl: signedUrl,
        fileName: recording.file_name,
        fileType: recording.file_type,
        // Add a callback URL for the service to notify when transcription is complete
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/transcription-callback`,
      }),
    })

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.json()
      throw new Error(`Transcription service error: ${error.message || "Unknown error"}`)
    }

    return NextResponse.json({
      message: "Transcription started",
      recordingId
    })

  } catch (error: any) {
    console.error("Transcription request error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to start transcription" },
      { status: 500 }
    )
  }
}