import { NextResponse } from 'next/server'
import { DELIVERY_TIME_WINDOWS, DEFAULT_DELIVERY_CHARGE_KOBO } from '@/lib/delivery-config'

/**
 * Legacy delivery options endpoint.
 * Retained for backwards compatibility with any external clients,
 * but no longer depends on delivery_zones or delivery_slots.
 */
export async function GET() {
  return NextResponse.json({
    windows: Array.from(DELIVERY_TIME_WINDOWS),
    charge_kobo: DEFAULT_DELIVERY_CHARGE_KOBO,
  })
}
