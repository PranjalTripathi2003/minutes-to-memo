import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies as nextCookies } from "next/headers"

export function createServerClient() {
  // Pass cookies via callback to avoid synchronous cookies() calls in Next.js
  return createRouteHandlerClient({
    cookies: () => nextCookies()
  })
}
