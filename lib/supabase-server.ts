import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

/**
 * Asynchronously create a Supabase client for Next.js route handlers,
 * ensuring cookies() is awaited rather than used synchronously.
 */
export async function createServerClient() {
  // Await the cookie store for proper dynamic cookies API
  const cookieStore = await cookies()
  // Initialize the Supabase client with the dynamic cookie store
  return createRouteHandlerClient({ cookies: () => cookieStore })
}
