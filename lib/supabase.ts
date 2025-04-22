"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create a single supabase client for the browser
export const supabase = createClientComponentClient()
