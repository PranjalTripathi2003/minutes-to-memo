import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { recordingId } = await request.json()

    if (!recordingId) {
      return NextResponse.json({ error: "Recording ID is required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get the recording
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Update recording status to completed
    const { error: updateError } = await supabase
      .from("recordings")
      .update({ status: "completed" })
      .eq("id", recordingId)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update recording status" }, { status: 500 })
    }

    // Create a mock summary
    const { error: summaryError } = await supabase.from("summaries").insert({
      recording_id: recordingId,
      key_decisions: `1. The team will adopt the new design system starting next sprint.
2. Budget for Q3 marketing campaign approved at $75,000.
3. New hire onboarding process will be revised by HR by end of month.`,
      next_steps: `1. Sarah to schedule follow-up meeting with design team by Friday.
2. Michael will prepare budget breakdown for marketing campaign by next Tuesday.
3. Jamie to share the revised onboarding documents with the team for review.`,
      risks_concerns: `1. Timeline for the new feature launch might be tight given current resources.
2. Potential supply chain issues could impact product availability in Q4.
3. Team expressed concerns about the learning curve for the new design system.`,
      general_notes: `- Meeting started with a brief overview of Q2 results.
- Discussion about customer feedback was positive overall.
- Team morale seems high after recent product launch success.
- Several team members mentioned the need for additional training on new tools.`,
    })

    if (summaryError) {
      return NextResponse.json({ error: "Failed to create summary" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing recording:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
