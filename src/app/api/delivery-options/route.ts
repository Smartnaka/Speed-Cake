import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { DELIVERY_TIME_WINDOWS, DEFAULT_DELIVERY_CHARGE_KOBO } from '@/lib/delivery-config'

const localNow = () =>
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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const state = url.searchParams.get('state')?.trim()
  const city = url.searchParams.get('city')?.trim()
  const date = url.searchParams.get('date')?.trim()
  const productIds = (url.searchParams.get('products') || '').split(',').filter(Boolean)

  if (!state || !city) {
    return NextResponse.json({ windows: Array.from(DELIVERY_TIME_WINDOWS), charge_kobo: null })
  }

  try {
    const db = supabaseAdmin()
    const { data: zone } = await db
      .from('delivery_zones')
      .select('id, charge_kobo')
      .eq('state', state)
      .eq('city', city)
      .eq('active', true)
      .maybeSingle()

    const charge_kobo = zone ? Number(zone.charge_kobo) : null

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({
        windows: Array.from(DELIVERY_TIME_WINDOWS),
        charge_kobo,
      })
    }

    if (zone && productIds.length) {
      const { data: products } = await db
        .from('products')
        .select('id, lead_days')
        .in('id', productIds)
        .eq('active', true)

      if (products && products.length === new Set(productIds).size) {
        const lead = Math.max(...products.map(p => Number(p.lead_days) || 0))
        const now = localNow()
        const min = new Date(`${now.year}-${now.month}-${now.day}T00:00:00Z`)
        min.setUTCDate(min.getUTCDate() + lead)
        const requested = new Date(`${date}T00:00:00Z`)

        if (!Number.isFinite(requested.getTime()) || requested < min) {
          return NextResponse.json({ windows: [], charge_kobo })
        }

        const weekday = requested.getUTCDay()
        const { data: slots } = await db
          .from('delivery_slots')
          .select('window_name, weekday, cutoff_time')
          .eq('zone_id', zone.id)
          .eq('active', true)
          .or(`weekday.is.null,weekday.eq.${weekday}`)

        const today = `${now.year}-${now.month}-${now.day}`
        const dynamicWindows = [
          ...new Set(
            (slots || [])
              .filter(
                s =>
                  date !== today || !s.cutoff_time || `${now.hour}:${now.minute}:00` < s.cutoff_time
              )
              .map(s => s.window_name)
          ),
        ]

        if (dynamicWindows.length > 0) {
          return NextResponse.json({ windows: dynamicWindows, charge_kobo })
        }
      }
    }

    return NextResponse.json({
      windows: Array.from(DELIVERY_TIME_WINDOWS),
      charge_kobo: charge_kobo ?? DEFAULT_DELIVERY_CHARGE_KOBO,
    })
  } catch {
    return NextResponse.json({
      windows: Array.from(DELIVERY_TIME_WINDOWS),
      charge_kobo: DEFAULT_DELIVERY_CHARGE_KOBO,
    })
  }
}
