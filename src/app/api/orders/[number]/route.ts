import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { number: string } }) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })

    const db = supabaseAdmin()
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to view this order.' }, { status: 401 })
    }

    const { data, error } = await db
      .from('orders')
      .select(
        'id, order_number, status, payment_status, fulfillment_type, first_name, last_name, customer_name, customer_email, customer_phone, delivery_address, city, state, country, landmark, delivery_instructions, delivery_date, delivery_window, total_kobo, delivery_charge_kobo, subtotal_kobo, created_at, order_items(product_snapshot,variant_snapshot,quantity,line_total_kobo,customization), order_status_history(status,note,created_at)'
      )
      .eq('order_number', params.number)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'We could not find that order in your account.' },
        { status: 404 }
      )
    }

    const fulfillment_type =
      data.fulfillment_type || (data.delivery_window === 'Store Pickup' ? 'pickup' : 'delivery')
    const first_name =
      data.first_name || (data.customer_name ? data.customer_name.split(' ')[0] : '')
    const last_name =
      data.last_name ||
      (data.customer_name ? data.customer_name.split(' ').slice(1).join(' ') : '')
    const country = data.country || 'Nigeria'

    return NextResponse.json({
      order: {
        ...data,
        fulfillment_type,
        first_name,
        last_name,
        country,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Order tracking is unavailable right now.' },
      { status: 503 }
    )
  }
}
