import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const db = supabaseAdmin()

    // 1. Authenticate customer
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })
    }

    // 2. Validate payment reference
    const body = await req.json().catch(() => null)
    const reference = body?.reference
    if (typeof reference !== 'string' || reference.length < 8 || reference.length > 120) {
      return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 })
    }

    // 3. Verify with Paystack server-side
    let verified: any
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${secret}` },
          cache: 'no-store',
        }
      )
      verified = await response.json()
    } catch (netErr) {
      console.error('Paystack verify fetch error:', netErr)
      return NextResponse.json(
        { error: 'Unable to connect to payment provider. Please try again.' },
        { status: 502 }
      )
    }

    if (!verified?.status || verified.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment is not confirmed yet.' }, { status: 409 })
    }

    if (verified.data?.currency !== 'NGN') {
      return NextResponse.json({ error: 'Invalid transaction currency.' }, { status: 400 })
    }

    // 4. Fetch payment record and verify order ownership and amounts
    const { data: p, error: payError } = await db
      .from('payments')
      .select('id, order_id, amount_kobo, status, orders(id, order_number, user_id, total_kobo, status, payment_status)')
      .eq('reference', reference)
      .maybeSingle()

    if (payError || !p) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }

    const order = p.orders as any
    if (!order || order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'This order is not available to your account.' },
        { status: 404 }
      )
    }

    // 5. Strict financial verification: amount paid must match both payment record and order total
    if (p.amount_kobo !== verified.data.amount || order.total_kobo !== verified.data.amount) {
      console.error('Payment amount mismatch:', {
        dbPayment: p.amount_kobo,
        dbOrder: order.total_kobo,
        paystack: verified.data.amount,
      })
      return NextResponse.json(
        { error: 'Payment details did not match the order.' },
        { status: 400 }
      )
    }

    // 6. Idempotency: if already confirmed, return success without duplicate writes
    if (p.status === 'success') {
      return NextResponse.json({
        order_number: order.order_number,
        status: 'success',
        already_processed: true,
      })
    }

    // 7. Confirm payment atomically via RPC with fallback
    const { error: confirmError } = await db.rpc('confirm_speedcake_payment', {
      payment_id: p.id,
      transaction_id: String(verified.data.id),
    })

    if (confirmError) {
      console.warn('confirm_speedcake_payment RPC error, applying direct fallback:', confirmError)
      await db
        .from('payments')
        .update({
          status: 'success',
          transaction_id: String(verified.data.id),
          verified_at: new Date().toISOString(),
        })
        .eq('id', p.id)

      await db
        .from('orders')
        .update({
          payment_status: 'success',
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.order_id)
        .eq('status', 'pending_payment')

      await db.from('order_status_history').insert({
        order_id: p.order_id,
        status: 'paid',
        note: 'Payment verified',
      })
    }

    return NextResponse.json({
      order_number: order.order_number,
      status: 'success',
      already_processed: false,
    })
  } catch (e) {
    console.error('payment verification error', e)
    return NextResponse.json(
      { error: 'Unable to verify payment yet. Check your account for the latest order status.' },
      { status: 500 }
    )
  }
}
