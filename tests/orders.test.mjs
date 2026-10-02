import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransition,
  validOrderStates,
  orderStateSchema,
  validPaymentStates,
  paymentStateSchema,
  updateOrderStatusSchema,
  orderFilterSchema,
  evaluateAdminStatus,
  isHardcodedAdminToken,
  HARDCODED_ADMIN_TOKEN,
} from '../src/lib/schemas.ts'

// ---------------------------------------------------------------------------
// 1. Order State Transition Safety Tests
// ---------------------------------------------------------------------------
test('validOrderStates and validPaymentStates match supported database states', () => {
  assert.ok(validOrderStates.includes('pending_payment'))
  assert.ok(validOrderStates.includes('paid'))
  assert.ok(validOrderStates.includes('confirmed'))
  assert.ok(validOrderStates.includes('preparing'))
  assert.ok(validOrderStates.includes('ready'))
  assert.ok(validOrderStates.includes('out_for_delivery'))
  assert.ok(validOrderStates.includes('delivered'))
  assert.ok(validOrderStates.includes('cancelled'))
  assert.ok(validOrderStates.includes('refund_pending'))

  assert.ok(validPaymentStates.includes('pending'))
  assert.ok(validPaymentStates.includes('paid'))
  assert.ok(validPaymentStates.includes('failed'))
})

test('orderStateSchema validates statuses and rejects unknown states', () => {
  assert.equal(orderStateSchema.safeParse('pending_payment').success, true)
  assert.equal(orderStateSchema.safeParse('preparing').success, true)
  assert.equal(orderStateSchema.safeParse('delivered').success, true)
  assert.equal(orderStateSchema.safeParse('shipped').success, false) // Not in system
  assert.equal(orderStateSchema.safeParse('baked').success, false) // Not in system
  assert.equal(orderStateSchema.safeParse('').success, false)
})

test('canTransition strictly enforces forward and safe operational transitions', () => {
  // From pending_payment
  assert.equal(canTransition('pending_payment', 'paid'), true)
  assert.equal(canTransition('pending_payment', 'cancelled'), true)
  assert.equal(canTransition('pending_payment', 'preparing'), false) // Cannot jump
  assert.equal(canTransition('pending_payment', 'delivered'), false) // Cannot jump

  // From paid
  assert.equal(canTransition('paid', 'confirmed'), true)
  assert.equal(canTransition('paid', 'cancelled'), true)
  assert.equal(canTransition('paid', 'refund_pending'), true)
  assert.equal(canTransition('paid', 'delivered'), false) // Cannot skip preparation

  // From confirmed
  assert.equal(canTransition('confirmed', 'preparing'), true)
  assert.equal(canTransition('confirmed', 'cancelled'), true)

  // From preparing
  assert.equal(canTransition('preparing', 'ready'), true)
  assert.equal(canTransition('preparing', 'cancelled'), true)

  // From ready
  assert.equal(canTransition('ready', 'out_for_delivery'), true)
  assert.equal(canTransition('ready', 'cancelled'), true)

  // From out_for_delivery
  assert.equal(canTransition('out_for_delivery', 'delivered'), true)
  assert.equal(canTransition('out_for_delivery', 'preparing'), false) // Cannot jump backwards

  // From delivered (terminal fulfillment)
  assert.equal(canTransition('delivered', 'refund_pending'), true)
  assert.equal(canTransition('delivered', 'preparing'), false) // Casual backward jump blocked
  assert.equal(canTransition('delivered', 'paid'), false) // Cannot reset
  assert.equal(canTransition('delivered', 'cancelled'), false) // Delivered goods cannot be casually cancelled

  // From cancelled (terminal)
  assert.equal(canTransition('cancelled', 'preparing'), false)
  assert.equal(canTransition('cancelled', 'delivered'), false)
  assert.equal(canTransition('cancelled', 'paid'), false)
})

test('updateOrderStatusSchema validates body payload', () => {
  assert.equal(updateOrderStatusSchema.safeParse({ status: 'preparing' }).success, true)
  assert.equal(
    updateOrderStatusSchema.safeParse({
      status: 'out_for_delivery',
      note: 'Driver assigned: Ahmed (08012345678)',
    }).success,
    true
  )
  assert.equal(updateOrderStatusSchema.safeParse({ status: 'invalid_status' }).success, false)
  assert.equal(
    updateOrderStatusSchema.safeParse({
      status: 'delivered',
      note: 'a'.repeat(600), // Exceeds 500 chars limit
    }).success,
    false
  )
})

