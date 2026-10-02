import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { orderFilterSchema } from '@/lib/schemas'
import { getAdminOrders } from '@/lib/orders-db'

export async function GET(req: Request) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const rawParams = {
      search: url.searchParams.get('search') || url.searchParams.get('q') || undefined,
      orderStatus: url.searchParams.get('orderStatus') || url.searchParams.get('status') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') || undefined,
      page: url.searchParams.get('page') || 1,
      limit: url.searchParams.get('limit') || 20,
    }

    const parsed = orderFilterSchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await getAdminOrders(parsed.data)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve orders' },
      { status: 500 }
    )
  }
}
