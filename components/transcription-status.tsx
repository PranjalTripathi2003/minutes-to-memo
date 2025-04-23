"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { RealtimeChannel } from '@supabase/supabase-js'

interface TranscriptionStatusProps {
  recordingId: string
  status: string
  onStatusChange?: (newStatus: string) => void
}

export function TranscriptionStatus({ 
  recordingId, 
  status: initialStatus,
  onStatusChange 
}: TranscriptionStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [usePolling, setUsePolling] = useState(true) // Always start with polling enabled
  const channelRef = useRef<RealtimeChannel | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  
  // Set up a polling mechanism to check status
  useEffect(() => {
    // Don't poll if status is terminal
    if (status === 'completed' || status === 'failed') {
      return;
    }
    
    console.debug(`Setting up polling for recording ${recordingId}`);
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('recordings')
          .select('status')
          .eq('id', recordingId)
          .single();
          
        if (error) {
          console.error('Error polling for status:', error);
          return;
        }
        
        if (data && data.status !== status) {
          console.log(`Status changed from ${status} to ${data.status}`);
          setStatus(data.status);
          if (onStatusChange) {
            onStatusChange(data.status);
          }
        }
      } catch (err) {
        console.error('Error in status polling:', err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [recordingId, status, onStatusChange]);
  
  // Try to set up realtime subscription in addition to polling
  useEffect(() => {
    // Only start fresh timer when initial status changes to transcribing
    if (initialStatus === 'transcribing' && status !== 'transcribing') {
      // Reset timer when status changes to transcribing
      startTimeRef.current = Date.now();
    }
    
    // Update state when prop changes, but don't reset elapsed time
    setStatus(initialStatus);
    
    // Set up a timer to show elapsed time
    const timer = setInterval(() => {
      if (status === 'transcribing') {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    
    // Try to subscribe to realtime updates (as a complement to polling)
    const setupRealtimeSubscription = async () => {
      try {
        console.debug(`Setting up realtime subscription for recording ${recordingId}`);
        
        // Clean up any existing channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
        
        // Create new channel
        channelRef.current = supabase
          .channel(`recording-${recordingId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'recordings',
              filter: `id=eq.${recordingId}`
            },
            (payload) => {
              console.log('Recording updated via realtime:', payload)
              if (payload.new && payload.new.status !== status) {
                setStatus(payload.new.status)
                if (onStatusChange) {
                  onStatusChange(payload.new.status)
                }
              }
            }
          )
          .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
              console.warn(`Failed to subscribe to realtime updates: ${status}`);
              // Keep polling enabled if subscription fails
              setUsePolling(true);
            } else {
              console.debug('Successfully subscribed to realtime updates');
              // Keep polling as a backup even if subscription works
              setUsePolling(true);
            }
          });
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        // Ensure polling is enabled if there's an error
        setUsePolling(true);
      }
    };
    
    setupRealtimeSubscription();
    
    // Cleanup function
    return () => {
      clearInterval(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [recordingId, initialStatus, status, onStatusChange]);
  
  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (status === 'completed') {
    return (
      <div className="flex items-center">
        <Badge variant="default">Completed</Badge>
      </div>
    )
  }
  
  if (status === 'failed') {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="destructive">Failed</Badge>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
  
  if (status === 'transcribing') {
    // Progress should max out at 95% to indicate it's still working
    const progressValue = Math.min(elapsed * 1, 95);
    
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing
          </Badge>
          <span className="text-xs text-muted-foreground">{formatElapsedTime(elapsed)}</span>
        </div>
        <Progress value={progressValue} className="h-1" />
        <p className="text-xs text-muted-foreground">This may take a few minutes depending on file size</p>
      </div>
    )
  }
  
  return (
    <div className="flex items-center">
      <Badge variant="outline">{status || 'pending'}</Badge>
    </div>
  )
} 