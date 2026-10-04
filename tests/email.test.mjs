import test from 'node:test'
import assert from 'node:assert/strict'
import { renderWelcomeEmailHtml, renderWelcomeEmailText } from '../src/lib/email/templates/welcome.ts'
import { renderOrderConfirmationHtml, renderOrderConfirmationText } from '../src/lib/email/templates/order-confirmation.ts'
import { renderOrderStatusEmailHtml, renderOrderStatusEmailText } from '../src/lib/email/templates/order-status.ts'
import { renderAdminNewOrderHtml, renderAdminNewOrderText } from '../src/lib/email/templates/admin-new-order.ts'
import { escapeHtml } from '../src/lib/email/templates/base-layout.ts'
import { sendWelcomeEmail, sendOrderStatusUpdateEmail } from '../src/lib/email/service.ts'

const sampleDeliveryOrder = {
  id: '11111111-1111-4111-8111-111111111111',
  order_number: 'SC-ABC1234567',
  user_id: 'user-123',
  customer_name: 'Amaka Bello',
  customer_email: 'amaka@example.com',
  customer_phone: '+2348012345678',
  first_name: 'Amaka',
  last_name: 'Bello',
  country: 'Nigeria',
  fulfillment_type: 'delivery',
  delivery_address: '14 Victoria Garden City Road',
  city: 'Lekki',
  state: 'Lagos',
  landmark: 'Near Gate 2',
  delivery_instructions: 'Ring bell twice',
  delivery_date: '2026-10-15',
  delivery_window: '12:00 PM – 3:00 PM',
  delivery_charge_kobo: 250000,
  subtotal_kobo: 6750000,
  total_kobo: 7000000,
  status: 'paid',
  payment_status: 'success',
  admin_notes: null,
  created_at: '2026-10-03T10:00:00.000Z',
  updated_at: '2026-10-03T10:05:00.000Z',
  order_items: [
    {
      id: 'item-1',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: 'p-1',
      product_snapshot: { name: 'Sunday Strawberry', slug: 'sunday-strawberry' },
      variant_snapshot: { name: '8 inch · serves 14', price_kobo: 3900000 },
      customization: {
        message: 'Happy 30th Birthday Funke!',
        choices: [{ kind: 'addon', label: 'Candles', value: 'Gold Metallic', fee_kobo: 50000 }],
      },
      quantity: 1,
      line_total_kobo: 3950000,
    },
    {
      id: 'item-2',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: 'p-2',
      product_snapshot: { name: 'Little Cloud Cupcakes', slug: 'little-cloud-cupcakes' },
      variant_snapshot: { name: 'Box of 12', price_kobo: 1800000 },
      customization: {},
      quantity: 1,
      line_total_kobo: 1800000,
    },
  ],
  payments: [],
  order_status_history: [],
}

const samplePickupOrder = {
  ...sampleDeliveryOrder,
  order_number: 'SC-PICKUP999',
  fulfillment_type: 'pickup',
  delivery_window: 'Store Pickup',
  delivery_charge_kobo: 0,
  total_kobo: 6750000,
}

// ---------------------------------------------------------------------------
// 1. HTML Safety & Utility Tests
// ---------------------------------------------------------------------------
test('escapeHtml sanitizes unsafe characters against XSS', () => {
  const unsafe = '<script>alert("xss")</script> & "special"'
  const safe = escapeHtml(unsafe)
  assert.equal(safe.includes('<script>'), false)
  assert.equal(safe.includes('&amp;'), true)
  assert.equal(safe.includes('&lt;script&gt;'), true)
})

// ---------------------------------------------------------------------------
// 2. Welcome Email Template Tests
// ---------------------------------------------------------------------------
test('renderWelcomeEmail produces personalized greeting and cake collection link', () => {
  const html = renderWelcomeEmailHtml({ customerName: 'Chiamaka & Tunde', customerEmail: 'tunde@example.com' })
  assert.ok(html.includes('Welcome to Instant Cakes Delivery, Chiamaka &amp; Tunde'))
  assert.ok(html.includes('/cakes'))
  assert.ok(html.includes('Instant Cakes Delivery'))

  const text = renderWelcomeEmailText({ customerName: 'Chiamaka', customerEmail: 'chiamaka@example.com' })
  assert.ok(text.includes('Welcome to Instant Cakes Delivery, Chiamaka'))
  assert.ok(text.includes('/cakes'))
})

