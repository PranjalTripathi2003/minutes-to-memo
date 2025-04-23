"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { FileUploader } from "@/components/file-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { File, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-context"
import { uploadFile } from "@/lib/storage-utils"
import { STORAGE_BUCKETS, MAX_FILE_SIZE } from "@/lib/supabase-config"
import { toast } from "sonner"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const { user } = useAuth()

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return
    }
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file || !user) return

    try {
      setUploading(true)
      setProgress(0)

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const filePath = `recordings/${user.id}/${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await uploadFile(
        STORAGE_BUCKETS.RECORDINGS,
        filePath,
        file,
        (progress) => {
          // Update progress directly from the upload
          setProgress(progress)
        }
      )

      if (uploadError) throw uploadError

      // Create record in the database
      const { error: dbError } = await supabase.from("recordings").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        status: "processing",
      })

      if (dbError) throw dbError

      setProgress(100)
      toast.success("File uploaded successfully!")

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (error: any) {
      console.error("Error uploading file:", error)
      
      setUploading(false)
      setProgress(0)
      
      // Display appropriate error message
      if (error.message?.includes("size")) {
        toast.error(error.message)
      } else if (error.message?.includes("storage limit")) {
        toast.error("Storage quota exceeded. Please contact support.")
      } else if (error.message?.includes("not found")) {
        toast.error("Storage bucket not found. Please contact support.")
      } else {
        toast.error("Error uploading file. Please try again.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Upload Meeting Recording</h1>

        {!uploading ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload Recording</CardTitle>
              <CardDescription>
                Upload your meeting recording to get started. We support MP3, MP4, and WAV files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader onFileChange={handleFileChange} />

              {file && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-md bg-primary/10 p-2">
                      <File className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </div>
                </div>
              )}

              <Button className="w-full" disabled={!file} onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Start Processing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Processing Your File</CardTitle>
              <CardDescription>We're uploading and preparing your file for processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading file</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">{file && (file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
