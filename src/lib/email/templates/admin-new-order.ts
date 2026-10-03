import { renderEmailLayout, escapeHtml } from './base-layout.ts'
import { getSiteBaseUrl } from '../client.ts'
import { naira } from '../../demo-products.ts'
import type { AdminOrderRecord } from '../../orders-db.ts'

export function renderAdminNewOrderHtml(order: AdminOrderRecord): string {
  const siteUrl = getSiteBaseUrl()
  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  const itemsListHtml = (order.order_items || [])
    .map(item => {
      const productName = escapeHtml(item.product_snapshot?.name || 'Cake')
      const sizeName = escapeHtml(item.variant_snapshot?.name || '')
      const message = item.customization?.message?.trim()
      const choices = (item.customization?.choices || [])
        .map(c => `${escapeHtml(c.label)}: ${escapeHtml(c.value)}`)
        .join(', ')

      return `
        <li style="margin-bottom: 10px;">
          <b>${item.quantity}x ${productName}</b> ${sizeName ? `(${sizeName})` : ''} — <b>${naira(item.line_total_kobo)}</b>
          ${message ? `<div style="font-size: 12px; color: #6f3d36; font-style: italic;">Inscription: &ldquo;${escapeHtml(message)}&rdquo;</div>` : ''}
          ${choices ? `<div style="font-size: 11px; color: #756862;">${choices}</div>` : ''}
        </li>
      `
    })
    .join('')

  const bodyHtml = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6f3d36; background-color: #fbf7f4; border: 1px solid #ebdcd3; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px;">
        Bakery Production Alert
      </span>
      <h1 style="font-family: Georgia, 'Playfair Display', serif; font-size: 26px; font-weight: normal; color: #352c28; margin: 0 0 6px 0;">
        New Paid Order: ${escapeHtml(order.order_number)}
      </h1>
      <p style="font-size: 14px; color: #756862; margin: 0;">
        Total: <b style="color: #6f3d36;">${naira(order.total_kobo)}</b> &middot; Payment Status: <b style="color: #1e5437;">PAID</b>
      </p>
    </div>

    <!-- Customer details box -->
    <div style="background-color: #fbf7f4; border: 1px solid #ebdcd3; border-radius: 4px; padding: 18px; margin-bottom: 20px; font-size: 13px; color: #52443e; line-height: 1.6;">
      <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #8a5b51; margin-bottom: 6px;">
        Customer Information
      </div>
      <b>Name:</b> ${escapeHtml(order.customer_name)}<br/>
      <b>Phone:</b> <a href="tel:${escapeHtml(order.customer_phone)}" style="color: #6f3d36;">${escapeHtml(order.customer_phone)}</a><br/>
      <b>Email:</b> ${escapeHtml(order.customer_email)}
    </div>

    <!-- Fulfillment box -->
    <div style="background-color: #fdfbf9; border: 1px solid #ebdcd3; border-radius: 4px; padding: 18px; margin-bottom: 24px; font-size: 13px; color: #52443e; line-height: 1.6;">
      <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #8a5b51; margin-bottom: 6px;">
        Fulfillment & Schedule
      </div>
      <b>Type:</b> ${isPickup ? '<span style="color: #7a4100; font-weight: 600;">Store Pickup</span>' : '<span style="color: #1a4471; font-weight: 600;">Doorstep Delivery</span>'}<br/>
      ${order.delivery_date ? `<b>Target Date:</b> <b>${escapeHtml(order.delivery_date)}</b><br/>` : ''}
      ${order.delivery_window ? `<b>Window:</b> ${escapeHtml(order.delivery_window)}<br/>` : ''}
      ${!isPickup && order.delivery_address ? `<b>Address:</b> ${escapeHtml(order.delivery_address)}, ${escapeHtml(order.city || '')}, ${escapeHtml(order.state || '')}<br/>` : ''}
      ${order.landmark ? `<b>Landmark:</b> ${escapeHtml(order.landmark)}<br/>` : ''}
      ${order.delivery_instructions ? `<b>Instructions:</b> <i>${escapeHtml(order.delivery_instructions)}</i><br/>` : ''}
    </div>

    <!-- Items to prepare -->
    <div style="margin-bottom: 28px;">
      <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: #8a5b51; margin-bottom: 10px;">
        Items to Bake & Assemble
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #352c28; line-height: 1.6;">
        ${itemsListHtml}
      </ul>
    </div>

    <!-- Admin dashboard link -->
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${siteUrl}/admin/orders/${order.id}" target="_blank" style="display: inline-block; background-color: #6f3d36; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">
        View in Admin Portal &rarr;
      </a>
    </div>
  `

  return renderEmailLayout({
    title: `[New Order] ${order.order_number} — ${order.customer_name} (${naira(order.total_kobo)})`,
    previewText: `New paid order ${order.order_number} for ${order.customer_name}. Total: ${naira(order.total_kobo)}.`,
    bodyHtml,
  })
}

export function renderAdminNewOrderText(order: AdminOrderRecord): string {
  const siteUrl = getSiteBaseUrl()
  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  return `NEW PAID ORDER: ${order.order_number}
Customer: ${order.customer_name} (${order.customer_phone})
Total: ${naira(order.total_kobo)}
Fulfillment: ${isPickup ? 'Store Pickup' : `Delivery to ${order.delivery_address} on ${order.delivery_date} (${order.delivery_window})`}

Open in Admin:
${siteUrl}/admin/orders/${order.id}
`
}
