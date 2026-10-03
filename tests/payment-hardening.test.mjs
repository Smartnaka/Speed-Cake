import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { isPaymentReference, paymentMatchesLocalRecord } from '../src/lib/paystack.ts'

test('payment references have a strict server-side format', () => {
  assert.equal(isPaymentReference('SC-ORDER-550e8400-e29b-41d4-a716-446655440000'), true)
  assert.equal(isPaymentReference('SC-ORDER'), false)
  assert.equal(isPaymentReference('not-a-paystack-reference'), false)
})

test('only an exact successful NGN Paystack transaction matches local financial records', () => {
  const transaction = {
    id: 12345,
    reference: 'SC-ORDER-550e8400-e29b-41d4-a716-446655440000',
    amount: 1250000,
    currency: 'NGN',
    status: 'success',
  }
  assert.equal(paymentMatchesLocalRecord(transaction, transaction.reference, 1250000, 1250000), true)
  assert.equal(paymentMatchesLocalRecord({ ...transaction, amount: 1 }, transaction.reference, 1250000, 1250000), false)
  assert.equal(paymentMatchesLocalRecord({ ...transaction, currency: 'USD' }, transaction.reference, 1250000, 1250000), false)
  assert.equal(paymentMatchesLocalRecord({ ...transaction, status: 'failed' }, transaction.reference, 1250000, 1250000), false)
  assert.equal(paymentMatchesLocalRecord({ ...transaction, reference: 'SC-OTHER-550e8400-e29b-41d4-a716-446655440000' }, transaction.reference, 1250000, 1250000), false)
})

test('confirmation remains a single atomic database RPC without API update fallbacks', async () => {
  const fs = await import('node:fs/promises')
  const [verify, webhook, migration] = await Promise.all([
    fs.readFile(new URL('../src/app/api/payments/verify/route.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/app/api/payments/webhook/route.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../supabase/migrations/202610030003_payment_hardening.sql', import.meta.url), 'utf8'),
  ])
  assert.match(verify, /rpc\('confirm_speedcake_payment'/)
  assert.match(webhook, /rpc\('confirm_speedcake_payment'/)
  assert.doesNotMatch(verify, /applying direct fallback|\.from\('payments'\)\.update/)
  assert.doesNotMatch(webhook, /applying fallback|\.from\('payments'\)\.update/)
  assert.match(migration, /select \* into p from public\.payments where id = payment_id for update/)
  assert.match(migration, /select \* into o from public\.orders where id = p\.order_id for update/)
  assert.match(migration, /payments_one_pending_attempt_idx/)
})
test('a retry atomically supersedes an abandoned pending attempt before creating the next one', async () => {
  const fs = await import('node:fs/promises')
  const migration = await fs.readFile(
    new URL('../supabase/migrations/202610030004_retry_supersedes_pending_attempt.sql', import.meta.url),
    'utf8'
  )
  assert.match(migration, /select \* into o from public\.orders where id = target_order for update/)
  assert.match(migration, /update public\.payments\s+set status = 'failed'\s+where order_id = o\.id and status = 'pending'/)
  assert.match(migration, /insert into public\.payments\(order_id, reference, amount_kobo, currency, status\)/)
})

test('payment endpoints never log Paystack response bodies or raw gateway errors', async () => {
  const sources = await Promise.all([
    fs.readFile(new URL('../src/app/api/checkout/route.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/app/api/orders/[number]/payment/route.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/app/api/payments/verify/route.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/app/api/payments/webhook/route.ts', import.meta.url), 'utf8'),
  ])
  for (const source of sources) {
    assert.doesNotMatch(source, /console\.error\([^\n]*:\s*body/)
    assert.doesNotMatch(source, /console\.error\([^\n]*,\s*(?:netErr|error|err)\)/)
  }
})
