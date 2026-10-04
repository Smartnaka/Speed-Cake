import { getResendClient, getEmailFromAddress, getStoreNotificationEmail } from './client.ts'
import { renderWelcomeEmailHtml, renderWelcomeEmailText } from './templates/welcome.ts'
import { renderOrderConfirmationHtml, renderOrderConfirmationText } from './templates/order-confirmation.ts'
import { renderOrderStatusEmailHtml, renderOrderStatusEmailText } from './templates/order-status.ts'
import { renderAdminNewOrderHtml, renderAdminNewOrderText } from './templates/admin-new-order.ts'
import { getAdminOrderById, type AdminOrderRecord } from '../orders-db.ts'
import { getStoreSettings } from '../store-settings-db.ts'
import { supabaseAdmin } from '../supabase/server.ts'

export interface EmailResult {
  ok: boolean
  skipped?: boolean
  already_sent?: boolean
  messageId?: string
  error?: string
}

/**
 * Sends a welcome email to a newly registered customer.
 */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    console.info('[Email] Resend API key not configured; skipping welcome email to:', params.to)
    return { ok: true, skipped: true }
  }

  try {
    const html = renderWelcomeEmailHtml({
      customerName: params.name,
      customerEmail: params.to,
    })
    const text = renderWelcomeEmailText({
      customerName: params.name,
      customerEmail: params.to,
    })

    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: [params.to],
      subject: `Welcome to Instant Cakes Delivery, ${params.name}!`,
      html,
      text,
    })

    if (error) {
      console.error('[Email] Resend error sending welcome email:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Email] Unexpected failure sending welcome email:', message)
    return { ok: false, error: message }
  }
}

/**
 * Sends an order confirmation email to the customer and alerts the bakery team.
 * Guaranteed idempotent via atomic confirmation_email_sent_at check on the orders table.
 */
export async function sendOrderConfirmationEmail(
  orderIdOrNumber: string
): Promise<EmailResult> {
  const db = supabaseAdmin()

  // 1. Fetch full order
  const order = await getAdminOrderById(orderIdOrNumber)
  if (!order) {
    console.warn('[Email] Cannot send confirmation: order not found for identifier:', orderIdOrNumber)
    return { ok: false, error: 'Order not found' }
  }

  // 2. Atomic check-and-set: ensure confirmation email is sent strictly ONCE
  const { data: claimed } = await db
    .from('orders')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('id', order.id)
    .is('confirmation_email_sent_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    console.info(`[Email] Confirmation email already dispatched for order ${order.order_number}; skipping duplicate.`)
    return { ok: true, already_sent: true }
  }

  // 3. Dispatch customer receipt
  const resend = getResendClient()
  if (!resend) {
    console.info('[Email] Resend not configured; skipping customer receipt for order:', order.order_number)
    return { ok: true, skipped: true }
  }

  try {
    const html = renderOrderConfirmationHtml(order)
    const text = renderOrderConfirmationText(order)

    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: [order.customer_email],
      subject: `Order Confirmed: ${order.order_number} — Instant Cakes Delivery`,
      html,
      text,
    })

    if (error) {
      console.error('[Email] Resend error sending order confirmation:', error)
      // Note: We don't clear confirmation_email_sent_at to avoid flood loops on permanent failure
      return { ok: false, error: error.message }
    }

    // 4. Asynchronously send admin notification to bakery team
    void sendAdminNewOrderAlert(order).catch(err => {
      console.error('[Email] Failed to notify admin team of new order:', err)
    })

    return { ok: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Email] Unexpected failure sending order confirmation:', message)
    return { ok: false, error: message }
  }
}

/**
 * Sends a notification alert to the bakery staff when a new order is paid.
 */
export async function sendAdminNewOrderAlert(
  order: AdminOrderRecord
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) return { ok: true, skipped: true }

  try {
    // Resolve store email from store_settings or fallback env
    const settings = await getStoreSettings().catch(() => null)
    const storeEmail = settings?.store_email || getStoreNotificationEmail()

    const html = renderAdminNewOrderHtml(order)
    const text = renderAdminNewOrderText(order)

    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: [storeEmail],
      subject: `[New Order] ${order.order_number} — ${order.customer_name}`,
      html,
      text,
    })

    if (error) {
      console.error('[Email] Error sending admin order alert:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Email] Error sending admin order alert:', message)
    return { ok: false, error: message }
  }
}

/**
 * Sends an email update to the customer when the admin changes order status.
 */
export async function sendOrderStatusUpdateEmail(params: {
  orderIdOrNumber: string
  newStatus: string
  previousStatus?: string
  note?: string | null
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    console.info('[Email] Resend not configured; skipping order status update email for:', params.orderIdOrNumber)
    return { ok: true, skipped: true }
  }

  const order = await getAdminOrderById(params.orderIdOrNumber)
  if (!order) {
    return { ok: false, error: 'Order not found' }
  }

  // Do not send status email if customer already received order confirmation for 'paid'
  if (params.newStatus === 'paid' || params.newStatus === 'pending_payment') {
    return { ok: true, skipped: true }
  }

  try {
    const html = renderOrderStatusEmailHtml({
      order,
      newStatus: params.newStatus,
      previousStatus: params.previousStatus,
      note: params.note,
    })
    const text = renderOrderStatusEmailText({
      order,
      newStatus: params.newStatus,
      note: params.note,
    })

    const statusLabel = params.newStatus.replaceAll('_', ' ')
    const { data, error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: [order.customer_email],
      subject: `Order Update: ${order.order_number} is ${statusLabel} — Instant Cakes Delivery`,
      html,
      text,
    })

    if (error) {
      console.error('[Email] Resend error sending status update email:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Email] Error sending status update email:', message)
    return { ok: false, error: message }
  }
}
