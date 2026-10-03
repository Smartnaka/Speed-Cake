import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { storeSettingsSchema } from '../src/lib/schemas.ts'

const read = path => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const valid = {
  store_name: 'Speed Cake', store_email: 'store@speedcake.test', store_phone: '+234 800 123 4567',
  store_address: '14 Bakery Lane', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
  support_email: 'help@speedcake.test', support_phone: '+234 800 765 4321',
}

test('store settings schema accepts the complete allow-listed operational payload', () => {
  assert.deepEqual(storeSettingsSchema.parse(valid), valid)
})

test('store settings schema rejects malformed, oversized, incorrectly typed, and unexpected input', () => {
  assert.equal(storeSettingsSchema.safeParse({ ...valid, store_email: 'not-an-email' }).success, false)
  assert.equal(storeSettingsSchema.safeParse({ ...valid, city: 42 }).success, false)
  assert.equal(storeSettingsSchema.safeParse({ ...valid, store_name: 'x'.repeat(151) }).success, false)
  assert.equal(storeSettingsSchema.safeParse({ ...valid, id: 'client-controlled' }).success, false)
})

test('settings API authenticates and authorizes GET and PATCH before database access', async () => {
  const source = await read('src/app/api/admin/settings/route.ts')
  assert.equal((source.match(/verifyAdminSession\(req\)/g) || []).length, 2)
  assert.equal((source.match(/if \(!auth\.ok\)/g) || []).length, 2)
  assert.match(source, /export async function GET/)
  assert.match(source, /export async function PATCH/)
  assert.match(source, /status: auth\.status/)
})

test('settings persistence uses the database singleton and returns only allow-listed settings fields', async () => {
  const source = await read('src/lib/store-settings-db.ts')
  assert.match(source, /supabaseAdmin\(\)/)
  assert.match(source, /\.from\('store_settings'\)/)
  assert.match(source, /\.eq\('id', 'store'\)/)
  assert.match(source, /\.upsert\(\{ id: 'store', \.\.\.input \}/)
  assert.match(source, /created_at, updated_at/)
  assert.doesNotMatch(source, /process\.env|localStorage|SUPABASE_SERVICE_ROLE_KEY|PAYSTACK_SECRET|DATABASE_URL/)
})

test('settings migration enforces one durable settings record and timestamps', async () => {
  const source = await read('supabase/migrations/202610030006_store_settings.sql')
  assert.match(source, /id text primary key default 'store' check \(id = 'store'\)/)
  assert.match(source, /created_at timestamptz not null default now\(\)/)
  assert.match(source, /updated_at timestamptz not null default now\(\)/)
  assert.match(source, /before update/)
})

test('admin fulfillment UI branches by stored fulfillment type without delivery zones or fabricated pickup addresses', async () => {
  const source = await read('src/app/admin/orders/[id]/page.tsx')
  assert.match(source, /order\.fulfillment_type === 'pickup'/)
  assert.match(source, /Fulfillment type: Pickup/)
  assert.match(source, /Fulfillment type: Delivery/)
  assert.match(source, /order\.delivery_address/)
  assert.doesNotMatch(source, /Speed Cake Main Bakery|14 Admiralty Way|delivery_zone_id|delivery_zones|delivery_slots/)
})