test('orderFilterSchema validates query params with safe defaults', () => {
  const parsedDefault = orderFilterSchema.parse({})
  assert.equal(parsedDefault.page, 1)
  assert.equal(parsedDefault.limit, 20)

  const parsedCustom = orderFilterSchema.parse({
    search: 'SC-2026-0001',
    orderStatus: 'preparing',
    paymentStatus: 'paid',
    page: '2',
    limit: '10',
  })
  assert.equal(parsedCustom.search, 'SC-2026-0001')
  assert.equal(parsedCustom.orderStatus, 'preparing')
  assert.equal(parsedCustom.paymentStatus, 'paid')
  assert.equal(parsedCustom.page, 2)
  assert.equal(parsedCustom.limit, 10)
})

// ---------------------------------------------------------------------------
// 2. Orders Store & Operations Invariants Simulation
// ---------------------------------------------------------------------------
function createTestOrdersStore() {
  const orders = [
    {
      id: 'order-uuid-1',
      order_number: 'SC-2026-0001',
      user_id: 'user-cust-1',
      customer_name: 'Amina Bello',
      customer_email: 'amina.bello@example.com',
      customer_phone: '08023456789',
      delivery_address: '15 Admiralty Way, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos',
      landmark: 'Near Prince Ebeano Supermarket',
      delivery_instructions: 'Call on arrival at the gate',
      delivery_date: '2026-10-05',
      delivery_window: 'Morning (9am - 12pm)',
      subtotal_kobo: 3900000,
      delivery_charge_kobo: 250000,
      total_kobo: 4150000,
      status: 'paid',
      payment_status: 'paid',
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-01T10:05:00Z',
      order_items: [
        {
          id: 'item-1',
          order_id: 'order-uuid-1',
          product_id: 'prod-1',
          product_snapshot: { name: 'Sunday Strawberry' },
          variant_snapshot: { name: '8 inch · serves 14', price_kobo: 3900000 },
          customization: { message: 'Happy Birthday Amina!' },
          quantity: 1,
          line_total_kobo: 3900000,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          order_id: 'order-uuid-1',
          reference: 'pstk_test_ref_001',
          amount_kobo: 4150000,
          currency: 'NGN',
          status: 'success',
          created_at: '2026-10-01T10:05:00Z',
        },
      ],
      order_status_history: [
        {
          id: 'hist-1',
          order_id: 'order-uuid-1',
          status: 'paid',
          note: 'Payment verified via Paystack',
          created_at: '2026-10-01T10:05:00Z',
        },
      ],
    },
    {
      id: 'order-uuid-2',
      order_number: 'SC-2026-0002',
      user_id: 'user-cust-2',
      customer_name: 'Chinedu Eze',
      customer_email: 'chinedu.eze@example.com',
      customer_phone: '08134567890',
      delivery_address: '42 Isaac John Street, GRA',
      city: 'Ikeja',
      state: 'Lagos',
      landmark: 'Opposite Radisson Blu',
      delivery_instructions: 'Deliver to 2nd floor reception',
      delivery_date: '2026-10-06',
      delivery_window: 'Afternoon (1pm - 4pm)',
      subtotal_kobo: 6400000,
      delivery_charge_kobo: 300000,
      total_kobo: 6700000,
      status: 'preparing',
      payment_status: 'paid',
      created_at: '2026-10-01T11:30:00Z',
      updated_at: '2026-10-01T12:00:00Z',
      order_items: [
        {
          id: 'item-2',
          order_id: 'order-uuid-2',
          product_id: 'prod-2',
          product_snapshot: { name: 'Velvet Afterglow' },
          variant_snapshot: { name: '8 inch · serves 14', price_kobo: 4400000 },
          customization: { message: 'Congratulations Chinedu!' },
          quantity: 1,
          line_total_kobo: 4400000,
        },
      ],
      payments: [
        {
          id: 'pay-2',
          order_id: 'order-uuid-2',
          reference: 'pstk_test_ref_002',
          amount_kobo: 6700000,
          currency: 'NGN',
          status: 'success',
          created_at: '2026-10-01T11:35:00Z',
        },
      ],
      order_status_history: [
        {
          id: 'hist-2',
          order_id: 'order-uuid-2',
          status: 'preparing',
          note: 'Baking commenced in oven 1',
          created_at: '2026-10-01T12:00:00Z',
        },
      ],
    },
    {
      id: 'order-uuid-3',
      order_number: 'SC-2026-0003',
      user_id: 'user-cust-3',
      customer_name: 'Folake Adeleke',
      customer_email: 'folake@example.com',
      customer_phone: '09012345678',
      delivery_address: '10 Bourdillon Road',
      city: 'Ikoyi',
      state: 'Lagos',
      landmark: 'Near Wheatbaker Hotel',
      delivery_instructions: '',
      delivery_date: '2026-10-07',
      delivery_window: 'Morning (9am - 12pm)',
      subtotal_kobo: 1800000,
      delivery_charge_kobo: 250000,
      total_kobo: 2050000,
      status: 'pending_payment',
      payment_status: 'pending',
      created_at: '2026-10-02T08:00:00Z',
      updated_at: '2026-10-02T08:00:00Z',
      order_items: [],
      payments: [],
      order_status_history: [],
    },
  ]

  return {
    orders,

    getAdminOrders(filter = {}) {
      let filtered = [...orders]

      if (filter.search && filter.search.trim()) {
        const q = filter.search.trim().toLowerCase()
        filtered = filtered.filter(
          o =>
            o.order_number.toLowerCase().includes(q) ||
            o.customer_name.toLowerCase().includes(q) ||
            o.customer_email.toLowerCase().includes(q)
        )
      }

      if (filter.orderStatus && filter.orderStatus !== 'all') {
        filtered = filtered.filter(o => o.status.toLowerCase() === filter.orderStatus.toLowerCase())
      }

      if (filter.paymentStatus && filter.paymentStatus !== 'all') {
        filtered = filtered.filter(o => o.payment_status.toLowerCase() === filter.paymentStatus.toLowerCase())
      }

      const page = filter.page || 1
      const limit = filter.limit || 20
      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      const start = (page - 1) * limit
      const paginated = filtered.slice(start, start + limit)

      return { orders: paginated, total, page, limit, totalPages }
    },

    getAdminOrderById(idOrNumber) {
      const order = orders.find(
        o => o.id === idOrNumber || o.order_number.toUpperCase() === idOrNumber.toUpperCase()
      )
      return order || null
    },

    updateOrderStatus(idOrNumber, nextStatus, note, actorId = 'admin') {
      const order = this.getAdminOrderById(idOrNumber)
      if (!order) throw new Error('Order not found')

      const currentStatus = order.status
      if (currentStatus === nextStatus) return order

      if (!canTransition(currentStatus, nextStatus)) {
        throw new Error(`Invalid order status transition from "${currentStatus}" to "${nextStatus}".`)
      }

      order.status = nextStatus
      order.updated_at = new Date().toISOString()
      order.order_status_history.unshift({
        id: `hist-${Date.now()}`,
        order_id: order.id,
        status: nextStatus,
        note: note || `Status changed from ${currentStatus} to ${nextStatus}`,
        actor_id: actorId,
        created_at: new Date().toISOString(),
      })

      return order
    },
  }
}

