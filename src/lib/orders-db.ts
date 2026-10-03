import { supabaseAdmin } from '@/lib/supabase/server'
import type { OrderFilterInput } from '@/lib/schemas'

export interface OrderItemRecord { id: string; order_id: string; product_id: string | null; product_snapshot: { name: string; slug?: string; image?: string }; variant_snapshot: { id?: string; name: string; price_kobo: number; base_price_kobo?: number }; customization: { message?: string; choices?: Array<{ kind: string; label: string; value: string; fee_kobo: number }> }; quantity: number; line_total_kobo: number }
export interface PaymentRecord { id: string; order_id: string; reference: string; transaction_id?: string | null; amount_kobo: number; currency: string; status: string; verified_at?: string | null; created_at: string }
export interface OrderStatusHistoryRecord { id: string; order_id: string; status: string; note?: string | null; actor_id?: string | null; created_at: string }
export interface AdminOrderRecord {
  id: string; order_number: string; user_id: string | null; customer_name: string; customer_email: string; customer_phone: string
  fulfillment_type?: string; first_name?: string; last_name?: string; country?: string; delivery_address: string | null; city: string; state: string; landmark: string; delivery_instructions: string; delivery_date: string | null; delivery_window: string | null
  delivery_charge_kobo: number; subtotal_kobo: number; total_kobo: number; status: string; payment_status: string; admin_notes: string | null; created_at: string; updated_at: string
  order_items: OrderItemRecord[]; payments: PaymentRecord[]; order_status_history: OrderStatusHistoryRecord[]
}
export interface OrdersQueryResult { orders: AdminOrderRecord[]; total: number; page: number; limit: number; totalPages: number }
const orderNumber = /^SC-[A-Z0-9-]{4,120}$/i
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const isOrderIdentifier = (value: string) => uuid.test(value) || orderNumber.test(value)
const orderFields = 'id, order_number, user_id, customer_name, customer_email, customer_phone, fulfillment_type, first_name, last_name, country, delivery_address, city, state, landmark, delivery_instructions, delivery_date, delivery_window, delivery_charge_kobo, subtotal_kobo, total_kobo, status, payment_status, admin_notes, created_at, updated_at'
const normalize = (o: any): AdminOrderRecord => ({ ...o, delivery_charge_kobo: Number(o.delivery_charge_kobo), subtotal_kobo: Number(o.subtotal_kobo), total_kobo: Number(o.total_kobo), order_items: (o.order_items || []).map((item: any) => ({ ...item, quantity: Number(item.quantity), line_total_kobo: Number(item.line_total_kobo) })), payments: (o.payments || []).map((payment: any) => ({ ...payment, amount_kobo: Number(payment.amount_kobo) })), order_status_history: [...(o.order_status_history || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) })

export async function getAdminOrders(filter: OrderFilterInput): Promise<OrdersQueryResult> {
  const db = supabaseAdmin(); const page = filter.page; const limit = filter.limit
  let paymentOrderIds: string[] = []
  if (filter.search?.trim()) {
    const { data, error } = await db.from('payments').select('order_id').ilike('reference', `%${filter.search.trim()}%`).limit(500)
    if (error) throw error
    paymentOrderIds = [...new Set((data || []).map((p: any) => p.order_id))]
  }
  let query = db.from('orders').select(`${orderFields}, order_items(product_snapshot, quantity)`, { count: 'exact' }).order('created_at', { ascending: false })
  if (filter.orderStatus && filter.orderStatus !== 'all') query = query.eq('status', filter.orderStatus)
  if (filter.paymentStatus && filter.paymentStatus !== 'all') query = query.eq('payment_status', filter.paymentStatus === 'paid' ? 'success' : filter.paymentStatus)
  if (filter.search?.trim()) {
    const q = filter.search.trim().replace(/[(),]/g, '')
    const clauses = [`order_number.ilike.%${q}%`, `customer_email.ilike.%${q}%`, `customer_name.ilike.%${q}%`]
    if (paymentOrderIds.length) clauses.push(`id.in.(${paymentOrderIds.join(',')})`)
    query = query.or(clauses.join(','))
  }
  const from = (page - 1) * limit
  const { data, count, error } = await query.range(from, from + limit - 1)
  if (error) throw error
  const total = count || 0
  return { orders: (data || []).map(normalize), total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
}

export async function getAdminOrderById(id: string): Promise<AdminOrderRecord | null> {
  if (!isOrderIdentifier(id)) return null
  const db = supabaseAdmin()
  let query = db.from('orders').select(`${orderFields}, order_items(id, order_id, product_id, product_snapshot, variant_snapshot, customization, quantity, line_total_kobo), payments(id, order_id, reference, transaction_id, amount_kobo, currency, status, verified_at, created_at), order_status_history(id, order_id, status, note, actor_id, created_at)`)
  query = uuid.test(id) ? query.eq('id', id) : query.eq('order_number', id.toUpperCase())
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data ? normalize(data) : null
}

export async function updateOrderStatus(orderId: string, nextStatus: string, note: string | null | undefined, actorId: string, expectedUpdatedAt: string): Promise<AdminOrderRecord> {
  if (!uuid.test(orderId)) throw new Error('Order not found')
  const db = supabaseAdmin()
  const { error } = await db.rpc('admin_update_speedcake_order_status', { target_order: orderId, next_status: nextStatus, note_text: note?.trim() || null, actor_id: actorId, expected_updated_at: expectedUpdatedAt })
  if (error) throw new Error(error.message)
  const order = await getAdminOrderById(orderId)
  if (!order) throw new Error('Order not found')
  return order
}
