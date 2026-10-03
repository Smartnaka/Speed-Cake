import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { number: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Sign in to retry payment.' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to retry payment.' }, { status: 401 })
    }

    // 1. Fetch order belonging to this customer
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id, order_number, user_id, customer_email, total_kobo, status, payment_status, fulfillment_type')
      .eq('order_number', params.number)
      .eq('user_id', user.id)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // 2. Ensure order is in pending_payment state
    if (order.status !== 'pending_payment' || order.payment_status === 'success') {
      return NextResponse.json(
        { error: 'This order is already paid or cannot be paid.' },
        { status: 400 }
      )
    }

    // 3. Initialize new Paystack session for this existing order (no duplicate orders/items)
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        { error: 'Payment service is not configured. Please try again later.' },
        { status: 503 }
      )
    }

    const reference = `SC-${order.order_number}-${crypto.randomUUID()}`
    let paystackResponse: Response
    try {
      paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: order.customer_email,
          amount: order.total_kobo,
          currency: 'NGN',
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/payment/return`,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            fulfillment_type: order.fulfillment_type,
            is_retry: true,
          },
        }),
      })
    } catch (netErr) {
      console.error('Paystack retry network error:', netErr)
      return NextResponse.json(
        { error: 'Could not connect to payment gateway. Please try again.' },
        { status: 502 }
      )
    }

    const body = await paystackResponse.json().catch(() => null)
    if (!paystackResponse.ok || !body?.status || !body?.data?.authorization_url) {
      console.error('Paystack retry initialization error:', body)
      return NextResponse.json(
        { error: 'Payment initialization failed. Please try again.' },
        { status: 502 }
      )
    }

    // 4. Record new payment attempt for this order
    const { error: paymentError } = await db.from('payments').insert({
      order_id: order.id,
      reference,
      amount_kobo: order.total_kobo,
      currency: 'NGN',
      status: 'pending',
    })

    if (paymentError) {
      console.error('Payment record insert error:', paymentError)
      return NextResponse.json(
        { error: 'Unable to record payment session. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      authorization_url: body.data.authorization_url,
      reference,
      order_number: order.order_number,
    })
  } catch (err) {
    console.error('Payment retry error:', err)
    return NextResponse.json(
      { error: 'Unable to reinitialize payment. Please try again.' },
      { status: 500 }
    )
  }
}
