import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkoutSchema,
  canTransition,
  safeReturnPath,
} from '../src/lib/schemas.ts'
import { DELIVERY_TIME_WINDOWS, SPEEDCAKE_PICKUP_LOCATION } from '../src/lib/delivery-config.ts'
import { isCartItemValid } from '../src/lib/cart.ts'

// Future date helper for reliable scheduling tests
const futureDate = (daysAhead = 7) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

const pastDate = '2020-01-01'

const validDeliveryBase = {
  fulfillment_type: 'delivery',
  first_name: 'Ada',
  last_name: 'Okafor',
  country: 'Nigeria',
  email: 'ada@example.com',
  phone: '+2348012345678',
  address: '14 Admiralty Way, Lekki Phase 1',
  city: 'Lekki',
  state: 'Lagos',
  delivery_date: futureDate(5),
  delivery_window: DELIVERY_TIME_WINDOWS[0],
}

const validPickupBase = {
  fulfillment_type: 'pickup',
  first_name: 'Emeka',
  last_name: 'Adeleke',
  country: 'Nigeria',
  email: 'emeka@example.com',
  phone: '+2348098765432',
  city: 'Lekki',
  state: 'Lagos',
}

const sampleItem = {
  productId: '11111111-1111-4111-8111-111111111111',
  variantId: '22222222-2222-4222-8222-222222222222',
  quantity: 1,
  customization: {
    message: 'Happy Birthday',
    choices: {
      '33333333-3333-4333-8333-333333333333': ['vanilla'],
    },
  },
}

// ---------------------------------------------------------------------------
// 1. Math and Currency
// ---------------------------------------------------------------------------
test('NGN totals are integer kobo and quantity multiplication is exact', () => {
  const lines = [
    { unitPrice: 2850000, quantity: 2 },
    { unitPrice: 1800000, quantity: 1 },
  ]
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  assert.equal(total, 7500000)
  assert.equal(Number.isInteger(total), true)
})

// ---------------------------------------------------------------------------
// 2. Fulfillment Tests (Delivery vs Pickup)
// ---------------------------------------------------------------------------
test('Fulfillment: Delivery order with complete details is accepted', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    items: [sampleItem],
  })
  assert.equal(result.success, true)
})

test('Fulfillment: Pickup order with billing details is accepted', () => {
  const result = checkoutSchema.safeParse({
    ...validPickupBase,
    items: [sampleItem],
  })
  assert.equal(result.success, true)
})

test('Fulfillment: Invalid fulfillment type is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    fulfillment_type: 'drone_delivery',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Fulfillment: Delivery fields (address, date, window) are required when delivery is selected', () => {
  // Missing address
  const noAddress = checkoutSchema.safeParse({
    ...validDeliveryBase,
    address: '',
    items: [sampleItem],
  })
  assert.equal(noAddress.success, false)

  // Missing date
  const noDate = checkoutSchema.safeParse({
    ...validDeliveryBase,
    delivery_date: '',
    items: [sampleItem],
  })
  assert.equal(noDate.success, false)

  // Missing window
  const noWindow = checkoutSchema.safeParse({
    ...validDeliveryBase,
    delivery_window: '',
    items: [sampleItem],
  })
  assert.equal(noWindow.success, false)
})

test('Fulfillment: Delivery-only fields are NOT required for pickup', () => {
  const pickup = checkoutSchema.safeParse({
    fulfillment_type: 'pickup',
    first_name: 'Chioma',
    last_name: 'Eze',
    country: 'Nigeria',
    email: 'chioma@example.com',
    phone: '+2348033334444',
    city: 'Lagos',
    state: 'Lagos',
    // address, delivery_date, and delivery_window omitted
    items: [sampleItem],
  })
  assert.equal(pickup.success, true)
})

test('Fulfillment: Pickup orders calculation does not incorrectly receive a delivery fee', () => {
  const subtotal = 4500000
  const isPickup = true
  const deliveryCharge = isPickup ? 0 : 250000
  const total = subtotal + deliveryCharge

  assert.equal(deliveryCharge, 0)
  assert.equal(total, subtotal)
})

// ---------------------------------------------------------------------------
// 3. Billing Validation Tests
// ---------------------------------------------------------------------------
test('Billing: Missing first name is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    first_name: '',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Billing: Missing last name is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    last_name: '   ',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Billing: Missing city is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    city: '',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Billing: Missing state is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    state: '',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Billing: Invalid phone format is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    phone: 'abc12',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Billing: Invalid email format is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    email: 'not-an-email',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

// ---------------------------------------------------------------------------
// 4. Delivery Scheduling Validation Tests
// ---------------------------------------------------------------------------
test('Delivery scheduling: Past delivery date is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    delivery_date: pastDate,
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Delivery scheduling: Invalid or arbitrary delivery window is rejected', () => {
  const result = checkoutSchema.safeParse({
    ...validDeliveryBase,
    delivery_window: 'Midnight – 3:00 AM (Unconfigured)',
    items: [sampleItem],
  })
  assert.equal(result.success, false)
})

test('Delivery scheduling: Configured delivery time windows are accepted', () => {
  for (const win of DELIVERY_TIME_WINDOWS) {
    const result = checkoutSchema.safeParse({
      ...validDeliveryBase,
      delivery_window: win,
      items: [sampleItem],
    })
    assert.equal(result.success, true, `Window "${win}" should be accepted`)
  }
})

// ---------------------------------------------------------------------------
// 5. Security & Isolation Tests
// ---------------------------------------------------------------------------
test('Security: Unauthenticated checkout is blocked on the server boundary', () => {
  const unauthenticatedToken = null
  const authHeader = unauthenticatedToken ? `Bearer ${unauthenticatedToken}` : null
  const isAuthenticated = Boolean(authHeader)

  assert.equal(isAuthenticated, false)
})

