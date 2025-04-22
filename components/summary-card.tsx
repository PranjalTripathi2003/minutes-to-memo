"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, FileText, ArrowRight, Download, Share2, Save } from "lucide-react"
import { getFileUrl } from "@/lib/storage-utils"
import { STORAGE_BUCKETS } from "@/lib/supabase-config"
import { toast } from "sonner"

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

interface SummaryCardProps {
  summary: {
    id: string
    recording_id: string
    title?: string
    main_points?: string[]
    action_items?: string[]
    participants?: string[]
    general_notes?: string
  }
  recording?: Recording | null
}

export function SummaryCard({ summary, recording }: SummaryCardProps) {
  const handleDownloadRecording = () => {
    if (!recording || !recording.file_path) {
      toast.error("Recording file not available")
      return
    }

    try {
      const fileUrl = getFileUrl(STORAGE_BUCKETS.RECORDINGS, recording.file_path)
      const link = document.createElement('a')
      link.href = fileUrl
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summary.title || "Meeting Summary"}</CardTitle>
        <CardDescription>We've analyzed your meeting and extracted the key information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary.main_points && summary.main_points.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Key Points</h3>
            </div>
            <Textarea
              className="min-h-[100px]"
              placeholder="No key points found in this meeting."
              value={summary.main_points.join("\n- ")}
              readOnly
            />
          </div>
        )}

        {summary.action_items && summary.action_items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-medium">Action Items</h3>
            </div>
            <Textarea
              className="min-h-[100px]"
              placeholder="No action items found in this meeting."
              value={summary.action_items.join("\n- ")}
              readOnly
            />
          </div>
        )}

        {summary.participants && summary.participants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-medium">Participants</h3>
            </div>
            <Textarea
              className="min-h-[50px]"
              placeholder="No participants identified in this meeting."
              value={summary.participants.join(", ")}
              readOnly
            />
          </div>
        )}

        {summary.general_notes && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-medium">General Notes</h3>
            </div>
            <Textarea
              className="min-h-[100px]"
              placeholder="No general notes found in this meeting."
              value={summary.general_notes}
              readOnly
            />
          </div>
        )}

        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" onClick={handleDownloadRecording} disabled={!recording?.file_path}>
            <Download className="mr-2 h-4 w-4" />
            Download Recording
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share Summary
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
