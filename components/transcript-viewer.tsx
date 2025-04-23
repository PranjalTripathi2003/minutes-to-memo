"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { RealtimeChannel } from '@supabase/supabase-js'

interface TranscriptViewerProps {
  recordingId: string
}

export function TranscriptViewer({ recordingId }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usePolling, setUsePolling] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Function to fetch transcript from the database
  const fetchTranscript = async () => {
    try {
      console.debug(`Fetching transcript for recording ${recordingId}`);
      
      const { data, error } = await supabase
        .from("transcriptions")
        .select("content")
        .eq("recording_id", recordingId)
        .single()
      
      if (error) throw error
      
      if (data && data.content) {
        console.debug(`Found transcript of length: ${data.content.length}`);
        setTranscript(data.content)
      } else {
        console.debug(`No transcript found for recording ${recordingId}`);
        setTranscript(null)
        setError("No transcript found for this recording")
      }
    } catch (err: any) {
      console.error("Error fetching transcript:", err)
      setError(err.message || "Failed to load transcript")
    } finally {
      setLoading(false)
    }
  }

  // Set up polling for transcript updates as fallback
  useEffect(() => {
    if (!usePolling || transcript !== null) {
      return;
    }
    
    console.debug(`Setting up transcript polling for recording ${recordingId}`);
    const interval = setInterval(() => {
      fetchTranscript();
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [recordingId, usePolling, transcript]);

  // Main effect for transcript fetching and realtime updates
  useEffect(() => {
    setLoading(true);
    fetchTranscript();
    
    // Try to set up realtime subscription
    const setupRealtimeSubscription = async () => {
      try {
        console.debug(`Setting up transcript realtime subscription`);
        
        // Clean up any existing channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        
        // Create new subscription
        channelRef.current = supabase
          .channel(`transcript-${recordingId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'transcriptions',
              filter: `recording_id=eq.${recordingId}`
            },
            (payload) => {
              console.debug('New transcription via realtime:', payload);
              if (payload.new && payload.new.content) {
                setTranscript(payload.new.content);
                setLoading(false);
              }
            }
          )
          .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
              console.warn(`Failed to subscribe to transcript updates: ${status}`);
              setUsePolling(true);
            } else {
              console.debug('Successfully subscribed to transcript updates');
              setUsePolling(false);
            }
          });
          
        // Fallback to polling after 5 seconds if subscription doesn't succeed
        setTimeout(() => {
          if (!channelRef.current) {
            console.warn('Transcript channel reference is missing, falling back to polling');
            setUsePolling(true);
          }
        }, 5000);
      } catch (err) {
        console.error('Error setting up transcript subscription:', err);
        setUsePolling(true);
      }
    };
    
    setupRealtimeSubscription();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [recordingId]);
  
  const copyToClipboard = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      toast.success("Transcript copied to clipboard");
    }
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transcript</CardTitle>
        {transcript && (
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : transcript ? (
          <div className="prose prose-sm max-w-none">
            {transcript.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <p>No transcript available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 