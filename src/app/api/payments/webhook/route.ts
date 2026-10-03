import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { paymentMatchesLocalRecord, isPaymentReference, verifyPaystackTransaction } from '@/lib/paystack'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const raw = Buffer.from(await req.arrayBuffer())
    const signature = req.headers.get('x-paystack-signature') || ''
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 })

    const expected = createHmac('sha512', secret).update(raw).digest('hex')
    const received = Buffer.from(signature, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    if (received.length !== expectedBuffer.length || !timingSafeEqual(received, expectedBuffer)) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
    }

    let event: any
    try { event = JSON.parse(raw.toString('utf8')) } catch { return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 }) }
    if (event?.event !== 'charge.success') return NextResponse.json({ received: true, ignored: true })

    const reference = event?.data?.reference
    if (!isPaymentReference(reference)) return NextResponse.json({ error: 'Invalid charge reference.' }, { status: 400 })

    const db = supabaseAdmin()
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('id, order_id, amount_kobo, status, orders(id, total_kobo)')
      .eq('reference', reference)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    if (payment.status === 'success') return NextResponse.json({ received: true, already_processed: true })

    let result
    try { result = await verifyPaystackTransaction(reference, secret) } catch {
      console.error('Webhook Paystack verification network failure', { reference })
      return NextResponse.json({ error: 'Verification service unavailable.' }, { status: 502 })
    }
    const order = payment.orders as any
    if (!result.response.ok || !result.body?.status || !order || !paymentMatchesLocalRecord(result.transaction, reference, payment.amount_kobo, order.total_kobo)) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 409 })
    }

    const { error: confirmError } = await db.rpc('confirm_speedcake_payment', { payment_id: payment.id, transaction_id: String(result.transaction!.id) })
    if (confirmError) {
      console.error('Atomic webhook confirmation failed', { reference, code: confirmError.code })
      return NextResponse.json({ error: 'Payment confirmation failed.' }, { status: 503 })
    }
    return NextResponse.json({ received: true })
  } catch {
    console.error('Webhook processing failed')
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
