import { supabaseAdmin } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/catalogue-db'
import { canTransition, type OrderFilterInput } from '@/lib/schemas'

export interface OrderItemRecord {
  id: string
  order_id: string
  product_id: string | null
  product_snapshot: {
    name: string
    slug?: string
    image?: string
  }
  variant_snapshot: {
    id?: string
    name: string
    price_kobo: number
    base_price_kobo?: number
  }
  customization: {
    message?: string
    choices?: Array<{ kind: string; label: string; value: string; fee_kobo: number }>
  }
  quantity: number
  line_total_kobo: number
}

export interface PaymentRecord {
  id: string
  order_id: string
  reference: string
  transaction_id?: string | null
  amount_kobo: number
  currency: string
  status: string
  verified_at?: string | null
  created_at: string
}

export interface OrderStatusHistoryRecord {
  id: string
  order_id: string
  status: string
  note?: string | null
  actor_id?: string | null
  created_at: string
}

export interface AdminOrderRecord {
  id: string
  order_number: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  city: string
  state: string
  landmark: string
  delivery_instructions: string
  delivery_zone_id: string | null
  delivery_date: string
  delivery_window: string
  delivery_charge_kobo: number
  subtotal_kobo: number
  total_kobo: number
  status: string
  payment_status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
  order_items: OrderItemRecord[]
  payments: PaymentRecord[]
  order_status_history: OrderStatusHistoryRecord[]
}

