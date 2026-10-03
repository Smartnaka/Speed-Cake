import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const raw = Buffer.from(await req.arrayBuffer())
    const signature = req.headers.get('x-paystack-signature') || ''
    const secret = process.env.PAYSTACK_SECRET_KEY

    if (!secret) {
      return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 })
    }

    // 1. Constant-time HMAC SHA512 signature verification
    const expected = createHmac('sha512', secret).update(raw).digest('hex')
    const sigBuf = Buffer.from(signature, 'utf8')
    const expBuf = Buffer.from(expected, 'utf8')

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Parse webhook JSON safely
    let event: any
    try {
      event = JSON.parse(raw.toString('utf8'))
    } catch {
      return NextResponse.json({ error: 'Malformed payload' }, { status: 400 })
    }

    if (event?.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const payload = event?.data
    if (!payload?.reference || typeof payload?.amount !== 'number') {
      return NextResponse.json({ error: 'Missing charge reference or amount' }, { status: 400 })
    }

    // 3. Re-verify transaction with Paystack API
    let verifyRes: any
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(payload.reference)}`,
        {
          headers: { Authorization: `Bearer ${secret}` },
          cache: 'no-store',
        }
      )
      verifyRes = await response.json()
    } catch (netErr) {
      console.error('Webhook Paystack verification call failed:', netErr)
      return NextResponse.json({ error: 'Verification service error' }, { status: 502 })
    }

    if (
      !verifyRes?.status ||
      verifyRes.data?.status !== 'success' ||
      verifyRes.data?.currency !== 'NGN' ||
      verifyRes.data?.amount !== payload.amount
    ) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // 4. Query payment record and compare authoritative amounts
    const db = supabaseAdmin()
    const { data: payment, error } = await db
      .from('payments')
      .select('id, order_id, amount_kobo, status, orders(id, total_kobo, status)')
      .eq('reference', payload.reference)
      .maybeSingle()

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const order = payment.orders as any
    if (
      payment.amount_kobo !== payload.amount ||
      (order && order.total_kobo !== payload.amount)
    ) {
      console.error('Webhook amount mismatch:', {
        dbPayment: payment.amount_kobo,
        dbOrder: order?.total_kobo,
        webhook: payload.amount,
      })
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // 5. Idempotent webhook handling
    if (payment.status === 'success') {
      return NextResponse.json({ received: true, already_processed: true })
    }

    // 6. Confirm payment via RPC with fallback
    const { error: rpcError } = await db.rpc('confirm_speedcake_payment', {
      payment_id: payment.id,
      transaction_id: String(payload.id),
    })

    if (rpcError) {
      console.warn('confirm_speedcake_payment RPC error in webhook, applying fallback:', rpcError)
      await db
        .from('payments')
        .update({
          status: 'success',
          transaction_id: String(payload.id),
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id)

      await db
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'success',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.order_id)
        .eq('status', 'pending_payment')

      await db.from('order_status_history').insert({
        order_id: payment.order_id,
        status: 'paid',
        note: 'Payment verified via webhook',
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
