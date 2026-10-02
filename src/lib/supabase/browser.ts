'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export const supabaseBrowser = () => {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured yet.')
  client = createClient(url, key)
  return client
}