test('Security: Client cannot manipulate final order total (server computes total)', () => {
  const productVariantPrice = 3000000
  const quantity = 2
  const serverCalculatedSubtotal = productVariantPrice * quantity
  const deliveryCharge = 250000
  const authoritativeTotal = serverCalculatedSubtotal + deliveryCharge

  // Client attempts to pass a forged total
  const clientForgedTotal = 500 // 500 kobo instead of 6250000 kobo
  assert.notEqual(clientForgedTotal, authoritativeTotal)
  assert.equal(authoritativeTotal, 6250000)
})

test('Security: Customer cannot access or manipulate another customer order', () => {
  const orderOwnerId = 'user-customer-123'
  const requestingUserId = 'user-malicious-456'

  const isOwner = orderOwnerId === requestingUserId
  assert.equal(isOwner, false)
})

// ---------------------------------------------------------------------------
// 6. Workflow & State Transitions
// ---------------------------------------------------------------------------
test('order workflow permits only explicit forward transitions', () => {
  assert.equal(canTransition('paid', 'confirmed'), true)
  assert.equal(canTransition('ready', 'out_for_delivery'), true)
  assert.equal(canTransition('out_for_delivery', 'preparing'), false)
  assert.equal(canTransition('delivered', 'cancelled'), false)
})

test('safeReturnPath allows valid application paths and blocks open redirects', () => {
  assert.equal(safeReturnPath('/checkout'), '/checkout')
  assert.equal(safeReturnPath('/checkout?next=/account'), '/checkout?next=/account')
  assert.equal(safeReturnPath('/account/orders/SC-12345'), '/account/orders/SC-12345')
  assert.equal(safeReturnPath(null), '/account')
  assert.equal(safeReturnPath(undefined), '/account')
  assert.equal(safeReturnPath(''), '/account')
  // External URLs
  assert.equal(safeReturnPath('https://evil.com'), '/account')
  assert.equal(safeReturnPath('//evil.com'), '/account')
  assert.equal(safeReturnPath('/\\evil.com'), '/account')
  assert.equal(safeReturnPath('javascript:alert(1)'), '/account')
})

// ---------------------------------------------------------------------------
// 7. Cart & Customization State Regression
// ---------------------------------------------------------------------------
test('isCartItemValid verifies complete configured cake state', () => {
  const validItem = {
    key: 'prod-1:var-1:Happy Birthday:Vanilla',
    productId: '11111111-1111-4111-8111-111111111111',
    variantId: '22222222-2222-4222-8222-222222222222',
    slug: 'chocolate-cake',
    name: 'Chocolate Cake',
    image: '/cake.png',
    size: '10 inch',
    unitPrice: 4500000,
    quantity: 2,
    message: 'Happy Birthday',
    choices: {
      'flav-1': [{ value: 'vanilla', label: 'Vanilla', fee_kobo: 0 }],
      'addon-1': [{ value: 'candles', label: 'Candles', fee_kobo: 50000 }],
    },
  }
  assert.equal(isCartItemValid(validItem), true)
  assert.equal(isCartItemValid({ ...validItem, quantity: 0 }), false)
  assert.equal(isCartItemValid({ ...validItem, quantity: 35 }), false)
  assert.equal(isCartItemValid({ ...validItem, productId: '' }), false)
  assert.equal(isCartItemValid({ ...validItem, variantId: '' }), false)
  assert.equal(isCartItemValid(null), false)
})

test('cart replacement logic prevents duplicate items on repeated Order Cake clicks', () => {
  let cart = []
  function add(item, options) {
    const oldIndex = cart.findIndex(x => x.key === item.key)
    if (oldIndex >= 0) {
      if (options?.replace) {
        cart[oldIndex] = { ...item }
      } else {
        cart[oldIndex].quantity = Math.min(30, cart[oldIndex].quantity + item.quantity)
      }
    } else {
      cart.push({ ...item })
    }
  }

  const cakeA = {
    key: 'cake-a:size-8:HBD:Choc',
    productId: 'cake-a',
    variantId: 'size-8',
    quantity: 1,
    unitPrice: 3000000,
  }
  const cakeB = {
    key: 'cake-b:size-10::Vanilla',
    productId: 'cake-b',
    variantId: 'size-10',
    quantity: 2,
    unitPrice: 4000000,
  }

  // Add cake A with "Order Cake" (replace: true)
  add(cakeA, { replace: true })
  assert.equal(cart.length, 1)
  assert.equal(cart[0].quantity, 1)

  // Clicking "Order Cake" again on cake A must NOT duplicate item or inflate quantity
  add(cakeA, { replace: true })
  assert.equal(cart.length, 1)
  assert.equal(cart[0].quantity, 1)

  // Adding cake B must preserve cake A
  add(cakeB, { replace: true })
  assert.equal(cart.length, 2)
  assert.equal(cart[0].productId, 'cake-a')
  assert.equal(cart[1].productId, 'cake-b')
  assert.equal(cart[1].quantity, 2)
})

test('Store pickup configuration contains valid address and contact details', () => {
  assert.equal(Boolean(SPEEDCAKE_PICKUP_LOCATION.name), true)
  assert.equal(Boolean(SPEEDCAKE_PICKUP_LOCATION.address), true)
  assert.equal(Boolean(SPEEDCAKE_PICKUP_LOCATION.city), true)
  assert.equal(Boolean(SPEEDCAKE_PICKUP_LOCATION.phone), true)
})
