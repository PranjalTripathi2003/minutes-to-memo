import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    // Check auth condition
    const isAuthPage = req.nextUrl.pathname === "/auth"
    const isProtectedRoute =
      req.nextUrl.pathname === "/upload" ||
      req.nextUrl.pathname === "/dashboard" ||
      req.nextUrl.pathname.startsWith("/api/")

    // If user is not signed in and the route is protected, redirect to auth page
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL("/auth", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and on the auth page, redirect to dashboard
    if (session && isAuthPage) {
      const redirectUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    return res
  }
}

export const config = {
  matcher: ["/upload", "/dashboard", "/auth", "/api/:path*"],
}
