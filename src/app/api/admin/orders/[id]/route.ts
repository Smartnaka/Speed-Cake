import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { getAdminOrderById } from '@/lib/orders-db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const order = await getAdminOrderById(params.id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, order })
  } catch (err) {
    console.error('Admin order detail failed', err)
    return NextResponse.json(
      { error: 'Failed to fetch order details.' },
      { status: 500 }
    )
  }
}
