import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'

const read = path => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin order APIs authorize before reading order data and do not expose internal errors', async () => {
  const [list, detail, status] = await Promise.all([
    read('src/app/api/admin/orders/route.ts'),
    read('src/app/api/admin/orders/[id]/route.ts'),
    read('src/app/api/admin/orders/[id]/status/route.ts'),
  ])
  for (const source of [list, detail, status]) {
    assert.match(source, /verifyAdminSession\(req\)/)
    assert.match(source, /if \(!auth\.ok\)/)
  }
  assert.match(status, /expected_updated_at/)
  assert.match(status, /status: 409/)
  assert.doesNotMatch(list, /err instanceof Error \? err\.message/)
  assert.doesNotMatch(detail, /err instanceof Error \? err\.message/)
})

test('admin order data is database-backed, server-filtered, and has no in-memory fallback or delivery-zone dependency', async () => {
  const source = await read('src/lib/orders-db.ts')
  assert.match(source, /supabaseAdmin\(\)/)
  assert.match(source, /\.range\(from, from \+ limit - 1\)/)
  assert.match(source, /\.ilike\('reference'/)
  assert.match(source, /\.from\('orders'\)/)
  assert.doesNotMatch(source, /initialOrders|getLocalOrdersStore|isSupabaseConfigured|delivery_zone_id/)
})

test('status changes use one locked RPC with audit history and optimistic concurrency', async () => {
  const source = await read('supabase/migrations/202610030005_admin_order_status_concurrency.sql')
  assert.match(source, /for update/)
  assert.match(source, /expected_updated_at/)
  assert.match(source, /order_status_history/)
  assert.match(source, /audit_log/)
  assert.doesNotMatch(source, /payment_status|amount_kobo|reference/)
})
