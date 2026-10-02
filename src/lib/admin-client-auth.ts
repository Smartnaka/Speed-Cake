import { supabaseBrowser } from '@/lib/supabase/browser'

export async function getAdminAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabaseBrowser().auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch {}
  return {}
}
