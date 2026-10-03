import { renderEmailLayout, escapeHtml } from './base-layout.ts'
import { getSiteBaseUrl } from '../client.ts'
import type { AdminOrderRecord } from '../../orders-db.ts'

export interface OrderStatusEmailData {
  order: AdminOrderRecord
  newStatus: string
  previousStatus?: string
  note?: string | null
}

const statusMeta: Record<string, { label: string; badgeColor: string; badgeBg: string; headline: string; message: string }> = {
  confirmed: {
    label: 'Confirmed',
    badgeColor: '#1e5437',
    badgeBg: '#eaf5ee',
    headline: 'Your order is confirmed!',
    message: 'Our bakery team has reviewed and confirmed your celebration cake. Your order is scheduled for baking right on time.',
  },
  preparing: {
    label: 'In the Oven & Decorating',
    badgeColor: '#7a4100',
    badgeBg: '#fff4e5',
    headline: 'Your cake is being baked & prepared!',
    message: 'Our pastry chefs have started crafting your cake from scratch using fresh ingredients, hand-whipped frosting, and your bespoke inscriptions.',
  },
  ready: {
    label: 'Freshly Baked & Ready',
    badgeColor: '#1e5437',
    badgeBg: '#eaf5ee',
    headline: 'Your cake is ready!',
    message: 'Your cake is freshly prepared, inspected, and ready! If you selected Store Pickup, you can visit our bakery. If you selected Home Delivery, your cake is securely boxed for our driver.',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    badgeColor: '#1a4471',
    badgeBg: '#edf4fb',
    headline: 'Your cake is on its way!',
    message: 'Our delivery driver has picked up your cake and is heading to your delivery address. Please ensure someone is available to receive it.',
  },
  delivered: {
    label: 'Delivered',
    badgeColor: '#1e5437',
    badgeBg: '#eaf5ee',
    headline: 'Your cake has arrived!',
    message: 'Your order has been delivered. We hope it brings delight and sweetness to your celebration. Thank you for choosing Speed Cake!',
  },
  cancelled: {
    label: 'Cancelled',
    badgeColor: '#8a2419',
    badgeBg: '#fdf0ee',
    headline: 'Order Cancelled',
    message: 'Your order has been cancelled. If a refund is due, it will be processed through our payment gateway.',
  },
  refund_pending: {
    label: 'Refund In Progress',
    badgeColor: '#7a4100',
    badgeBg: '#fff4e5',
    headline: 'Refund in progress',
    message: 'We have initiated a refund for your order. Funds will return to your original payment card shortly.',
  },
  refunded: {
    label: 'Refunded',
    badgeColor: '#352c28',
    badgeBg: '#eee4dc',
    headline: 'Payment Refunded',
    message: 'Your payment has been successfully refunded. Please check your bank statement or card provider for credit posting.',
  },
}

export function renderOrderStatusEmailHtml(data: OrderStatusEmailData): string {
  const { order, newStatus, note } = data
  const siteUrl = getSiteBaseUrl()
  const meta = statusMeta[newStatus] || {
    label: newStatus.replaceAll('_', ' '),
    badgeColor: '#6f3d36',
    badgeBg: '#fbf7f4',
    headline: `Order Status Update: ${newStatus.replaceAll('_', ' ')}`,
    message: `Your order status has been updated to ${newStatus.replaceAll('_', ' ')}.`,
  }

  const customerName = escapeHtml(order.first_name || order.customer_name.split(' ')[0])

  const bodyHtml = `
    <!-- Top Status Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${meta.badgeColor}; background-color: ${meta.badgeBg}; border: 1px solid rgba(0,0,0,0.08); padding: 5px 14px; border-radius: 20px; margin-bottom: 12px;">
        ${escapeHtml(meta.label)}
      </span>
      <h1 style="font-family: Georgia, 'Playfair Display', serif; font-size: 26px; font-weight: normal; color: #352c28; margin: 0 0 8px 0;">
        ${escapeHtml(meta.headline)}
      </h1>
      <p style="font-size: 14px; color: #756862; margin: 0;">
        Order reference: <b style="color: #352c28; font-family: monospace;">${escapeHtml(order.order_number)}</b>
      </p>
    </div>

    <!-- Friendly message -->
    <div style="background-color: #fbf7f4; border: 1px solid #ebdcd3; border-radius: 4px; padding: 22px; margin-bottom: 28px;">
      <p style="margin: 0 0 10px 0; font-size: 15px; color: #352c28;">
        Hello ${customerName},
      </p>
      <p style="margin: 0; font-size: 14px; color: #52443e; line-height: 1.6;">
        ${escapeHtml(meta.message)}
      </p>

      ${note?.trim() ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #ded0c8; font-size: 13px; color: #6f3d36;">
          <b>Note from bakery team:</b> &ldquo;${escapeHtml(note.trim())}&rdquo;
        </div>
      ` : ''}
    </div>

    <!-- Quick Summary -->
    <div style="margin-bottom: 28px; padding: 16px 20px; border: 1px solid #eee4dc; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a5b51; margin-bottom: 8px;">
        Order Details
      </div>
      <div style="font-size: 13px; color: #52443e; line-height: 1.6;">
        <b>Items:</b> ${(order.order_items || []).map(i => `${i.quantity}x ${escapeHtml(i.product_snapshot?.name || 'Cake')}`).join(', ')}<br/>
        <b>Fulfillment:</b> ${order.fulfillment_type === 'pickup' ? 'Bakery Pickup' : `Doorstep Delivery (${escapeHtml(order.delivery_window || 'Standard')})`}<br/>
        ${order.delivery_date ? `<b>Scheduled Date:</b> ${escapeHtml(order.delivery_date)}<br/>` : ''}
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${siteUrl}/account/orders/${encodeURIComponent(order.order_number)}" target="_blank" style="display: inline-block; background-color: #6f3d36; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">
        Track Live Status &rarr;
      </a>
    </div>

    <p style="text-align: center; font-size: 12px; color: #9c8e87; margin: 0;">
      If you have questions or need assistance, reply to this email or visit your account portal.
    </p>
  `

  return renderEmailLayout({
    title: `Order Update: ${order.order_number} is ${meta.label} — Speed Cake`,
    previewText: `Order ${order.order_number} update: ${meta.label}. ${meta.message}`,
    bodyHtml,
  })
}

export function renderOrderStatusEmailText(data: OrderStatusEmailData): string {
  const { order, newStatus, note } = data
  const siteUrl = getSiteBaseUrl()
  const meta = statusMeta[newStatus] || { label: newStatus, message: '' }

  return `Order Update: ${order.order_number} is now ${meta.label}

Hello ${order.first_name || order.customer_name},

${meta.message}

${note ? `Note from our team: "${note}"\n` : ''}
Track your order progress:
${siteUrl}/account/orders/${encodeURIComponent(order.order_number)}
`
}
