import { Navbar } from "@/components/navbar"
import { AuthForm } from "@/components/auth/auth-form"

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <AuthForm />
      </main>
    </div>
  )
}
