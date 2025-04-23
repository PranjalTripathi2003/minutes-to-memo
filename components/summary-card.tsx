"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, FileText, ArrowRight, Download, Share2, Save } from "lucide-react"
import { getFileUrl } from "@/lib/storage-utils"
import { STORAGE_BUCKETS } from "@/lib/supabase-config"
import { toast } from "sonner"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { useRef } from "react"

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
    next_steps?: string[]
    participants?: string[]
    general_notes?: string
  }
  recording?: Recording | null
}

export function SummaryCard({ summary, recording }: SummaryCardProps) {
  const summaryRef = useRef<HTMLDivElement>(null)

  const handleDownloadRecording = () => {
    if (!recording || !recording.file_path) {
      toast.error("Recording file not available")
      return
    }

    try {
      getFileUrl(STORAGE_BUCKETS.RECORDINGS, recording.file_path)
        .then(({ signedUrl, error }) => {
          if (error || !signedUrl) {
            throw new Error("Failed to get download URL")
          }
          
          const link = document.createElement('a')
          link.href = signedUrl
          link.download = recording.file_name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          toast.success("Download started")
        })
        .catch(error => {
          console.error("Error getting signed URL:", error)
          toast.error("Failed to download file")
        })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Failed to download file")
    }
  }

  const handleExportPDF = async () => {
    if (!summaryRef.current) {
      toast.error("Could not generate PDF")
      return
    }

    try {
      toast.loading("Generating PDF...")
      
      const element = summaryRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 210  // A4 width in mm
      const imgHeight = canvas.height * imgWidth / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`)
      
      toast.dismiss()
      toast.success("PDF exported successfully")
    } catch (error) {
      console.error("PDF generation error:", error)
      toast.dismiss()
      toast.error("Failed to export PDF")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summary.title || "Meeting Summary"}</CardTitle>
        <CardDescription>We've analyzed your meeting and extracted the key information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div ref={summaryRef}>
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

          {summary.next_steps && summary.next_steps.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-medium">Next Steps</h3>
              </div>
              <Textarea
                className="min-h-[100px]"
                placeholder="No next steps found in this meeting."
                value={summary.next_steps.join("\n- ")}
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
        </div>

        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" onClick={handleDownloadRecording} disabled={!recording?.file_path}>
            <Download className="mr-2 h-4 w-4" />
            Download Recording
          </Button>
          <Button onClick={handleExportPDF}>
            <Save className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
