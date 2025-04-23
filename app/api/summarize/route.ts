export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { createServerClient } from '@/lib/supabase-server'

// Hardcoded for immediate testing - move to env vars later
const openai = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1"
})

export async function POST(request: Request) {
  const { recordingId } = await request.json()
  if (!recordingId) {
    return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 })
  }

  const supabase = await createServerClient()

  // Fetch existing transcription
  const { data: transcriptionRow, error: transError } = await supabase
    .from('transcriptions')
    .select('content')
    .eq('recording_id', recordingId)
    .single()
  if (transError || !transcriptionRow) {
    return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
  }

  const transcriptText = transcriptionRow.content
  // Build prompt for summarization
  const prompt = `
You are an AI assistant that summarizes meeting transcripts. Extract four sections: \"Key Points\", \"Action Items\", \"Participants\", and \"General Notes\".\n
Transcript:\n${transcriptText}\n
Respond as JSON with keys: main_points (array of strings), next_steps (array of strings), participants (array of strings), general_notes (string).`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You summarize meeting transcripts.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    })

    const raw = completion.choices?.[0]?.message?.content || ''
    let summary
    try {
      summary = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse summary JSON', raw },
        { status: 500 }
      )
    }

    // Insert into summaries table
    const { error: insertError } = await supabase
      .from('summaries')
      .insert({
        recording_id: recordingId,
        title: 'Meeting Summary',
        main_points: summary.main_points,
        next_steps: summary.next_steps,
        participants: summary.participants,
        general_notes: summary.general_notes,
      })
    if (insertError) {
      console.error('Error inserting summary:', insertError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({ success: true, summary })
  } catch (err: any) {
    console.error('Summarization error:', err)
    return NextResponse.json(
      { error: err.message || 'OpenAI request failed' },
      { status: 500 }
    )
  }
} 