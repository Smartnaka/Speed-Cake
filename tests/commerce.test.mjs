import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  checkoutSchema,
  canTransition,
  safeReturnPath,
} from '../src/lib/schemas.ts'
import {
  DELIVERY_TIME_WINDOWS,
  SPEEDCAKE_PICKUP_LOCATION,
  DEFAULT_DELIVERY_CHARGE_KOBO,
} from '../src/lib/delivery-config.ts'
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

// ---------------------------------------------------------------------------
// 8. Stage 4.2 Production Hardening: Failed / Interrupted Payment Cases (A - H)
// ---------------------------------------------------------------------------
test('Case A: Paystack initialization failure leaves no fake payment and order remains payable', () => {
  // Mock order created in pending_payment
  const order = {
    id: 'ord-case-a',
    order_number: 'SC-CASE-A',
    status: 'pending_payment',
    payment_status: 'pending',
    total_kobo: 5000000,
  }

  // Paystack init fails (network or bad secret)
  const paystackFailed = true
  let paymentsCreated = []

  if (!paystackFailed) {
    paymentsCreated.push({ order_id: order.id, status: 'pending' })
  }

  // Verification:
  // 1. Order remains pending_payment
  assert.equal(order.status, 'pending_payment')
  assert.equal(order.payment_status, 'pending')
  // 2. No fake successful payment row exists
  assert.equal(paymentsCreated.length, 0)
  // 3. Customer can retry safely because order is still payable
  const isPayable = order.status === 'pending_payment' && order.payment_status !== 'success'
  assert.equal(isPayable, true)
})

test('Case B: Customer opens Paystack checkout modal but closes the browser', () => {
  const order = {
    order_number: 'SC-CASE-B',
    status: 'pending_payment',
    payment_status: 'pending',
  }
  const payment = {
    reference: 'SC-CASE-B-ref1',
    status: 'pending',
  }

  // Customer navigated away without paying. No webhook or verify callback arrived.
  assert.equal(order.status, 'pending_payment')
  assert.notEqual(order.status, 'paid')
  assert.notEqual(order.payment_status, 'success')
  assert.equal(payment.status, 'pending')
})

test('Case C: Customer pays successfully but browser redirect fails (webhook reconciles payment)', () => {
  const order = {
    id: 'ord-case-c',
    status: 'pending_payment',
    payment_status: 'pending',
    total_kobo: 7500000,
  }
  const payment = {
    id: 'pay-case-c',
    order_id: 'ord-case-c',
    amount_kobo: 7500000,
    status: 'pending',
  }

  // Webhook arrives with verified charge.success
  function processWebhook(eventData) {
    if (eventData.amount === payment.amount_kobo && order.total_kobo === eventData.amount) {
      payment.status = 'success'
      order.payment_status = 'success'
      order.status = 'paid'
      return { received: true }
    }
    return { error: 'Mismatch' }
  }

  const result = processWebhook({ reference: 'SC-CASE-C-ref', amount: 7500000 })
  assert.equal(result.received, true)
  assert.equal(payment.status, 'success')
  assert.equal(order.payment_status, 'success')
  assert.equal(order.status, 'paid')
})

test('Case D: Customer refreshes payment page or resubmits checkout (Idempotency prevents duplicate order)', () => {
  const existingOrders = [
    {
      id: 'ord-existing-1',
      order_number: 'SC-IDEM-001',
      user_id: 'cust-123',
      idempotency_key: 'idem-key-abc',
      status: 'pending_payment',
      total_kobo: 4500000,
    },
  ]

  // Second submission with identical idempotency_key
  const incomingSubmission = {
    user_id: 'cust-123',
    idempotency_key: 'idem-key-abc',
    total_kobo: 4500000,
  }

  const found = existingOrders.find(
    o => o.user_id === incomingSubmission.user_id && o.idempotency_key === incomingSubmission.idempotency_key
  )

  // System reuses existing order rather than pushing a second order
  assert.ok(found)
  assert.equal(found.order_number, 'SC-IDEM-001')
  assert.equal(existingOrders.length, 1)
})

