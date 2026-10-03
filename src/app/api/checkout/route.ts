import { NextResponse } from 'next/server'
import { checkoutSchema } from '@/lib/schemas'
import { supabaseAdmin } from '@/lib/supabase/server'
import { DELIVERY_TIME_WINDOWS, DEFAULT_DELIVERY_CHARGE_KOBO } from '@/lib/delivery-config'

const jsonOptions = (value: unknown): any[] => (Array.isArray(value) ? value : [])

const lagosNow = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date())
    .reduce((o: any, p) => ({ ...o, [p.type]: p.value }), {})

export async function POST(req: Request) {
  try {
    const db = supabaseAdmin()

    // 1. Authenticate user
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Sign in to place an order.' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to place an order.' }, { status: 401 })
    }

    // 2. Validate input schema
    const rawBody = await req.json().catch(() => null)
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const parsed = checkoutSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstErrorMessage =
        parsed.error.issues[0]?.message || 'Please check your billing and delivery details.'
      return NextResponse.json(
        {
          error: firstErrorMessage,
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const input = parsed.data
    const isPickup = input.fulfillment_type === 'pickup'
    const idempotencyKey =
      input.idempotency_key?.trim() ||
      req.headers.get('idempotency-key')?.trim() ||
      (typeof rawBody?.idempotency_key === 'string' ? rawBody.idempotency_key.trim() : null)

    if (!idempotencyKey || idempotencyKey.length > 128) {
      return NextResponse.json({ error: 'A checkout idempotency key is required.' }, { status: 400 })
    }

    // 3. Idempotency Check: check if order already exists for this idempotency key
    if (idempotencyKey) {
      const { data: existingOrder, error: existingOrderError } = await db
        .from('orders')
        .select('id, order_number, total_kobo, status, payment_status, created_at')
        .eq('user_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existingOrderError) throw existingOrderError

      if (existingOrder) {
        if (existingOrder.status === 'paid' || existingOrder.payment_status === 'success') {
          return NextResponse.json({
            order_number: existingOrder.order_number,
            already_paid: true,
          })
        }
        return NextResponse.json(
          { order_number: existingOrder.order_number, error: 'This checkout is already being processed. You can retry payment from your order.' },
          { status: 409 }
        )
      }
    }

    // 4. Load user profile for default information
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) throw profileError

    // 5. Authoritative price recalculation from database catalog
    const ids = [...new Set(input.items.map(i => i.productId))]
    const { data: products, error: productError } = await db
      .from('products')
      .select(
        'id,name,slug,active,lead_days,product_variants(id,name,price_kobo,active),customizations(id,kind,label,options,fee_kobo,active)'
      )
      .in('id', ids)

    if (productError) throw productError

    let subtotal = 0
    const snapshots: any[] = []
    let earliestLead = 0

    for (const line of input.items) {
      const product = products?.find(p => p.id === line.productId)
      const variant = product?.product_variants?.find(
        (v: any) => v.id === line.variantId && v.active
      )

      if (!product?.active || !variant) {
        return NextResponse.json(
          { error: 'A selected cake or size is no longer available.' },
          { status: 409 }
        )
      }

      earliestLead = Math.max(earliestLead, Number(product.lead_days) || 0)
      const choices = line.customization?.choices || {}
      const selected: any[] = []
      let optionFees = 0

      for (const [customizationId, values] of Object.entries(choices)) {
        const group = product.customizations?.find(
          (c: any) => c.id === customizationId && c.active
        )
        if (!group || !Array.isArray(values) || values.length > (group.kind === 'addon' ? 30 : 1)) {
          return NextResponse.json(
            { error: 'A selected cake option is no longer available.' },
            { status: 409 }
          )
        }

        for (const value of values) {
          const option =
            group &&
            jsonOptions(group.options).find(
              (o: any) =>
                (typeof o === 'string' ? o : String(o?.value ?? o?.name ?? o?.label ?? '')) ===
                value
            )
          if (!option) {
            return NextResponse.json(
              { error: 'A selected cake option is no longer available.' },
              { status: 409 }
            )
          }

          const fee = Math.max(0, Number((option as any)?.fee_kobo ?? group.fee_kobo) || 0)
          optionFees += fee
          selected.push({
            kind: group.kind,
            label: group.label,
            value:
              typeof option === 'string'
                ? option
                : String((option as any)?.label ?? (option as any)?.name ?? value),
            fee_kobo: fee,
          })
        }
      }

      const base = Number(variant.price_kobo)
      const unit = base + optionFees
      subtotal += unit * line.quantity
      snapshots.push({
        product_id: product.id,
        product_snapshot: { name: product.name, slug: product.slug },
        variant_snapshot: {
          id: variant.id,
          name: variant.name,
          price_kobo: unit,
          base_price_kobo: base,
        },
        customization: { message: line.customization?.message || '', choices: selected },
        quantity: line.quantity,
        line_total_kobo: unit * line.quantity,
      })
    }

    // 6. Fulfillment calculations & validations (zero delivery_zone dependencies)
    let deliveryCharge = 0
    let deliveryDate: string | null = null
    let deliveryWindow: string = 'Store Pickup'
    let deliveryAddress: string | null = null

    if (!isPickup) {
      // Home Delivery mode: lead-time and window validation
      const now = lagosNow()
      const today = `${now.year}-${now.month}-${now.day}`
      const orderDate = new Date(`${input.delivery_date}T00:00:00`)
      const minDate = new Date(`${today}T00:00:00`)
      minDate.setDate(minDate.getDate() + earliestLead)

      if (!Number.isFinite(orderDate.getTime()) || orderDate < minDate) {
        return NextResponse.json(
          {
            error: `Please choose a delivery date at least ${earliestLead} day${
              earliestLead === 1 ? '' : 's'
            } from today.`,
          },
          { status: 400 }
        )
      }

      if (
        !input.delivery_window ||
        !(DELIVERY_TIME_WINDOWS as readonly string[]).includes(input.delivery_window)
      ) {
        return NextResponse.json(
          { error: 'Please choose an available delivery time window.' },
          { status: 400 }
        )
      }

      deliveryCharge = DEFAULT_DELIVERY_CHARGE_KOBO
      deliveryDate = input.delivery_date || null
      deliveryWindow = input.delivery_window
      deliveryAddress = input.address || null
    }

    // Authoritative total calculation
    const total = subtotal + deliveryCharge

    const firstName = input.first_name.trim()
    const lastName = input.last_name.trim()
    const customerName = `${firstName} ${lastName}`
    const customerEmail = user.email || input.email.trim().toLowerCase()
    const customerPhone = input.phone.trim() || profile?.phone || ''
    const country = input.country?.trim() || 'Nigeria'

    // The database function atomically creates the order, items, and history. Do
    // not fall back to independent inserts: a partial order cannot be paid safely.
    let order: any
    {
      const rpcRes = await db.rpc('create_speedcake_order', {
        buyer_id: user.id,
        customer_name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryAddress || '',
        city: input.city.trim(),
        state: input.state.trim(),
        landmark: input.landmark?.trim() || '',
        instructions: input.instructions?.trim() || '',
        delivery_date: deliveryDate,
        delivery_window: deliveryWindow,
        zone_id: null,
        delivery_charge_kobo: deliveryCharge,
        total_kobo: total,
        items: snapshots,
        fulfillment_type: input.fulfillment_type,
        first_name: firstName,
        last_name: lastName,
        country: country,
        checkout_idempotency_key: idempotencyKey,
      })

      if (rpcRes.error) {
        console.error('Atomic order creation failed:', { code: rpcRes.error.code })
        return NextResponse.json({ error: 'Unable to create your order safely. Please try again.' }, { status: 503 })
      }
      order = rpcRes.data
    }

    // 9. Initialize Paystack payment cleanly
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        {
          order_number: order.order_number,
          error: 'Payment service is not configured. Please try again later.',
        },
        { status: 503 }
      )
    }

    const reference = `SC-${order.order_number}-${crypto.randomUUID()}`
    const { data: attempt, error: attemptError } = await db.rpc('create_speedcake_payment_attempt', {
      target_order: order.id,
      expected_user: user.id,
      payment_reference: reference,
    })
    if (attemptError) {
      console.error('Payment attempt creation failed:', { order: order.order_number, code: attemptError.code })
      return NextResponse.json({ error: 'Unable to create a safe payment attempt. Please try again.' }, { status: 503 })
    }
    const failAttempt = async () => {
      const { error } = await db.rpc('fail_speedcake_payment_attempt', { payment_id: attempt.id })
      if (error) throw error
    }
    let paystackResponse: Response
    try {
      paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: total,
          currency: 'NGN',
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/payment/return`,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            fulfillment_type: input.fulfillment_type,
          },
        }),
      })
    } catch (netErr) {
      console.error('Paystack network error:', netErr)
      try { await failAttempt() } catch (error) {
        console.error('Payment attempt failure recording failed', { reference, error })
        return NextResponse.json({ error: 'Payment initialization state is unavailable. Please contact support.' }, { status: 503 })
      }
      return NextResponse.json(
        {
          order_number: order.order_number,
          error: 'Could not connect to payment gateway. Please try again.',
        },
        { status: 502 }
      )
    }

    const body = await paystackResponse.json().catch(() => null)
    if (!paystackResponse.ok || !body?.status || !body?.data?.authorization_url) {
      console.error('Paystack initialization error:', body)
      try { await failAttempt() } catch (error) {
        console.error('Payment attempt failure recording failed', { reference, error })
        return NextResponse.json({ error: 'Payment initialization state is unavailable. Please contact support.' }, { status: 503 })
      }
      return NextResponse.json(
        {
          order_number: order.order_number,
          error: 'Payment initialization failed. Please try again.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      authorization_url: body.data.authorization_url,
      order_number: order.order_number,
    })
  } catch (e) {
    console.error('checkout error', e)
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    )
  }
}
