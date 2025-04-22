import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServerClient()

    // Get all pending recordings
    const { data: pendingRecordings, error: fetchError } = await supabase
      .from("recordings")
      .select("*")
      .in("status", ["pending", "processing"])
      .limit(10)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingRecordings || pendingRecordings.length === 0) {
      return NextResponse.json({ message: "No pending recordings found" })
    }

    // Process each recording
    const results = await Promise.all(
      pendingRecordings.map(async (recording) => {
        // Update status to completed
        const { error: updateError } = await supabase
          .from("recordings")
          .update({ status: "completed" })
          .eq("id", recording.id)

        if (updateError) {
          return { id: recording.id, success: false, error: updateError.message }
        }

        // Create a mock summary
        const { error: summaryError } = await supabase.from("summaries").insert({
          recording_id: recording.id,
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
          return { id: recording.id, success: false, error: summaryError.message }
        }

        return { id: recording.id, success: true }
      }),
    )

    return NextResponse.json({ processed: results })
  } catch (error: any) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