// ---------------------------------------------------------------------------
// 3. Order Confirmation Receipt Template Tests
// ---------------------------------------------------------------------------
test('renderOrderConfirmationHtml formats doorstep delivery order receipt accurately', () => {
  const html = renderOrderConfirmationHtml(sampleDeliveryOrder)

  // Order identifier and customer
  assert.ok(html.includes('SC-ABC1234567'))
  assert.ok(html.includes('Amaka'))

  // Items and customization
  assert.ok(html.includes('Sunday Strawberry'))
  assert.ok(html.includes('8 inch · serves 14'))
  assert.ok(html.includes('Happy 30th Birthday Funke!'))
  assert.ok(html.includes('Candles: <b>Gold Metallic</b>'))
  assert.ok(html.includes('Little Cloud Cupcakes'))

  // Delivery details
  assert.ok(html.includes('Fulfillment: Doorstep Delivery'))
  assert.ok(html.includes('14 Victoria Garden City Road'))
  assert.ok(html.includes('12:00 PM – 3:00 PM'))
  assert.ok(html.includes('Ring bell twice'))

  // Pricing formatting in Naira
  assert.ok(html.includes('₦70,000') || html.includes('70,000'))
  assert.ok(html.includes('₦2,500') || html.includes('2,500'))

  // CTA link
  assert.ok(html.includes('/account/orders/SC-ABC1234567'))
})

test('renderOrderConfirmationHtml formats bakery pickup receipt with location details and free charge', () => {
  const html = renderOrderConfirmationHtml(samplePickupOrder)

  assert.ok(html.includes('SC-PICKUP999'))
  assert.ok(html.includes('Fulfillment: Bakery Pickup (Free)'))
  assert.ok(html.includes('Instant Cakes Delivery Main Bakery'))
  assert.ok(html.includes('14 Admiralty Way, Lekki Phase 1'))
  assert.ok(html.includes('₦0 (Free)'))
})

test('renderOrderConfirmationText includes plaintext order summary', () => {
  const text = renderOrderConfirmationText(sampleDeliveryOrder)
  assert.ok(text.includes('SC-ABC1234567'))
  assert.ok(text.includes('Sunday Strawberry'))
  assert.ok(text.includes('14 Victoria Garden City Road'))
})

// ---------------------------------------------------------------------------
// 4. Order Status Update Email Tests
// ---------------------------------------------------------------------------
test('renderOrderStatusEmailHtml supports standard operational status milestones', () => {
  const statuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']

  for (const st of statuses) {
    const html = renderOrderStatusEmailHtml({
      order: sampleDeliveryOrder,
      newStatus: st,
      note: 'Fresh strawberries arriving from farm today.',
    })

    assert.ok(html.includes('SC-ABC1234567'), `Status ${st} should contain order number`)
    assert.ok(html.includes('Fresh strawberries arriving from farm today.'), `Status ${st} should include admin note`)
    assert.ok(html.includes('/account/orders/SC-ABC1234567'), `Status ${st} should link to live tracking`)
  }
})

test('renderOrderStatusEmailText includes note and status in plaintext', () => {
  const text = renderOrderStatusEmailText({
    order: sampleDeliveryOrder,
    newStatus: 'ready',
    note: 'Boxed and ready for pickup at front desk',
  })

  assert.ok(text.includes('SC-ABC1234567'))
  assert.ok(text.includes('Freshly Baked & Ready'))
  assert.ok(text.includes('Boxed and ready for pickup at front desk'))
})

// ---------------------------------------------------------------------------
// 5. Admin New Order Alert Template Tests
// ---------------------------------------------------------------------------
test('renderAdminNewOrderHtml includes production details for bakers', () => {
  const html = renderAdminNewOrderHtml(sampleDeliveryOrder)

  assert.ok(html.includes('SC-ABC1234567'))
  assert.ok(html.includes('Amaka Bello'))
  assert.ok(html.includes('+2348012345678'))
  assert.ok(html.includes('Sunday Strawberry'))
  assert.ok(html.includes('Happy 30th Birthday Funke!'))
  assert.ok(html.includes('12:00 PM – 3:00 PM'))
  assert.ok(html.includes('/admin/orders/11111111-1111-4111-8111-111111111111'))
})

// ---------------------------------------------------------------------------
// 6. Graceful Handling When Resend Unconfigured
// ---------------------------------------------------------------------------
test('Email service gracefully skips sending without throwing when RESEND_API_KEY is not set', async () => {
  // Ensure unconfigured environment does not crash user flows
  const welcomeResult = await sendWelcomeEmail({ to: 'guest@example.com', name: 'Guest' })
  assert.equal(welcomeResult.ok, true)
  assert.equal(welcomeResult.skipped, true)

  const statusResult = await sendOrderStatusUpdateEmail({
    orderIdOrNumber: 'SC-ABC1234567',
    newStatus: 'preparing',
  })
  // Either order not found in mock/live DB or skipped due to missing Resend key
  assert.ok(statusResult.skipped || statusResult.error)
})
