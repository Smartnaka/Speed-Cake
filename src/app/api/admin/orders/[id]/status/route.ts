import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { updateOrderStatusSchema } from '@/lib/schemas'
import { updateOrderStatus } from '@/lib/orders-db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = updateOrderStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updatedOrder = await updateOrderStatus(
      params.id,
      parsed.data.status,
      parsed.data.note,
      auth.user?.id || 'admin'
    )

    return NextResponse.json({ ok: true, order: updatedOrder })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update order status'
    const status = message.includes('Invalid order status transition') ? 400 : message === 'Order not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
