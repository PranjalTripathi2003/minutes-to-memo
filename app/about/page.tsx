import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Code, Zap, Sparkles } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container py-10">
        <div className="space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter">About Minutes to Memo</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how our AI-powered meeting assistant works behind the scenes
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Minutes to Memo transforms your meeting recordings into actionable summaries in just a few steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <div>
                    <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">1. Upload Your Recording</h3>
                    <p className="text-muted-foreground">
                      Upload your audio or video meeting file through our simple interface. 
                      We support various formats including MP3, MP4, WAV, and more.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">2. Automatic Transcription</h3>
                    <p className="text-muted-foreground">
                      Our system uses Deepgram, a powerful speech-to-text engine, to 
                      accurately transcribe your meeting audio into text.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3. AI Summary Generation</h3>
                    <p className="text-muted-foreground">
                      OpenAI's advanced language models analyze the transcript to extract key points, 
                      next steps, participants, and general notes from your meeting.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">4. Review & Export</h3>
                    <p className="text-muted-foreground">
                      Access your summaries in the dashboard, review the key information, 
                      and export them as PDFs for easy sharing with your team.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Technology Stack</CardTitle>
              <CardDescription>
                Minutes to Memo is built using modern technologies for reliability and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div>
                    <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                      <Code className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Application Stack</h3>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Frontend:</span> Next.js 14, React 19, Tailwind CSS</li>
                      <li><span className="font-medium text-foreground">Backend:</span> Next.js API Routes, Supabase</li>
                      <li><span className="font-medium text-foreground">Database:</span> PostgreSQL (via Supabase)</li>
                      <li><span className="font-medium text-foreground">Storage:</span> Supabase Storage</li>
                      <li><span className="font-medium text-foreground">Authentication:</span> Supabase Auth</li>
                      <li><span className="font-medium text-foreground">Speech-to-Text:</span> Deepgram</li>
                      <li><span className="font-medium text-foreground">AI Processing:</span> OpenAI API</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Minutes to Memo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
} 