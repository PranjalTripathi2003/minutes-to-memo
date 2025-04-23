import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSignedUrlServer } from "@/lib/server-storage-utils"
import { STORAGE_BUCKETS } from "@/lib/supabase-config"
import { setTimeout } from 'timers/promises'

export async function POST(request: Request) {
  // Get the recording ID at the beginning and store it for later use
  let recordingId;
  
  try {
    // Get the recording ID from the request
    const requestData = await request.json();
    recordingId = requestData.recordingId;

    console.log(`Starting transcription process for recording: ${recordingId}`)

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
      console.log(`Unauthorized access attempt for recording: ${recordingId}`)
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
      console.log(`Recording not found: ${recordingId}`)
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      )
    }

    console.log(`Found recording: ${recording.file_name} (${recording.file_size} bytes)`)

    // Generate a signed URL for the recording file
    // This URL will expire after 5 minutes
    const { signedUrl, error: signedUrlError } = await getSignedUrlServer(
      STORAGE_BUCKETS.RECORDINGS,
      recording.file_path,
      300 // 5 minutes
    )

    if (signedUrlError || !signedUrl) {
      console.error(`Failed to generate signed URL: ${signedUrlError ? signedUrlError.toString() : 'Unknown error'}`)
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      )
    }

    console.log(`Generated signed URL for file: ${recording.file_path}`)

    // Update recording status
    await supabase
      .from("recordings")
      .update({ status: "transcribing" })
      .eq("id", recordingId)
    
    console.log(`Updated recording status to 'transcribing'`)

    // Download the file using the signed URL
    console.log(`Downloading file...`)
    const fileResponse = await fetch(signedUrl)
    if (!fileResponse.ok) {
      console.error(`Failed to download audio file: ${fileResponse.statusText}`)
      throw new Error(`Failed to download audio file: ${fileResponse.statusText}`)
    }
    
    const audioBuffer = await fileResponse.arrayBuffer()
    console.log(`Downloaded file, size: ${audioBuffer.byteLength} bytes`)
    
    // Send the file to Deepgram for transcription
    console.log(`Sending file to Deepgram with Whisper model...`)
    console.log(`API Key being used: ${process.env.DEEPGRAM_API_KEY ? "From env" : "Fallback hardcoded key"}`)
    
    let deepgramResponse;
    let maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        deepgramResponse = await fetch("https://api.deepgram.com/v1/listen?model=whisper", {
          method: "POST",
          headers: {
            "Authorization": `Token ${process.env.DEEPGRAM_API_KEY || "50999766bb949572be783c65771c0b3b52d29621"}`,
            "Content-Type": recording.file_type || "audio/mpeg"
          },
          body: audioBuffer
        });
        
        if (!deepgramResponse.ok) {
          const responseText = await deepgramResponse.text();
          console.error(`Deepgram API Error (Attempt ${retryCount + 1}/${maxRetries + 1}):`, {
            status: deepgramResponse.status,
            statusText: deepgramResponse.statusText,
            responseText
          });
          
          // If we've reached max retries, throw the error
          if (retryCount === maxRetries) {
            throw new Error(`Deepgram transcription error: ${responseText}`);
          }
          
          // Otherwise, wait and retry
          console.log(`Retrying in 2 seconds...`);
          await setTimeout(2000);
          retryCount++;
          continue;
        }
        
        // If successful, break out of the loop
        break;
        
      } catch (error) {
        console.error(`Network error contacting Deepgram (Attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // If we've reached max retries, rethrow
        if (retryCount === maxRetries) {
          throw error;
        }
        
        // Otherwise wait and retry
        console.log(`Retrying in 2 seconds...`);
        await setTimeout(2000);
        retryCount++;
      }
    }

    // At this point, deepgramResponse should be defined and successful
    console.log(`Received response from Deepgram, parsing result...`)
    
    // Check if we have a response before trying to parse it
    if (!deepgramResponse) {
      throw new Error("Failed to get a response from Deepgram after retries");
    }
    
    // Log the full response for debugging
    const responseText = await deepgramResponse.text();
    console.log(`Raw Deepgram response: ${responseText}`);
    
    // Parse the response JSON (we need to re-parse since we already read the text)
    const transcriptionResult = JSON.parse(responseText);
    
    // Extract the transcription text with better error handling
    let transcription = "";
    
    try {
      transcription = transcriptionResult.results?.channels[0]?.alternatives[0]?.transcript || "";
    } catch (error) {
      console.error("Error extracting transcript from response:", error);
      console.error("Response structure:", JSON.stringify(transcriptionResult, null, 2));
      throw new Error("Failed to extract transcription from Deepgram response");
    }
    
    if (!transcription) {
      console.error(`Empty transcription result from Deepgram`)
      throw new Error("Empty transcription result from Deepgram")
    }
    
    console.log(`Transcription successful, length: ${transcription.length} characters`)
    console.log(`First 100 characters: ${transcription.substring(0, 100)}...`)
    
    // Store the transcription directly
    console.log(`Saving transcription to database...`)
    
    try {
      // First, try to update the recording status to ensure the table exists
      const { error: testError } = await supabase
        .from("recordings")
        .update({ status: "transcribing" })
        .eq("id", recordingId)
        
      if (testError && testError.message?.includes('does not exist')) {
        console.error('Table error detected. Database tables may not be properly set up:', testError.message);
        return NextResponse.json(
          { 
            error: 'Database tables not properly set up. Please visit /database-setup for instructions.',
            code: 'DB_SETUP_REQUIRED'
          },
          { status: 500 }
        );
      }
      
      // Try to insert the transcription
      const { error: insertError } = await supabase
        .from("transcriptions")
        .insert({
          recording_id: recordingId,
          content: transcription,
          status: "completed",
        })

      if (insertError) {
        // Check if the error is because the table doesn't exist
        if (insertError.message?.includes('does not exist')) {
          console.error('Transcriptions table does not exist:', insertError.message);
          return NextResponse.json(
            { 
              error: 'Transcriptions table does not exist. Please visit /database-setup for instructions.',
              code: 'DB_SETUP_REQUIRED'
            },
            { status: 500 }
          );
        } else {
          console.error(`Failed to save transcription: ${insertError.message || 'Unknown database error'}`);
          throw new Error(`Failed to save transcription: ${insertError.message || 'Database error'}`);
        }
      }
      
      console.log(`Transcription saved successfully`);
      
      // Update recording status to completed
      const { error: updateError } = await supabase
        .from("recordings")
        .update({ status: "completed" })
        .eq("id", recordingId);
        
      if (updateError) {
        console.error(`Failed to update recording status: ${updateError.message}`);
        // Don't throw here - we already have the transcription saved
      } else {
        console.log(`Updated recording status to 'completed'`);
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw dbError; // Re-throw to be caught by the outer try/catch
    }

    return NextResponse.json({
      message: "Transcription completed",
      recordingId
    })

  } catch (error: any) {
    console.error("Transcription request error:", error)
    
    // Update recording with error status if recordingId is available
    try {
      // Use the recordingId we stored at the beginning instead of reading request.json() again
      if (recordingId) {
        const supabase = await createServerClient()

        try {
          // First try with error_message column
          const { error: updateError } = await supabase
            .from("recordings")
            .update({ 
              status: "failed",
              error_message: error.message || "Transcription failed" 
            })
            .eq("id", recordingId)
          
          if (updateError) {
            console.error(`Error updating recording status with error message: ${updateError.message}`);
            if (updateError.message?.includes('error_message')) {
              // Column doesn't exist, try again without it
              const { error: fallbackError } = await supabase
                .from("recordings")
                .update({ status: "failed" })
                .eq("id", recordingId)
                
              if (fallbackError) {
                console.error(`Failed to update recording status: ${fallbackError.message}`);
              } else {
                console.log(`Updated recording ${recordingId} status to 'failed' (without error message)`);
              }
            }
          } else {
            console.log(`Updated recording ${recordingId} status to 'failed'`);
          }
        } catch (innerErr) {
          console.error(`Inner error updating recording status:`, innerErr);
        }
      }
    } catch (updateError) {
      console.error("Failed to update recording status:", updateError);
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to complete transcription" },
      { status: 500 }
    )
  }
}