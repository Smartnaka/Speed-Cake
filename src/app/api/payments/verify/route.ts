import { NextResponse } from 'next/server'
import { paymentMatchesLocalRecord, isPaymentReference, verifyPaystackTransaction } from '@/lib/paystack'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })

    const db = supabaseAdmin()
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const reference = body?.reference
    if (!isPaymentReference(reference)) return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 })

    // Ownership is checked before contacting Paystack so a customer cannot probe another order.
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('id, order_id, amount_kobo, status, orders(id, order_number, user_id, total_kobo, status, payment_status)')
      .eq('reference', reference)
      .maybeSingle()
    if (paymentError) throw paymentError
    if (!payment) return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })

    const order = payment.orders as any
    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'This order is not available to your account.' }, { status: 404 })
    }
    if (payment.status === 'success') {
      return NextResponse.json({ order_number: order.order_number, status: 'success', already_processed: true })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 })

    let result
    try { result = await verifyPaystackTransaction(reference, secret) } catch (error) {
      console.error('Paystack verification network failure', { reference, error })
      return NextResponse.json({ error: 'Unable to contact the payment provider. Please try again.' }, { status: 502 })
    }
    if (!result.response.ok || !result.body?.status || !paymentMatchesLocalRecord(result.transaction, reference, payment.amount_kobo, order.total_kobo)) {
      return NextResponse.json({ error: 'Payment is not confirmed for this order.' }, { status: 409 })
    }

    const { error: confirmError } = await db.rpc('confirm_speedcake_payment', {
      payment_id: payment.id,
      transaction_id: String(result.transaction!.id),
    })
    if (confirmError) {
      console.error('Atomic payment confirmation failed', { reference, code: confirmError.code })
      return NextResponse.json({ error: 'Payment was verified but is awaiting confirmation. Please try again shortly.' }, { status: 503 })
    }

    return NextResponse.json({ order_number: order.order_number, status: 'success', already_processed: false })
  } catch (error) {
    console.error('Payment verification error', error)
    return NextResponse.json({ error: 'Unable to verify payment yet. Please try again.' }, { status: 500 })
  }
}