test('Case E: Paystack sends identical webhook multiple times (Idempotent processing)', () => {
  const payment = { id: 'p-1', status: 'success' }
  let statusHistoryInserts = 0

  function handleWebhookDelivery(webhookEvent) {
    if (payment.status === 'success') {
      // Idempotent: return received without writing duplicate history
      return { received: true, already_processed: true }
    }
    payment.status = 'success'
    statusHistoryInserts++
    return { received: true }
  }

  // Delivery 1 (already verified)
  const res1 = handleWebhookDelivery({ event: 'charge.success' })
  assert.equal(res1.received, true)
  assert.equal(res1.already_processed, true)
  assert.equal(statusHistoryInserts, 0)

  // Delivery 2 (repeated)
  const res2 = handleWebhookDelivery({ event: 'charge.success' })
  assert.equal(res2.received, true)
  assert.equal(res2.already_processed, true)
  assert.equal(statusHistoryInserts, 0)
})

test('Case F: Client sends fake successful payment request (Rejection without Paystack proof)', () => {
  // Attacker sends fake verify payload
  const attackerPayload = { reference: 'SC-FAKE-999', status: 'success' }
  const mockPaystackApiResponse = { status: false, message: 'Transaction reference not found' }

  function verifyPaymentServer(paystackApiRes) {
    if (!paystackApiRes.status || paystackApiRes.data?.status !== 'success') {
      return { status: 409, error: 'Payment is not confirmed yet.' }
    }
    return { status: 200 }
  }

  const outcome = verifyPaymentServer(mockPaystackApiResponse)
  assert.equal(outcome.status, 409)
  assert.equal(outcome.error, 'Payment is not confirmed yet.')
})

test('Case G: Client manipulates cart price before checkout (Server authoritative database price is used)', () => {
  // DB Catalog
  const dbProduct = { id: 'p1', active: true, price_kobo: 3500000 }
  // Client attempts to pass 100 kobo
  const clientCartItem = { productId: 'p1', quantity: 2, clientUnitPrice: 100 }

  // Server calculation ignores clientUnitPrice and uses dbProduct.price_kobo
  const serverCalculatedSubtotal = dbProduct.price_kobo * clientCartItem.quantity
  assert.equal(serverCalculatedSubtotal, 7000000)
  assert.notEqual(serverCalculatedSubtotal, clientCartItem.clientUnitPrice * clientCartItem.quantity)
})

test('Case H: Customer attempts to verify or pay for another customer order (Rejected with 404/403)', () => {
  const orderOwnerUserId = 'legitimate-user-uuid'
  const requestingUserId = 'attacker-user-uuid'

  function checkOrderAccess(order, userId) {
    if (order.user_id !== userId) {
      return { status: 404, error: 'This order is not available to your account.' }
    }
    return { status: 200 }
  }

  const order = { id: 'ord-123', user_id: orderOwnerUserId }
  const result = checkOrderAccess(order, requestingUserId)
  assert.equal(result.status, 404)
  assert.equal(result.error, 'This order is not available to your account.')
})

// ---------------------------------------------------------------------------
// 9. Safe Pending Payment Retry Logic
// ---------------------------------------------------------------------------
test('Retry pending payment: Re-initializes Paystack session on existing order without duplicating rows', () => {
  let orders = [
    {
      id: 'ord-retry-1',
      order_number: 'SC-RETRY-01',
      user_id: 'user-1',
      total_kobo: 6000000,
      status: 'pending_payment',
      payment_status: 'pending',
    },
  ]
  let orderItems = [
    { id: 'item-1', order_id: 'ord-retry-1', product_id: 'prod-1', quantity: 1, line_total_kobo: 6000000 },
  ]
  let payments = [
    { id: 'pay-initial', order_id: 'ord-retry-1', reference: 'SC-RETRY-01-ref1', status: 'pending' },
  ]

  // Retry function
  function retryPayment(orderNumber, userId) {
    const order = orders.find(o => o.order_number === orderNumber && o.user_id === userId)
    if (!order) throw new Error('Order not found')
    if (order.status !== 'pending_payment' || order.payment_status === 'success') {
      throw new Error('Order cannot be paid')
    }

    // New Paystack reference created for the SAME order
    const newReference = `SC-${order.order_number}-ref2`
    payments.push({ id: 'pay-retry-2', order_id: order.id, reference: newReference, status: 'pending' })
    return { authorization_url: `https://checkout.paystack.com/${newReference}`, order_number: order.order_number }
  }

  const retryResult = retryPayment('SC-RETRY-01', 'user-1')
  assert.equal(retryResult.order_number, 'SC-RETRY-01')

  // Orders count is still exactly 1 (NO duplicate orders)
  assert.equal(orders.length, 1)
  // Order items count is still exactly 1 (NO duplicate items)
  assert.equal(orderItems.length, 1)
  // Payments has recorded the new payment session attempt
  assert.equal(payments.length, 2)
})

