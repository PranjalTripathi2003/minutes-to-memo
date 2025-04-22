"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/supabase-config"
import { toast } from "sonner"

interface FileUploaderProps {
  onFileChange: (file: File | null) => void
}

export function FileUploader({ onFileChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload MP3, MP4, or WAV files.")
      return false
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
      return false
    }

    return true
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]

      if (validateFile(droppedFile)) {
        onFileChange(droppedFile)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]

      if (validateFile(selectedFile)) {
        onFileChange(selectedFile)
      }
    }
  }

  const handleButtonClick = () => {
    // Programmatically click the file input when the button is clicked
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-medium mb-1">Drop your file here or click to browse</p>
          <p className="text-sm text-muted-foreground">Supports MP3, MP4, and WAV files up to 500MB</p>
        </div>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          className="sr-only"
          accept="audio/*,video/*"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleButtonClick}
        >
          Browse Files
        </Button>
      </div>
    </div>
  )
}
