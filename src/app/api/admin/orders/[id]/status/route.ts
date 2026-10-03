import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { updateOrderStatusSchema } from '@/lib/schemas'
import { updateOrderStatus } from '@/lib/orders-db'
import { sendOrderStatusUpdateEmail } from '@/lib/email/service'

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
      auth.user!.id,
      parsed.data.expected_updated_at
    )

    // Asynchronously dispatch customer status notification
    void sendOrderStatusUpdateEmail({
      orderIdOrNumber: updatedOrder.id,
      newStatus: parsed.data.status,
      note: parsed.data.note,
    }).catch(err => {
      console.error('Failed to dispatch status update email:', err)
    })

    return NextResponse.json({ ok: true, order: updatedOrder })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update order status'
    if (message === 'Order not found') return NextResponse.json({ error: message }, { status: 404 })
    if (message.includes('Invalid order status transition')) return NextResponse.json({ error: 'Invalid order status transition.' }, { status: 422 })
    if (message.includes('updated by another administrator')) return NextResponse.json({ error: 'This order changed since it was loaded. Refresh and try again.' }, { status: 409 })
    console.error('Admin order status update failed', err)
    return NextResponse.json({ error: 'Unable to update the order status.' }, { status: 500 })
  }
}