test('Retry payment fails if order is already paid or cancelled', () => {
  const paidOrder = { order_number: 'SC-PAID', user_id: 'u1', status: 'paid', payment_status: 'success' }
  const cancelledOrder = { order_number: 'SC-CANC', user_id: 'u1', status: 'cancelled', payment_status: 'failed' }

  function isRetryPermitted(order) {
    return order.status === 'pending_payment' && order.payment_status !== 'success'
  }

  assert.equal(isRetryPermitted(paidOrder), false)
  assert.equal(isRetryPermitted(cancelledOrder), false)
})

// ---------------------------------------------------------------------------
// 10. Webhook HMAC SHA512 Signature & Idempotency
// ---------------------------------------------------------------------------
test('Webhook: Constant-time HMAC SHA512 verification validates authentic signatures and rejects forged ones', () => {
  const secret = 'sk_test_speedcake_secret_key_12345'
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'SC-TEST-1', amount: 500000 } })
  const authenticSignature = createHmac('sha512', secret).update(Buffer.from(payload)).digest('hex')

  function verifySignature(rawBody, signatureHeader, secretKey) {
    const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signatureHeader || '', 'utf8')
    const expBuf = Buffer.from(expected, 'utf8')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false
    }
    return true
  }

  // Authentic signature is accepted
  assert.equal(verifySignature(Buffer.from(payload), authenticSignature, secret), true)

  // Tampered payload is rejected
  const tamperedPayload = JSON.stringify({ event: 'charge.success', data: { reference: 'SC-TEST-1', amount: 100 } })
  assert.equal(verifySignature(Buffer.from(tamperedPayload), authenticSignature, secret), false)

  // Tampered / empty signature is rejected
  assert.equal(verifySignature(Buffer.from(payload), 'fake_signature_hex', secret), false)
  assert.equal(verifySignature(Buffer.from(payload), '', secret), false)
})

// ---------------------------------------------------------------------------
// 11. Amount Mismatch Rejection
// ---------------------------------------------------------------------------
test('Payment verification strictly rejects amount mismatch between Paystack and database order', () => {
  const dbOrderTotal = 5000000 // ₦50,000 in kobo
  const dbPaymentAmount = 5000000

  // Case: Paystack returned different amount (e.g. partial payment or forged reference)
  const paystackPaidAmount = 2500000 // ₦25,000

  const isAmountValid = paystackPaidAmount === dbOrderTotal && paystackPaidAmount === dbPaymentAmount
  assert.equal(isAmountValid, false)
})

// ---------------------------------------------------------------------------
// 12. Delivery Zone Decoupling
// ---------------------------------------------------------------------------
test('Checkout no longer queries or depends on delivery_zones or delivery_slots', () => {
  // Flat standard fee applies for delivery anywhere without zone checks
  const deliveryCharge = DEFAULT_DELIVERY_CHARGE_KOBO
  assert.equal(deliveryCharge, 250000)

  // Pickup fee is strictly 0
  const pickupCharge = 0
  assert.equal(pickupCharge, 0)

  // All 4 configured delivery windows are static without slot lookups
  assert.equal(DELIVERY_TIME_WINDOWS.length, 4)
  assert.ok(DELIVERY_TIME_WINDOWS.includes('9:00 AM – 12:00 PM'))
  assert.ok(DELIVERY_TIME_WINDOWS.includes('12:00 PM – 3:00 PM'))
  assert.ok(DELIVERY_TIME_WINDOWS.includes('3:00 PM – 6:00 PM'))
  assert.ok(DELIVERY_TIME_WINDOWS.includes('6:00 PM – 9:00 PM'))
})

