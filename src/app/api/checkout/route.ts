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
    const rawBody = await req.json()
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

    // 3. Load user profile for default information
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    // 4. Validate products, variants, and customizations
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

    // 5. Fulfillment calculations & validations
    let deliveryCharge = 0
    let zoneId: string | null = null
    let deliveryDate: string | null = null
    let deliveryWindow: string = isPickup ? 'Store Pickup' : ''
    let deliveryAddress: string | null = null

    if (!isPickup) {
      // Delivery mode
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

      // Check delivery zone
      const { data: zone } = await db
        .from('delivery_zones')
        .select('id,charge_kobo')
        .eq('state', input.state.trim())
        .eq('city', input.city.trim())
        .eq('active', true)
        .maybeSingle()

      if (!zone) {
        return NextResponse.json(
          {
            error:
              'We do not deliver to that area yet. Please select an available delivery area or choose Store Pickup.',
          },
          { status: 400 }
        )
      }

      zoneId = zone.id
      deliveryCharge = Number(zone.charge_kobo)
      deliveryDate = input.delivery_date || null
      deliveryWindow = input.delivery_window
      deliveryAddress = input.address || null
    }

    // Total calculation (server-authoritative)
    const total = subtotal + deliveryCharge

    const firstName = input.first_name.trim()
    const lastName = input.last_name.trim()
    const customerName = `${firstName} ${lastName}`
    const customerEmail = user.email || input.email.trim().toLowerCase()
    const customerPhone = input.phone.trim() || profile?.phone || ''
    const country = input.country?.trim() || 'Nigeria'

    // 6. Create order (Attempt RPC first, with robust fallback)
    let order: any
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
      zone_id: zoneId,
      delivery_charge_kobo: deliveryCharge,
      total_kobo: total,
      items: snapshots,
      fulfillment_type: input.fulfillment_type,
      first_name: firstName,
      last_name: lastName,
      country: country,
    })

    if (rpcRes.error) {
      // Fallback: direct insert using service role if database RPC is an older version
      const { data: newOrder, error: insertErr } = await db
        .from('orders')
        .insert({
          user_id: user.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          city: input.city.trim(),
          state: input.state.trim(),
          landmark: input.landmark?.trim() || '',
          delivery_instructions: input.instructions?.trim() || '',
          delivery_zone_id: zoneId,
          delivery_date: deliveryDate,
          delivery_window: deliveryWindow,
          delivery_charge_kobo: deliveryCharge,
          subtotal_kobo: subtotal,
          total_kobo: total,
          fulfillment_type: input.fulfillment_type,
          first_name: firstName,
          last_name: lastName,
          country: country,
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      order = newOrder

      for (const snap of snapshots) {
        await db.from('order_items').insert({
          order_id: order.id,
          product_id: snap.product_id,
          product_snapshot: snap.product_snapshot,
          variant_snapshot: snap.variant_snapshot,
          customization: snap.customization,
          quantity: snap.quantity,
          line_total_kobo: snap.line_total_kobo,
        })
      }

      await db.from('order_status_history').insert({
        order_id: order.id,
        status: 'pending_payment',
        note: 'Order placed',
      })
    } else {
      order = rpcRes.data
    }

    // 7. Initialize Paystack payment
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        {
          order_number: order.order_number,
          error: 'Payment is not configured. Please try again later.',
        },
        { status: 503 }
      )
    }

    const reference = `SC-${order.order_number}-${crypto.randomUUID()}`
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
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
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/return`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          fulfillment_type: input.fulfillment_type,
        },
      }),
    })

    const body = await response.json()
    if (!response.ok || !body.status) {
      throw new Error('Paystack could not initialize payment')
    }

    const { error: paymentError } = await db.from('payments').insert({
      order_id: order.id,
      reference,
      amount_kobo: total,
      currency: 'NGN',
      status: 'pending',
    })

    if (paymentError) throw paymentError

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
