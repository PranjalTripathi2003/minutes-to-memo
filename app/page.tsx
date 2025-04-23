import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { CheckCircle2, FileText, Zap } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Transform Meeting Recordings into Actionable Memos
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Minutes to Memo uses AI to automatically transcribe and summarize your meetings, extracting key
                  decisions, action items, and important notes.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg">
                  <Link href="/upload">Get Started</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-24 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter mb-4">How Minutes to Memo Works</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">Our AI-powered platform simplifies your meeting workflow in just a few steps</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Automatic Transcription</h3>
                  <p className="text-muted-foreground">
                    Upload audio or video files and get accurate transcriptions in minutes.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">AI-Powered Summaries</h3>
                  <p className="text-muted-foreground">
                    Our AI extracts the most important information from your meetings.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Actionable Insights</h3>
                  <p className="text-muted-foreground">
                    Get key decisions, next steps, and important notes in an organized format.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter mb-4">What Our Users Say</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">Join thousands of satisfied professionals who have transformed their meeting workflow</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2 h-12 w-12 flex items-center justify-center">
                      <span className="font-bold text-primary">JP</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Jane Porter</h4>
                      <p className="text-sm text-muted-foreground">Project Manager</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    "Minutes to Memo has revolutionized our team meetings. I can focus on the discussion instead of frantically taking notes."
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2 h-12 w-12 flex items-center justify-center">
                      <span className="font-bold text-primary">MS</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Mark Smith</h4>
                      <p className="text-sm text-muted-foreground">Product Designer</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    "The AI summaries are surprisingly accurate and save me hours of review time every week."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Ready to save time on meeting notes?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                  Join thousands of professionals who use Minutes to Memo to capture and organize their meeting
                  insights.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/upload">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Minutes to Memo. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:underline">
              Terms
            </Link>
            <Link href="#" className="hover:underline">
              Privacy
            </Link>
            <Link href="#" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
