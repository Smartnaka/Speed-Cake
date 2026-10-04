import { renderEmailLayout, escapeHtml } from './base-layout.ts'
import { getSiteBaseUrl } from '../client.ts'
import { naira } from '../../demo-products.ts'
import { SPEEDCAKE_PICKUP_LOCATION } from '../../delivery-config.ts'
import type { AdminOrderRecord } from '../../orders-db.ts'

export function renderOrderConfirmationHtml(order: AdminOrderRecord): string {
  const siteUrl = getSiteBaseUrl()
  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  const formattedDate = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // Build items rows
  const itemsHtml = (order.order_items || [])
    .map(item => {
      const productName = escapeHtml(item.product_snapshot?.name || 'Artisan Cake')
      const sizeName = escapeHtml(item.variant_snapshot?.name || '')
      const message = item.customization?.message?.trim()
      const choices = (item.customization?.choices || [])
        .map(c => `<span style="display: inline-block; background-color: #fbf7f4; border: 1px solid #ebdcd3; padding: 2px 7px; font-size: 11px; color: #63534c; margin-right: 4px; margin-top: 4px;">${escapeHtml(c.label)}: <b>${escapeHtml(c.value)}</b></span>`)
        .join('')

      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #eee4dc; vertical-align: top;">
            <div style="font-weight: 600; font-size: 14px; color: #352c28;">
              ${item.quantity} &times; ${productName}
            </div>
            ${sizeName ? `<div style="font-size: 12px; color: #756862; margin-top: 2px;">${sizeName}</div>` : ''}
            ${message ? `<div style="font-size: 12px; color: #6f3d36; font-style: italic; margin-top: 4px;">Inscription: &ldquo;${escapeHtml(message)}&rdquo;</div>` : ''}
            ${choices ? `<div style="margin-top: 6px;">${choices}</div>` : ''}
          </td>
          <td align="right" style="padding: 16px 0 16px 16px; border-bottom: 1px solid #eee4dc; vertical-align: top; font-weight: 600; font-size: 14px; color: #352c28; white-space: nowrap;">
            ${naira(item.line_total_kobo)}
          </td>
        </tr>
      `
    })
    .join('')

  const fulfillmentSectionHtml = isPickup
    ? `
      <div style="background-color: #fbf7f4; border: 1px solid #ebdcd3; border-radius: 4px; padding: 20px; margin-bottom: 28px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a5b51; margin-bottom: 6px;">
          Fulfillment: Bakery Pickup (Free)
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #352c28; margin-bottom: 4px;">
          ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.name)}
        </div>
        <div style="font-size: 13px; color: #52443e; line-height: 1.5;">
          ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.address)}, ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.city)}, ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.state)}
        </div>
        <div style="font-size: 12px; color: #756862; margin-top: 6px;">
          <b>Hours:</b> ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.hours)}<br/>
          <b>Phone:</b> ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.phone)}
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #6f3d36; font-style: italic;">
          ${escapeHtml(SPEEDCAKE_PICKUP_LOCATION.instructions)}
        </div>
      </div>
    `
    : `
      <div style="background-color: #fbf7f4; border: 1px solid #ebdcd3; border-radius: 4px; padding: 20px; margin-bottom: 28px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a5b51; margin-bottom: 6px;">
          Fulfillment: Doorstep Delivery
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #352c28; margin-bottom: 4px;">
          ${escapeHtml(order.delivery_address || '')}
        </div>
        <div style="font-size: 13px; color: #52443e; margin-bottom: 6px;">
          ${escapeHtml(order.city || '')}, ${escapeHtml(order.state || '')} · ${escapeHtml(order.country || 'Nigeria')}
          ${order.landmark ? `<br/><span style="font-size: 12px; color: #756862;">Landmark: ${escapeHtml(order.landmark)}</span>` : ''}
        </div>
        <div style="font-size: 13px; color: #352c28; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ded0c8;">
          <b>Delivery Date:</b> ${escapeHtml(order.delivery_date || 'Scheduled')}<br/>
          <b>Time Window:</b> ${escapeHtml(order.delivery_window || 'Standard')}
        </div>
        ${order.delivery_instructions ? `<div style="font-size: 12px; color: #756862; font-style: italic; margin-top: 6px;">Note to driver: &ldquo;${escapeHtml(order.delivery_instructions)}&rdquo;</div>` : ''}
      </div>
    `

  const bodyHtml = `
    <!-- Top Greeting -->
    <div style="text-align: center; margin-bottom: 28px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #2e6644; background-color: #eaf5ee; border: 1px solid #c7e3d2; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
        Payment Received &middot; Order Confirmed
      </span>
      <h1 style="font-family: Georgia, 'Playfair Display', serif; font-size: 28px; font-weight: normal; color: #352c28; margin: 0 0 8px 0;">
        Thank you for your order, ${escapeHtml(order.first_name || order.customer_name.split(' ')[0])}!
      </h1>
      <p style="font-size: 14px; color: #756862; margin: 0;">
        Order reference: <b style="color: #352c28; font-family: monospace; font-size: 15px;">${escapeHtml(order.order_number)}</b> &middot; Placed ${formattedDate}
      </p>
    </div>

    <!-- Fulfillment Section -->
    ${fulfillmentSectionHtml}

    <!-- Ordered Items Table -->
    <div style="margin-bottom: 28px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8a5b51; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee4dc;">
        Your Freshly Baked Items
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemsHtml}
      </table>
    </div>

    <!-- Pricing Summary Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #756862;">Subtotal</td>
        <td align="right" style="padding: 6px 0; font-size: 14px; color: #352c28;">${naira(order.subtotal_kobo)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #756862;">
          ${isPickup ? 'Store Pickup' : 'Standard Delivery'}
        </td>
        <td align="right" style="padding: 6px 0; font-size: 14px; color: #352c28;">
          ${isPickup ? '₦0 (Free)' : naira(order.delivery_charge_kobo)}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0 0 0; font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #352c28; border-top: 1px solid #ded0c8;">
          Total Paid
        </td>
        <td align="right" style="padding: 12px 0 0 0; font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #6f3d36; border-top: 1px solid #ded0c8;">
          ${naira(order.total_kobo)}
        </td>
      </tr>
    </table>

    <!-- Call to action: track order -->
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${siteUrl}/account/orders/${encodeURIComponent(order.order_number)}" target="_blank" style="display: inline-block; background-color: #6f3d36; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;">
        Track Your Order &rarr;
      </a>
    </div>

    <p style="text-align: center; font-size: 12px; color: #9c8e87; margin: 0;">
      Our bakers will prepare your cake right on schedule. If you have any questions, simply reply to this email.
    </p>
  `

  return renderEmailLayout({
    title: `Order Confirmed: ${order.order_number} — Instant Cakes Delivery`,
    previewText: `Payment confirmed for order ${order.order_number}. Total: ${naira(order.total_kobo)}.`,
    bodyHtml,
  })
}

export function renderOrderConfirmationText(order: AdminOrderRecord): string {
  const siteUrl = getSiteBaseUrl()
  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  const lines = [
    `Thank you for your order, ${order.first_name || order.customer_name}!`,
    `Order Number: ${order.order_number}`,
    `Total Paid: ${naira(order.total_kobo)}`,
    ``,
    `FULFILLMENT:`,
    isPickup
      ? `Store Pickup at ${SPEEDCAKE_PICKUP_LOCATION.name}, ${SPEEDCAKE_PICKUP_LOCATION.address}, ${SPEEDCAKE_PICKUP_LOCATION.city}`
      : `Delivery to: ${order.delivery_address}, ${order.city}, ${order.state}\nDelivery Date: ${order.delivery_date} (${order.delivery_window})`,
    ``,
    `ITEMS:`,
    ...(order.order_items || []).map(i => `- ${i.quantity}x ${i.product_snapshot?.name} (${i.variant_snapshot?.name || ''}): ${naira(i.line_total_kobo)}`),
    ``,
    `Track your order online:`,
    `${siteUrl}/account/orders/${encodeURIComponent(order.order_number)}`,
  ]

  return lines.join('\n')
}