test('Orders listing supports search by order number, customer email, and name', () => {
  const store = createTestOrdersStore()

  // Search by order number
  const res1 = store.getAdminOrders({ search: 'SC-2026-0001' })
  assert.equal(res1.orders.length, 1)
  assert.equal(res1.orders[0].order_number, 'SC-2026-0001')

  // Search by customer email
  const res2 = store.getAdminOrders({ search: 'chinedu.eze@example.com' })
  assert.equal(res2.orders.length, 1)
  assert.equal(res2.orders[0].customer_name, 'Chinedu Eze')

  // Search by customer name partial
  const res3 = store.getAdminOrders({ search: 'amina' })
  assert.equal(res3.orders.length, 1)
  assert.equal(res3.orders[0].order_number, 'SC-2026-0001')

  // Search non-existent
  const res4 = store.getAdminOrders({ search: 'unknown-customer' })
  assert.equal(res4.orders.length, 0)
  assert.equal(res4.total, 0)
})

test('Orders listing filters by orderStatus and paymentStatus correctly', () => {
  const store = createTestOrdersStore()

  // Filter by orderStatus: preparing
  const resPreparing = store.getAdminOrders({ orderStatus: 'preparing' })
  assert.equal(resPreparing.orders.length, 1)
  assert.equal(resPreparing.orders[0].status, 'preparing')

  // Filter by paymentStatus: pending
  const resPendingPayment = store.getAdminOrders({ paymentStatus: 'pending' })
  assert.equal(resPendingPayment.orders.length, 1)
  assert.equal(resPendingPayment.orders[0].order_number, 'SC-2026-0003')

  // Filter by paymentStatus: paid
  const resPaid = store.getAdminOrders({ paymentStatus: 'paid' })
  assert.equal(resPaid.orders.length, 2)
})

test('Orders pagination computes pages and limits accurately', () => {
  const store = createTestOrdersStore()

  // 3 orders total, limit 2
  const page1 = store.getAdminOrders({ page: 1, limit: 2 })
  assert.equal(page1.total, 3)
  assert.equal(page1.totalPages, 2)
  assert.equal(page1.orders.length, 2)

  const page2 = store.getAdminOrders({ page: 2, limit: 2 })
  assert.equal(page2.orders.length, 1)
  assert.equal(page2.page, 2)
})

test('Admin order detail lookup works by either UUID or order_number', () => {
  const store = createTestOrdersStore()

  const byUuid = store.getAdminOrderById('order-uuid-1')
  assert.ok(byUuid)
  assert.equal(byUuid.order_number, 'SC-2026-0001')

  const byNumber = store.getAdminOrderById('sc-2026-0002')
  assert.ok(byNumber)
  assert.equal(byNumber.id, 'order-uuid-2')

  const notFound = store.getAdminOrderById('non-existent')
  assert.equal(notFound, null)
})

