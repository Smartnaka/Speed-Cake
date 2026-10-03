import fs from 'node:fs'
import path from 'node:path'
import { renderWelcomeEmailHtml } from '../src/lib/email/templates/welcome.ts'
import { renderOrderConfirmationHtml } from '../src/lib/email/templates/order-confirmation.ts'
import { renderOrderStatusEmailHtml } from '../src/lib/email/templates/order-status.ts'
import { renderAdminNewOrderHtml } from '../src/lib/email/templates/admin-new-order.ts'

const outDir = path.resolve('scratch')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const sampleOrder = {
  id: '11111111-1111-4111-8111-111111111111',
  order_number: 'SC-L6X89K2',
  user_id: 'user-1',
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
  delivery_instructions: 'Ring doorbell twice upon arrival',
  delivery_date: '2026-10-15',
  delivery_window: '12:00 PM – 3:00 PM',
  delivery_charge_kobo: 250000,
  subtotal_kobo: 6750000,
  total_kobo: 7000000,
  status: 'paid',
  payment_status: 'success',
  admin_notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order_items: [
    {
      id: 'item-1',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: 'p-1',
      product_snapshot: { name: 'Sunday Strawberry' },
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
      product_snapshot: { name: 'Little Cloud Cupcakes' },
      variant_snapshot: { name: 'Box of 12', price_kobo: 1800000 },
      customization: {},
      quantity: 1,
      line_total_kobo: 1800000,
    },
  ],
  payments: [],
  order_status_history: [],
}

fs.writeFileSync(
  path.join(outDir, 'preview-welcome.html'),
  renderWelcomeEmailHtml({ customerName: 'Amaka Bello', customerEmail: 'amaka@example.com' })
)
fs.writeFileSync(
  path.join(outDir, 'preview-order-confirmation.html'),
  renderOrderConfirmationHtml(sampleOrder)
)
fs.writeFileSync(
  path.join(outDir, 'preview-order-status.html'),
  renderOrderStatusEmailHtml({
    order: sampleOrder,
    newStatus: 'preparing',
    note: 'Cake base baked; our decorators are now hand-piping your inscription.',
  })
)
fs.writeFileSync(
  path.join(outDir, 'preview-admin-new-order.html'),
  renderAdminNewOrderHtml(sampleOrder)
)

console.log('HTML previews successfully generated in scratch/')