// ---------------------------------------------------------------------------
// In-Memory Fallback Orders Store (for offline / test / demo mode)
// ---------------------------------------------------------------------------
const initialOrders: AdminOrderRecord[] = [
  {
    id: 'ord-1111-2222-3333-4444',
    order_number: 'SC-A8F4C2D1E0',
    user_id: 'cust-ada-01',
    customer_name: 'Ada Okafor',
    customer_email: 'ada.okafor@example.com',
    customer_phone: '+234 802 345 6789',
    delivery_address: '14 Admiralty Way, Lekki Phase 1',
    city: 'Lekki',
    state: 'Lagos',
    landmark: 'Opposite Dominoes',
    delivery_instructions: 'Please call before gate arrival',
    delivery_zone_id: 'zone-island-1',
    delivery_date: '2026-10-10',
    delivery_window: '10am – 1pm',
    delivery_charge_kobo: 250000,
    subtotal_kobo: 2850000,
    total_kobo: 3100000,
    status: 'confirmed',
    payment_status: 'success',
    admin_notes: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    order_items: [
      {
        id: 'item-01',
        order_id: 'ord-1111-2222-3333-4444',
        product_id: 'prod-strawberry',
        product_snapshot: { name: 'Sunday Strawberry', slug: 'sunday-strawberry' },
        variant_snapshot: { name: '8 inch · serves 14', price_kobo: 2850000, base_price_kobo: 2850000 },
        customization: {
          message: 'Happy 30th Birthday Ada!',
          choices: [
            { kind: 'flavour', label: 'Cake Flavour', value: 'Vanilla Bean', fee_kobo: 0 },
            { kind: 'addon', label: 'Bakery Add-ons', value: 'Gold Sparkler Candle', fee_kobo: 0 },
          ],
        },
        quantity: 1,
        line_total_kobo: 2850000,
      },
    ],
    payments: [
      {
        id: 'pay-01',
        order_id: 'ord-1111-2222-3333-4444',
        reference: 'SC-A8F4C2D1E0-PAY-9812',
        transaction_id: 'TRX-78219481',
        amount_kobo: 3100000,
        currency: 'NGN',
        status: 'success',
        verified_at: new Date(Date.now() - 3600000 * 3.8).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
    order_status_history: [
      {
        id: 'hist-01',
        order_id: 'ord-1111-2222-3333-4444',
        status: 'pending_payment',
        note: 'Order placed by customer',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'hist-02',
        order_id: 'ord-1111-2222-3333-4444',
        status: 'paid',
        note: 'Paystack payment verified',
        created_at: new Date(Date.now() - 3600000 * 3.8).toISOString(),
      },
      {
        id: 'hist-03',
        order_id: 'ord-1111-2222-3333-4444',
        status: 'confirmed',
        note: 'Bakery confirmed order schedule',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'ord-5555-6666-7777-8888',
    order_number: 'SC-B9E3A5F7C2',
    user_id: 'cust-tunde-02',
    customer_name: 'Babatunde Adeleke',
    customer_email: 'tunde.adeleke@example.com',
    customer_phone: '+234 803 987 6543',
    delivery_address: '22 Isaac John Street, GRA Ikeja',
    city: 'Ikeja',
    state: 'Lagos',
    landmark: 'Near Radisson Blu',
    delivery_instructions: 'Leave at front reception with security',
    delivery_zone_id: 'zone-mainland-1',
    delivery_date: '2026-10-12',
    delivery_window: '2pm – 5pm',
    delivery_charge_kobo: 350000,
    subtotal_kobo: 4400000,
    total_kobo: 4750000,
    status: 'preparing',
    payment_status: 'success',
    admin_notes: 'Cream cheese frosting prepared fresh in morning',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-02',
        order_id: 'ord-5555-6666-7777-8888',
        product_id: 'prod-velvet',
        product_snapshot: { name: 'Velvet Afterglow', slug: 'velvet-afterglow' },
        variant_snapshot: { name: '8 inch · serves 14', price_kobo: 4400000, base_price_kobo: 4400000 },
        customization: {
          message: 'Happy Anniversary darling',
          choices: [
            { kind: 'flavour', label: 'Cake Flavour', value: 'Deep Cocoa Red Velvet', fee_kobo: 0 },
          ],
        },
        quantity: 1,
        line_total_kobo: 4400000,
      },
    ],
    payments: [
      {
        id: 'pay-02',
        order_id: 'ord-5555-6666-7777-8888',
        reference: 'SC-B9E3A5F7C2-PAY-4419',
        transaction_id: 'TRX-99120418',
        amount_kobo: 4750000,
        currency: 'NGN',
        status: 'success',
        verified_at: new Date(Date.now() - 3600000 * 11.9).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ],
    order_status_history: [
      {
        id: 'hist-04',
        order_id: 'ord-5555-6666-7777-8888',
        status: 'pending_payment',
        note: 'Order placed by customer',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'hist-05',
        order_id: 'ord-5555-6666-7777-8888',
        status: 'paid',
        note: 'Paystack payment verified',
        created_at: new Date(Date.now() - 3600000 * 11.9).toISOString(),
      },
      {
        id: 'hist-06',
        order_id: 'ord-5555-6666-7777-8888',
        status: 'confirmed',
        note: 'Bakery schedule confirmed',
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        id: 'hist-07',
        order_id: 'ord-5555-6666-7777-8888',
        status: 'preparing',
        note: 'Chef started sponge baking',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'ord-9999-8888-7777-6666',
    order_number: 'SC-C1D2E3F4A5',
    user_id: 'cust-chidi-03',
    customer_name: 'Chidinma Eze',
    customer_email: 'chidi.eze@example.com',
    customer_phone: '+234 809 112 2334',
    delivery_address: '5B Bishop Oluwole Street, Victoria Island',
    city: 'Victoria Island',
    state: 'Lagos',
    landmark: 'Beside Eko Hotel',
    delivery_instructions: 'Deliver to office 3rd floor',
    delivery_zone_id: 'zone-island-1',
    delivery_date: '2026-10-15',
    delivery_window: '10am – 1pm',
    delivery_charge_kobo: 250000,
    subtotal_kobo: 1800000,
    total_kobo: 2050000,
    status: 'pending_payment',
    payment_status: 'pending',
    admin_notes: null,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    order_items: [
      {
        id: 'item-03',
        order_id: 'ord-9999-8888-7777-6666',
        product_id: 'prod-cupcakes',
        product_snapshot: { name: 'Little Cloud Cupcakes', slug: 'little-cloud-cupcakes' },
        variant_snapshot: { name: 'Box of 12', price_kobo: 1800000, base_price_kobo: 1800000 },
        customization: {
          choices: [{ kind: 'flavour', label: 'Flavour', value: 'Vanilla Cream', fee_kobo: 0 }],
        },
        quantity: 1,
        line_total_kobo: 1800000,
      },
    ],
    payments: [],
    order_status_history: [
      {
        id: 'hist-08',
        order_id: 'ord-9999-8888-7777-6666',
        status: 'pending_payment',
        note: 'Order placed by customer',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
]

declare global {
  // eslint-disable-next-line no-var
  var __SPEEDCAKE_LOCAL_ORDERS__: AdminOrderRecord[] | undefined
}

function getLocalOrdersStore(): AdminOrderRecord[] {
  if (!globalThis.__SPEEDCAKE_LOCAL_ORDERS__) {
    globalThis.__SPEEDCAKE_LOCAL_ORDERS__ = JSON.parse(JSON.stringify(initialOrders))
  }
  return globalThis.__SPEEDCAKE_LOCAL_ORDERS__!
}

// ---------------------------------------------------------------------------
// Admin Orders Queries & Mutations
// ---------------------------------------------------------------------------
export interface OrdersQueryResult {
  orders: AdminOrderRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getAdminOrders(filter: OrderFilterInput): Promise<OrdersQueryResult> {
  const page = Math.max(1, filter.page || 1)
  const limit = Math.min(100, Math.max(1, filter.limit || 20))

  if (!isSupabaseConfigured()) {
    const all = getLocalOrdersStore()
    let filtered = [...all]

    // Search: order_number, customer_email, customer_name
    if (filter.search?.trim()) {
      const q = filter.search.toLowerCase().trim()
      filtered = filtered.filter(
        o =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q)
      )
    }

    // Filter: order status
    if (filter.orderStatus && filter.orderStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filter.orderStatus)
    }

    // Filter: payment status
    if (filter.paymentStatus && filter.paymentStatus !== 'all') {
      const pStatus = filter.paymentStatus === 'paid' ? 'success' : filter.paymentStatus
      filtered = filtered.filter(o => o.payment_status === pStatus || (pStatus === 'success' && o.payment_status === 'paid'))
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const totalPages = Math.ceil(total / limit) || 1
    const offset = (page - 1) * limit
    const paged = filtered.slice(offset, offset + limit)

    return {
      orders: paged,
      total,
      page,
      limit,
      totalPages,
    }
  }

  const db = supabaseAdmin()
  let query = db
    .from('orders')
    .select(
      'id, order_number, user_id, customer_name, customer_email, customer_phone, delivery_address, city, state, landmark, delivery_instructions, delivery_zone_id, delivery_date, delivery_window, delivery_charge_kobo, subtotal_kobo, total_kobo, status, payment_status, admin_notes, created_at, updated_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (filter.orderStatus && filter.orderStatus !== 'all') {
    query = query.eq('status', filter.orderStatus)
  }

  if (filter.paymentStatus && filter.paymentStatus !== 'all') {
    const pStatus = filter.paymentStatus === 'paid' ? 'success' : filter.paymentStatus
    query = query.eq('payment_status', pStatus)
  }

  if (filter.search?.trim()) {
    const q = filter.search.trim()
    query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%,customer_name.ilike.%${q}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  const total = count || 0
  const totalPages = Math.ceil(total / limit) || 1

  return {
    orders: (data || []).map((o: any) => ({
      ...o,
      delivery_charge_kobo: Number(o.delivery_charge_kobo),
      subtotal_kobo: Number(o.subtotal_kobo),
      total_kobo: Number(o.total_kobo),
      order_items: [],
      payments: [],
      order_status_history: [],
    })),
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getAdminOrderById(id: string): Promise<AdminOrderRecord | null> {
  if (!isSupabaseConfigured()) {
    const all = getLocalOrdersStore()
    const order = all.find(o => o.id === id || o.order_number.toUpperCase() === id.toUpperCase())
    return order ? JSON.parse(JSON.stringify(order)) : null
  }

  const db = supabaseAdmin()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  let query = db
    .from('orders')
    .select(
      'id, order_number, user_id, customer_name, customer_email, customer_phone, delivery_address, city, state, landmark, delivery_instructions, delivery_zone_id, delivery_date, delivery_window, delivery_charge_kobo, subtotal_kobo, total_kobo, status, payment_status, admin_notes, created_at, updated_at, order_items(id, order_id, product_id, product_snapshot, variant_snapshot, customization, quantity, line_total_kobo), payments(id, order_id, reference, transaction_id, amount_kobo, currency, status, verified_at, created_at), order_status_history(id, order_id, status, note, actor_id, created_at)'
    )

  if (isUUID) {
    query = query.eq('id', id)
  } else {
    query = query.eq('order_number', id.toUpperCase())
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) return null

  // Sort history newest first
  const history = [...(data.order_status_history || [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    ...data,
    delivery_charge_kobo: Number(data.delivery_charge_kobo),
    subtotal_kobo: Number(data.subtotal_kobo),
    total_kobo: Number(data.total_kobo),
    order_items: (data.order_items || []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      line_total_kobo: Number(item.line_total_kobo),
    })),
    payments: (data.payments || []).map((pay: any) => ({
      ...pay,
      amount_kobo: Number(pay.amount_kobo),
    })),
    order_status_history: history,
  }
}

export async function updateOrderStatus(
  orderIdOrNumber: string,
  nextStatus: string,
  note?: string | null,
  actorId?: string | null
): Promise<AdminOrderRecord> {
  if (!isSupabaseConfigured()) {
    const all = getLocalOrdersStore()
    const index = all.findIndex(o => o.id === orderIdOrNumber || o.order_number.toUpperCase() === orderIdOrNumber.toUpperCase())
    if (index === -1) throw new Error('Order not found')

    const order = all[index]
    const currentStatus = order.status

    if (currentStatus === nextStatus) {
      return JSON.parse(JSON.stringify(order))
    }

    if (!canTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid order status transition from "${currentStatus}" to "${nextStatus}".`)
    }

    order.status = nextStatus
    order.updated_at = new Date().toISOString()

    const historyEntry: OrderStatusHistoryRecord = {
      id: `hist-${Date.now()}`,
      order_id: order.id,
      status: nextStatus,
      note: note?.trim() || `Status updated to ${nextStatus}`,
      actor_id: actorId || null,
      created_at: new Date().toISOString(),
    }
    order.order_status_history.unshift(historyEntry)

    return JSON.parse(JSON.stringify(order))
  }

  const db = supabaseAdmin()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber)

  // 1. Fetch current order to validate transition
  let orderQuery = db.from('orders').select('id, status, order_number')
  if (isUUID) {
    orderQuery = orderQuery.eq('id', orderIdOrNumber)
  } else {
    orderQuery = orderQuery.eq('order_number', orderIdOrNumber.toUpperCase())
  }

  const { data: currentOrder, error: fetchErr } = await orderQuery.maybeSingle()
  if (fetchErr) throw fetchErr
  if (!currentOrder) throw new Error('Order not found')

  const currentStatus = currentOrder.status
  if (currentStatus === nextStatus) {
    return (await getAdminOrderById(currentOrder.id))!
  }

  if (!canTransition(currentStatus, nextStatus)) {
    throw new Error(`Invalid order status transition from "${currentStatus}" to "${nextStatus}".`)
  }

  // 2. Perform database update
  const { error: updateErr } = await db
    .from('orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', currentOrder.id)

  if (updateErr) throw updateErr

  // 3. Record status history audit
  const { error: histErr } = await db.from('order_status_history').insert({
    order_id: currentOrder.id,
    status: nextStatus,
    note: note?.trim() || `Status changed from ${currentStatus} to ${nextStatus}`,
    actor_id: actorId || null,
  })

  if (histErr) {
    console.error('Failed to write order_status_history audit record:', histErr)
  }

  return (await getAdminOrderById(currentOrder.id))!
}
