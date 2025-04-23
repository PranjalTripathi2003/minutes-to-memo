"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, File, FileText, Plus, Trash2, CircleOff, CircleAlert, Bug } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-context"
import { formatDistanceToNow } from "date-fns"
import { SummaryCard } from "@/components/summary-card"
import { getFileUrl, deleteFile } from "@/lib/storage-utils"
import { STORAGE_BUCKETS } from "@/lib/supabase-config"
import { toast } from "sonner"
import { TranscriptionStatus } from "@/components/transcription-status"
import { TranscriptViewer } from "@/components/transcript-viewer"
import { useRouter } from "next/navigation"

type Recording = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  status: string
  created_at: string
  duration?: number
  file_path?: string
}

type Summary = {
  id: string
  recording_id: string
  title?: string
  main_points?: string[]
  action_items?: string[]
  participants?: string[]
  general_notes?: string
  created_at: string
}

export default function DashboardPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      // Only show loading state on first load, not during polling updates
      if (recordings.length === 0) {
        setLoading(true);
      }

      // Fetch recordings
      const { data: recordingsData, error: recordingsError } = await supabase
        .from("recordings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (recordingsError) throw recordingsError

      // Fetch summaries
      const { data: summariesData, error: summariesError } = await supabase
        .from("summaries")
        .select("*")
        .in("recording_id", recordingsData?.map((r) => r.id) || [])

      if (summariesError) throw summariesError

      // Check for transcriptions for recordings with status 'completed'
      const recordingsWithTranscriptions = [...(recordingsData || [])];
      
      // Check if there are any recordings that have been completed but don't have summaries yet
      const needsTranscriptionCheck = recordingsWithTranscriptions.some(
        rec => rec.status === 'completed' && !summariesData?.some(sum => sum.recording_id === rec.id)
      );
      
      if (needsTranscriptionCheck) {
        // Fetch transcriptions for completed recordings
        const { data: transcriptionsData } = await supabase
          .from("transcriptions")
          .select("*")
          .in("recording_id", recordingsData?.map((r) => r.id) || []);
          
        console.log("Found transcriptions:", transcriptionsData);
      }

      // Update recordings without resetting the TranscriptionStatus
      setRecordings(prevRecordings => {
        if (prevRecordings.length === 0) {
          // First load, just set the new data
          return recordingsData || [];
        } else {
          // Subsequent polling updates, update statuses but maintain UI state
          return recordingsData?.map(newRec => {
            // Find the previous recording with the same ID
            const prevRec = prevRecordings.find(p => p.id === newRec.id);
            
            // If status changed from transcribing to failed/completed, use new data
            if (prevRec?.status === 'transcribing' && 
                (newRec.status === 'completed' || newRec.status === 'failed')) {
              return newRec;
            }
            
            // If status is the same, keep the same object to prevent UI resets
            if (prevRec && prevRec.status === newRec.status) {
              return prevRec;
            }
            
            // Otherwise use the new data
            return newRec;
          }) || [];
        }
      });
      
      setSummaries(summariesData || [])

      // Set the first recording as selected if available
      if (recordingsData && recordingsData.length > 0 && !selectedRecording) {
        setSelectedRecording(recordingsData[0].id)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch recordings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings();
    // Only run this effect when the user changes
  }, [user]);
  
  // Separate polling effect
  useEffect(() => {
    // Check if there are any recordings being processed
    const hasProcessingRecordings = recordings.some(recording => 
      recording.status === 'transcribing' || recording.status === 'processing'
    );
    
    let interval: NodeJS.Timeout | null = null;
    
    if (hasProcessingRecordings) {
      console.debug("Setting up polling for processing recordings");
      interval = setInterval(() => {
        console.debug("Polling for recording updates...");
        fetchRecordings();
      }, 10000); // Poll less frequently (every 10 seconds)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
        console.debug("Clearing polling interval");
      }
    };
    // Only set up polling when the recording statuses change (not the entire recordings object)
  }, [recordings.map(r => r.status).join(',')]);

  const selectedSummary = summaries.find((s) => s.recording_id === selectedRecording)
  const selectedRecordingData = recordings.find((r) => r.id === selectedRecording)

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return

    try {
      // Get the recording to delete
      const recordingToDelete = recordings.find(r => r.id === recordingId)
      if (!recordingToDelete || !recordingToDelete.file_path) {
        throw new Error("Recording not found")
      }

      // Delete from storage first
      const { error: storageError } = await deleteFile(
        STORAGE_BUCKETS.RECORDINGS,
        recordingToDelete.file_path
      )

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from("recordings")
        .delete()
        .eq("id", recordingId)

      if (dbError) throw dbError

      // Update state
      setRecordings(recordings.filter(r => r.id !== recordingId))

      // If this was the selected recording, select another one
      if (selectedRecording === recordingId) {
        const remainingRecordings = recordings.filter(r => r.id !== recordingId)
        setSelectedRecording(remainingRecordings.length > 0 ? remainingRecordings[0].id : null)
      }

      toast.success("Recording deleted successfully")
    } catch (error) {
      console.error("Error deleting recording:", error)
      toast.error("Failed to delete recording")
    }
  }

  const handleDownloadRecording = async (recording: Recording) => {
    if (!recording.file_path) {
      toast.error("File path not found")
      return
    }

    try {
      // Get a signed URL for the file
      const { signedUrl, error } = await getFileUrl(STORAGE_BUCKETS.RECORDINGS, recording.file_path, 60, true)

      if (error || !signedUrl) {
        throw new Error("Failed to get download URL")
      }

      // Create a temporary link and trigger the download
      const link = document.createElement('a')
      link.href = signedUrl
      link.download = recording.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Download started")
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Failed to download file")
    }
  }

  const handleTranscribe = async (recordingId: string) => {
    if (!recordingId) return

    try {
      setIsTranscribing(true)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordingId }),
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Check if the error is related to missing database tables
        if (error.error && (
          error.error.includes('table does not exist') || 
          error.error.includes('Database tables not properly set up')
        )) {
          toast.error('Database tables missing! Redirecting to setup page...')
          // Redirect to the database setup page
          setTimeout(() => {
            router.push('/database-setup')
          }, 2000)
          return
        }
        
        throw new Error(error.error || 'Failed to start transcription')
      }

      const result = await response.json()
      toast.success("Transcription process started")

      // Refresh the recordings list to show updated status
      if (user) {
        const { data: updatedRecordings } = await supabase
          .from("recordings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (updatedRecordings) {
          setRecordings(updatedRecordings)
        }
      }
    } catch (error: any) {
      console.error("Error starting transcription:", error)
      toast.error(error.message || "Failed to start transcription")
    } finally {
      setIsTranscribing(false)
    }
  }

  const checkTranscriptionStatus = async (recordingId: string) => {
    if (!recordingId) return;
    
    try {
      const response = await fetch(`/api/check-transcription?recordingId=${recordingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check transcription status');
      }
      
      const result = await response.json();
      console.log('Transcription debug info:', JSON.stringify(result, null, 2));
      
      // Show the result to the user
      toast.info(
        <div className="space-y-2">
          <div><strong>Recording Status:</strong> {result.recording.status}</div>
          {result.recording.error && (
            <div className="text-destructive"><strong>Error:</strong> {result.recording.error}</div>
          )}
          {result.transcription ? (
            <div>
              <div><strong>Transcription Found:</strong> {new Date(result.transcription.created_at).toLocaleString()}</div>
              <div><strong>Length:</strong> {result.transcription.content.length} chars</div>
            </div>
          ) : (
            <div className="text-amber-500">No transcription found in database</div>
          )}
        </div>
      );
      
    } catch (error: any) {
      console.error('Error checking transcription:', error);
      toast.error(error.message || 'Failed to check transcription status');
    }
  };

  // Handler to trigger summarization
  const handleSummarize = async (recordingId: string) => {
    if (!recordingId) return;
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start summarization');
      }
      const data = await res.json();
      toast.success('Summary generated!');
      // Refresh recordings and summaries
      fetchRecordings();
    } catch (err: any) {
      console.error('Error starting summarization:', err);
      toast.error(err.message || 'Failed to summarize');
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/upload">
              <Plus className="mr-2 h-4 w-4" />
              New Recording
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading your recordings...</p>
          </div>
        ) : recordings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No recordings yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first meeting recording to get started</p>
              <Button asChild>
                <Link href="/upload">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Recording
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Your Recordings</CardTitle>
                  <CardDescription>Select a recording to view its summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className={`p-3 rounded-lg border ${
                          selectedRecording === recording.id
                            ? "bg-muted border-primary"
                            : "bg-card hover:bg-muted/50"
                        } cursor-pointer transition-colors mb-2`}
                      >
                        <div className="flex justify-between">
                          <div
                            className="flex items-center gap-3 flex-1"
                            onClick={() => setSelectedRecording(recording.id)}
                          >
                            <File className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{recording.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                              </p>
                              <div className="mt-1">
                                <TranscriptionStatus 
                                  recordingId={recording.id} 
                                  status={recording.status}
                                  onStatusChange={(newStatus) => {
                                    // Update recording in the local state
                                    const updatedRecordings = recordings.map(r => 
                                      r.id === recording.id ? { ...r, status: newStatus } : r
                                    );
                                    setRecordings(updatedRecordings);
                                    
                                    // If status is completed, refresh all data
                                    if (newStatus === 'completed') {
                                      fetchRecordings();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadRecording(recording)}
                              title="Download recording"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {recording.status !== 'transcribing' && recording.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500"
                                onClick={() => handleTranscribe(recording.id)}
                                disabled={isTranscribing}
                                title="Transcribe recording"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {recording.status === 'completed' && !summaries.some(s => s.recording_id === recording.id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-500"
                                onClick={() => handleSummarize(recording.id)}
                                title="Summarize recording"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                checkTranscriptionStatus(recording.id);
                              }}
                              title="Debug transcription status"
                            >
                              <Bug className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteRecording(recording.id)}
                              title="Delete recording"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2">
              {selectedRecording ? (
                selectedRecordingData?.status === 'completed' ? (
                  <div className="space-y-6">
                    <TranscriptViewer recordingId={selectedRecording} />
                    {selectedSummary && (
                      <SummaryCard
                        summary={selectedSummary}
                        recording={selectedRecordingData}
                      />
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing</CardTitle>
                      <CardDescription>This recording is still being processed. Check back soon.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-medium mb-2">Summary not available yet</h3>
                        <p className="text-muted-foreground">
                          We're still processing this recording. This may take a few minutes.
                        </p>
                        {selectedRecordingData && selectedRecordingData.status === 'transcribing' && (
                          <div className="mt-4 w-full max-w-md">
                            <TranscriptionStatus 
                              recordingId={selectedRecordingData.id} 
                              status={selectedRecordingData.status}
                              onStatusChange={(newStatus) => {
                                // If status changes to completed, refresh all data
                                if (newStatus === 'completed') {
                                  fetchRecordings();
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No recording selected</h3>
                    <p className="text-muted-foreground">Select a recording from the list to view its summary</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

