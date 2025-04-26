export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient()
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
    }
    // Parse request
    const { recordingId } = await request.json()
    if (!recordingId) {
      return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 })
    }
    // Retrieve the existing transcription via Supabase client
    const { data: transcriptionRecord, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('content')
      .eq('recording_id', recordingId)
      .single()
    if (transcriptionError || !transcriptionRecord) {
      return NextResponse.json({ error: transcriptionError?.message || 'Transcription not found' }, { status: 404 })
    }
    const transcriptText = transcriptionRecord.content
    // Build prompt and initialize OpenAI per-request
    const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1' })
    // Call OpenAI for summary
    const completion = await openaiClient.chat.completions.create(
      {
        model: 'mistralai/mistral-small-3.1-24b-instruct:free',
        messages: [
          { role: 'system', content: 'You summarize meeting transcripts. Only respond with valid JSON, no markdown or extra text.' },
          { role: 'user', content: `
You are an AI assistant that summarizes meeting transcripts. Extract four sections: "Key Points", "Action Items", "Participants", and "General Notes".

Transcript:
${transcriptText}

Respond as JSON with keys: main_points (array of strings), next_steps (array of strings), participants (array of strings), general_notes (string).` }
        ],
        temperature: 0.7
      },
      {
        // Forward referer and site title for OpenRouter usage
        headers: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'Minutes to Memo'
        }
      }
    )

    // Extract and clean JSON
    let raw = (completion.choices?.[0]?.message?.content || '').trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      raw = raw.substring(start, end + 1)
    }

    let summary: any
    try {
      summary = JSON.parse(raw)
    } catch (parseError) {
      console.error('Failed to parse summary JSON:', parseError, 'raw:', raw)
      return NextResponse.json({ error: 'Failed to parse summary JSON', raw }, { status: 500 })
    }

    // Persist the summary via Supabase client
    const { error: insertError } = await supabase
      .from('summaries')
      .insert({
        recording_id: recordingId,
        title: 'Meeting Summary',
        main_points: summary.main_points,
        next_steps: summary.next_steps,
        participants: summary.participants,
        general_notes: summary.general_notes
      })
    if (insertError) {
      console.error('Failed to save summary:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, summary })
  } catch (err: any) {
    console.error('Summarization error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
} 