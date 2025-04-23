"use client"

import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Code, Database, FileCode, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DatabaseSetupPage() {
  const router = useRouter()
  
  // SQL setup script
  const setupScript = `-- Create transcriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add error_message column to recordings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'recordings' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE recordings ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Create summaries table if it doesn't exist  
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  title TEXT,
  main_points TEXT[],
  action_items TEXT[],
  participants TEXT[],
  general_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`

  // Copy setup script to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupScript)
      .then(() => {
        alert('SQL script copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy text: ', err)
        alert('Failed to copy. Please select the text manually.')
      })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-amber-500" />
              Database Setup Required
            </CardTitle>
            <CardDescription>
              The application detected that some required database tables are missing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You need to set up the required database tables in your Supabase project before using the application.
              Follow these steps to set up the database:
            </p>
            
            <ol className="list-decimal ml-5 space-y-2">
              <li>Log in to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase dashboard</a></li>
              <li>Go to the SQL Editor (Database &gt; SQL Editor)</li>
              <li>Copy the SQL script below</li>
              <li>Paste it into the SQL Editor</li>
              <li>Click "Run" to execute the SQL</li>
              <li>Return to this application and try again</li>
            </ol>
            
            <div className="bg-muted p-4 rounded-md relative">
              <Button 
                size="sm"
                variant="outline"
                className="absolute right-2 top-2"
                onClick={copyToClipboard}
              >
                Copy
              </Button>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {setupScript}
              </pre>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Try Again
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
} 