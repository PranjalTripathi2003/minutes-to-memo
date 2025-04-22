"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Home, Upload, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth/auth-context"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const isLandingPage = pathname === "/"

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-xl font-bold">Minutes to Memo</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
          {user && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <FileText className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <span>{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upload">Upload</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isLandingPage ? (
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/upload">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
