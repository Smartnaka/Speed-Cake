import { supabaseAdmin } from './supabase/server.ts'
import type { StoreSettingsInput } from './schemas.ts'

export interface StoreSettings extends StoreSettingsInput {
  id: 'store'
  created_at: string
  updated_at: string
}

const settingsFields = 'id, store_name, store_email, store_phone, store_address, city, state, country, support_email, support_phone, created_at, updated_at'

/** Reads the sole operational settings record. No defaults are fabricated if it is absent. */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supabaseAdmin().from('store_settings').select(settingsFields).eq('id', 'store').maybeSingle()
  if (error) throw error
  return data as StoreSettings | null
}

export async function updateStoreSettings(input: StoreSettingsInput): Promise<StoreSettings | null> {
  const { data, error } = await supabaseAdmin()
    .from('store_settings')
    .upsert({ id: 'store', ...input }, { onConflict: 'id' })
    .select(settingsFields)
    .maybeSingle()
  if (error) throw error
  return data as StoreSettings | null
}