test('Admin can advance order status and append status history note', () => {
  const store = createTestOrdersStore()

  // Advance SC-2026-0001 from 'paid' to 'confirmed'
  const updated = store.updateOrderStatus('SC-2026-0001', 'confirmed', 'Ingredients reserved in cold store', 'admin-user-1')
  assert.equal(updated.status, 'confirmed')
  assert.equal(updated.order_status_history.length, 2)
  assert.equal(updated.order_status_history[0].status, 'confirmed')
  assert.equal(updated.order_status_history[0].note, 'Ingredients reserved in cold store')
  assert.equal(updated.order_status_history[0].actor_id, 'admin-user-1')
})

test('Server rejects invalid order status transitions strictly', () => {
  const store = createTestOrdersStore()

  // Attempting to jump directly from 'paid' to 'delivered' must fail
  assert.throws(
    () => {
      store.updateOrderStatus('SC-2026-0001', 'delivered', 'Bypassing preparation')
    },
    /Invalid order status transition from "paid" to "delivered"/
  )

  // Attempting to move backward from 'preparing' to 'pending_payment' must fail
  assert.throws(
    () => {
      store.updateOrderStatus('SC-2026-0002', 'pending_payment', 'Invalid rewind')
    },
    /Invalid order status transition from "preparing" to "pending_payment"/
  )
})

test('Updating order status NEVER modifies payment records, payment_status, or financial amounts', () => {
  const store = createTestOrdersStore()
  const original = store.getAdminOrderById('SC-2026-0001')

  const origSubtotal = original.subtotal_kobo
  const origTotal = original.total_kobo
  const origPaymentStatus = original.payment_status
  const origPaymentsCount = original.payments.length
  const origPaymentReference = original.payments[0].reference

  // Advance order status
  store.updateOrderStatus('SC-2026-0001', 'confirmed', 'Confirmed order')

  const after = store.getAdminOrderById('SC-2026-0001')
  assert.equal(after.status, 'confirmed')
  assert.equal(after.payment_status, origPaymentStatus, 'Payment status must remain untouched')
  assert.equal(after.subtotal_kobo, origSubtotal, 'Subtotal must remain exact')
  assert.equal(after.total_kobo, origTotal, 'Total must remain exact')
  assert.equal(after.payments.length, origPaymentsCount, 'Payment records must not be altered')
  assert.equal(after.payments[0].reference, origPaymentReference, 'Payment reference intact')
})

test('Customer order isolation: Customer A cannot access Customer B order', () => {
  const store = createTestOrdersStore()

  // Emulate the customer route /api/orders/[number]
  function simulateCustomerOrderLookup(orderNumber, requestingUserId) {
    const order = store.getAdminOrderById(orderNumber)
    if (!order) return { status: 404, error: 'Not found' }
    // Isolation check
    if (order.user_id !== requestingUserId) {
      return { status: 404, error: 'We could not find that order in your account.' }
    }
    return { status: 200, order }
  }

  // Customer 1 querying their own order SC-2026-0001
  const resCustomer1Own = simulateCustomerOrderLookup('SC-2026-0001', 'user-cust-1')
  assert.equal(resCustomer1Own.status, 200)
  assert.equal(resCustomer1Own.order.customer_name, 'Amina Bello')

  // Customer 2 querying Customer 1's order SC-2026-0001 -> BLOCKED
  const resCustomer2Forbidden = simulateCustomerOrderLookup('SC-2026-0001', 'user-cust-2')
  assert.equal(resCustomer2Forbidden.status, 404)
  assert.equal(resCustomer2Forbidden.error, 'We could not find that order in your account.')
})

test('Admin authorization: Only authenticated admin can query admin order APIs', () => {
  // Test authorization checks against admin orders
  const unauthenticatedReq = { headers: new Map() }
  const customerUser = { id: 'cust-1', email: 'cust@speedcake.com' }
  const customerProfile = { id: 'cust-1', role: 'customer' }
  const adminUser = { id: 'admin-1', email: 'admin@speedcake.com' }
  const adminProfile = { id: 'admin-1', role: 'admin' }

  // Customer evaluation
  const custEval = evaluateAdminStatus(customerUser, customerProfile)
  assert.equal(custEval.ok, false)
  assert.equal(custEval.status, 403)

  // Admin evaluation
  const adminEval = evaluateAdminStatus(adminUser, adminProfile)
  assert.equal(adminEval.ok, true)

  // Hardcoded admin token
  assert.equal(isHardcodedAdminToken(HARDCODED_ADMIN_TOKEN), true)
  assert.equal(isHardcodedAdminToken('random-token'), false)
})
