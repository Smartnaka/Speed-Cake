'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { naira } from '@/lib/demo-products'
import type { AdminOrderRecord } from '@/lib/orders-db'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/order-badges'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled', 'refund_pending'],
  confirmed: ['preparing', 'cancelled', 'refund_pending'],
  preparing: ['ready', 'cancelled', 'refund_pending'],
  ready: ['out_for_delivery', 'cancelled', 'refund_pending'],
  out_for_delivery: ['delivered', 'refund_pending'],
  delivered: ['refund_pending'],
  cancelled: [],
  refund_pending: ['refunded'],
  refunded: [],
}

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<AdminOrderRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Status update state
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>('')
  const [statusNote, setStatusNote] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null)
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        headers: await getAdminAuthHeader(),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load order details')
      }
      setOrder(data.order)
      // reset transition selection
      setSelectedNextStatus('')
      setStatusNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve order')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  const availableNextStates = order ? ALLOWED_TRANSITIONS[order.status] || [] : []

  async function handleStatusTransition(e: React.FormEvent) {
    e.preventDefault()
    if (!order || !selectedNextStatus) return
    if (
      selectedNextStatus === 'cancelled' &&
      !window.confirm('Cancel this order? This fulfillment status cannot be restored from the admin workflow.')
    ) {
      return
    }

    setUpdatingStatus(true)
    setStatusSuccessMessage(null)
    setStatusErrorMessage(null)

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAdminAuthHeader()),
        },
        body: JSON.stringify({
          status: selectedNextStatus,
          note: statusNote.trim() || undefined,
          expected_updated_at: order.updated_at,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to advance order status')
      }

      setOrder(data.order)
      setStatusSuccessMessage(`Order status successfully updated to ${selectedNextStatus.replaceAll('_', ' ')}.`)
      setSelectedNextStatus('')
      setStatusNote('')
      setTimeout(() => setStatusSuccessMessage(null), 4000)
    } catch (err) {
      setStatusErrorMessage(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin mx-auto text-[#6f3d36] mb-3" />
        <p className="text-sm text-[#756862]">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs text-[#867872] hover:text-[#6f3d36] transition"
        >
          <ArrowLeft size={14} />
          <span>Back to orders</span>
        </Link>

        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded">
          <h2 className="text-lg font-serif font-semibold">Unable to display order</h2>
          <p className="text-sm mt-1">{error || 'Order could not be found.'}</p>
          <Link
            href="/admin/orders"
            className="inline-block mt-4 text-xs font-semibold uppercase tracking-wider text-[#6f3d36] underline hover:text-[#5b322c]"
          >
            Return to Orders List
          </Link>
        </div>
      </div>
    )
  }

  const createdFormatted = new Date(order.created_at).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-8 pb-12">
      {/* Top Bar with Navigation & Title */}
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs text-[#867872] hover:text-[#6f3d36] transition mb-3"
        >
          <ArrowLeft size={14} />
          <span>Back to orders</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#e5d9d1]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif text-[#352c28] tracking-tight">{order.order_number}</h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="text-xs text-[#867872] mt-1">
              Placed on {createdFormatted} · Order ID: <span className="font-mono">{order.id}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/account/orders/${order.order_number}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#756862] bg-[#fbf7f4] border border-[#e5d9d1] rounded hover:bg-[#f6eee8] hover:text-[#352c28] transition"
              title="Preview customer order receipt"
            >
              <ExternalLink size={13} />
              <span>Customer Receipt</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Ordered Items & Delivery & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Ordered Items */}
          <div className="bg-white border border-[#e5d9d1] rounded p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee4dc] mb-4">
              <h2 className="text-base font-serif font-semibold text-[#352c28] flex items-center gap-2">
                <Package size={18} className="text-[#6f3d36]" />
                <span>Cakes & Ordered Items</span>
              </h2>
              <span className="text-xs text-[#867872]">
                {order.order_items?.length || 0} item{order.order_items?.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-[#eee4dc]">
              {order.order_items?.map((item, index) => (
                <div key={item.id || index} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {item.product_snapshot?.image ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden border border-[#e5d9d1] flex-shrink-0 bg-[#fbf7f4]">
                          <Image
                            src={item.product_snapshot.image}
                            alt={item.product_snapshot.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-[#f6eee8] border border-[#e5d9d1] flex items-center justify-center flex-shrink-0 text-[#867872]">
                          <Package size={20} />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="font-serif font-medium text-base text-[#352c28]">
                          {item.product_snapshot?.name || 'Speed Cake Signature'}
                        </div>
                        <div className="text-xs text-[#756862]">
                          Variant / Size: <b className="text-[#352c28]">{item.variant_snapshot?.name || 'Standard'}</b>
                        </div>
                        <div className="text-xs text-[#867872]">
                          Quantity: <b className="text-[#352c28]">{item.quantity}</b> · Unit Price:{' '}
                          {naira(item.variant_snapshot?.price_kobo || item.line_total_kobo / item.quantity)}
                        </div>

                        {/* Cake Message Customization */}
                        {item.customization?.message && (
                          <div className="mt-2 text-xs bg-[#fbf7f4] border border-[#ded0c8] rounded p-2.5 max-w-md">
                            <span className="font-semibold text-[#6f3d36] flex items-center gap-1 mb-1">
                              <MessageSquare size={12} />
                              Piped Inscription on Cake:
                            </span>
                            <span className="italic text-[#352c28]">
                              &ldquo;{item.customization.message}&rdquo;
                            </span>
                          </div>
                        )}

                        {/* Customization Choices */}
                        {item.customization?.choices && item.customization.choices.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.customization.choices.map((choice, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-1 text-[11px] bg-[#f6eee8] text-[#5b322c] px-2 py-0.5 rounded border border-[#ded0c8]"
                              >
                                <span>{choice.label}:</span>
                                <b>{choice.value}</b>
                                {choice.fee_kobo > 0 && <span>(+{naira(choice.fee_kobo)})</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-sm text-[#352c28]">{naira(item.line_total_kobo)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-6 pt-4 border-t border-[#eee4dc] space-y-2 text-sm">
              <div className="flex justify-between text-[#756862]">
                <span>Items Subtotal</span>
                <span>{naira(order.subtotal_kobo)}</span>
              </div>
              <div className="flex justify-between text-[#756862]">
                <span>Delivery Charge</span>
                <span>{naira(order.delivery_charge_kobo)}</span>
              </div>
              <div className="flex justify-between font-serif font-bold text-base text-[#352c28] pt-2 border-t border-[#ded0c8]">
                <span>Total Amount</span>
                <span>{naira(order.total_kobo)}</span>
              </div>
            </div>
          </div>

          {/* Section: Delivery & Fulfillment */}
          <div className="bg-white border border-[#e5d9d1] rounded p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#eee4dc] mb-4">
              <h2 className="text-base font-serif font-semibold text-[#352c28] flex items-center gap-2">
                {order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup' ? (
                  <Store size={18} className="text-[#6f3d36]" />
                ) : (
                  <Truck size={18} className="text-[#6f3d36]" />
                )}
                <span>Fulfillment & Delivery Details</span>
              </h2>
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded border w-fit ${
                order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'
                  ? 'Store Pickup'
                  : 'Home Delivery'}
              </span>
            </div>

            {order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup' ? (
              <div className="p-4 bg-[#fbf7f4] border border-[#e5d9d1] rounded text-xs text-[#52443e] space-y-2">
                <div className="font-semibold text-sm text-[#352c28]">
                  Bakery Counter Pickup
                </div>
                <p className="text-[#756862]">
                  Customer requested store pickup at <b>Speed Cake Main Bakery</b> (14 Admiralty Way, Lekki Phase 1, Lagos).
                </p>
                <p className="text-[#756862]">
                  No delivery address or driver dispatch required for this order.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-[#756862]">
                    <MapPin size={16} className="text-[#6f3d36] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider font-semibold text-[#867872]">
                        Destination Address
                      </span>
                      <p className="text-[#352c28] mt-1 font-medium">{order.delivery_address}</p>
                      <p className="text-[#756862]">
                        {order.city ? `${order.city}, ${order.state}` : ''}
                        {order.country ? ` · ${order.country}` : ''}
                      </p>
                      {order.landmark && (
                        <p className="text-xs text-[#867872] mt-0.5">
                          Landmark: <span className="text-[#352c28]">{order.landmark}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {order.delivery_instructions && (
                    <div className="bg-[#fbf7f4] border border-[#e5d9d1] p-3 rounded text-xs text-[#756862]">
                      <span className="font-semibold text-[#352c28] block mb-1">Driver Instructions:</span>
                      {order.delivery_instructions}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-[#756862]">
                    <Calendar size={16} className="text-[#6f3d36] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider font-semibold text-[#867872]">
                        Requested Delivery Date
                      </span>
                      <p className="text-[#352c28] mt-1 font-medium">
                        {order.delivery_date || 'Standard fulfillment date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-[#756862]">
                    <Clock size={16} className="text-[#6f3d36] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider font-semibold text-[#867872]">
                        Delivery Window
                      </span>
                      <p className="text-[#352c28] mt-1 font-medium">
                        {order.delivery_window || 'Standard daytime delivery'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Status History Timeline */}
          <div className="bg-white border border-[#e5d9d1] rounded p-6 shadow-sm">
            <h2 className="text-base font-serif font-semibold text-[#352c28] flex items-center gap-2 pb-3 border-b border-[#eee4dc] mb-4">
              <History size={18} className="text-[#6f3d36]" />
              <span>Status Audit Timeline</span>
            </h2>

            {order.order_status_history && order.order_status_history.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5d9d1]">
                {order.order_status_history.map((hist, idx) => {
                  const entryTime = new Date(hist.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div key={hist.id || idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#6f3d36] border-2 border-white" />

                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={hist.status} />
                          {hist.actor_id && (
                            <span className="text-[11px] text-[#867872]">by {hist.actor_id}</span>
                          )}
                        </div>
                        <span className="text-xs text-[#867872]">{entryTime}</span>
                      </div>

                      {hist.note && (
                        <p className="text-xs text-[#352c28] mt-1.5 bg-[#fbf7f4] border border-[#e5d9d1] rounded p-2">
                          {hist.note}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[#867872]">No status progression recorded yet.</p>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Order Status Progression & Customer & Payment */}
        <div className="space-y-6">
          {/* Action Card: Status Progression Controls */}
          <div className="bg-[#fbf7f4] border-2 border-[#e5d9d1] rounded p-5 shadow-sm">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[#352c28] flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-[#6f3d36]" />
              <span>Update Order Status</span>
            </h2>
            <p className="text-xs text-[#756862] mb-4">
              Advance the operational state of this order. Invalid transitions are strictly blocked by the server.
            </p>

            <form onSubmit={handleStatusTransition} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#756862] mb-1">
                  Current Status
                </label>
                <div className="mb-2">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>

              {availableNextStates.length > 0 ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#756862] mb-1">
                      Next Permitted State
                    </label>
                    <select
                      value={selectedNextStatus}
                      onChange={e => setSelectedNextStatus(e.target.value)}
                      required
                      className="w-full text-xs bg-white border border-[#ded0c8] rounded p-2.5 text-[#352c28] focus:outline-none focus:border-[#6f3d36]"
                    >
                      <option value="">Select next status...</option>
                      {availableNextStates.map(st => (
                        <option key={st} value={st}>
                          {st.replaceAll('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#756862] mb-1">
                      Operational Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                      placeholder="e.g. In oven 2, or handed to rider..."
                      className="w-full text-xs bg-white border border-[#ded0c8] rounded p-2 text-[#352c28] focus:outline-none focus:border-[#6f3d36]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedNextStatus || updatingStatus}
                    className="w-full py-2.5 px-4 bg-[#6f3d36] text-white rounded text-xs font-semibold uppercase tracking-wider hover:bg-[#5b322c] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Advance Status</span>
                    )}
                  </button>
                </>
              ) : (
                <div className="p-3 bg-[#eee4dc] text-[#756862] rounded text-xs">
                  This order is in a terminal status ({order.status}). No further status transitions are available.
                </div>
              )}

              {statusSuccessMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                  <span>{statusSuccessMessage}</span>
                </div>
              )}

              {statusErrorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{statusErrorMessage}</span>
                </div>
              )}

              <p className="text-[11px] text-[#867872] pt-2 border-t border-[#ded0c8]">
                Note: Updating the order status does not overwrite payment records or total charges.
              </p>
            </form>
          </div>

          {/* Customer Information Card */}
          <div className="bg-white border border-[#e5d9d1] rounded p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[#352c28] flex items-center gap-2 pb-2 border-b border-[#eee4dc]">
              <User size={16} className="text-[#6f3d36]" />
              <span>Customer Information</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#867872] block">Customer Name</span>
                <span className="font-medium text-[#352c28] text-sm">
                  {order.first_name && order.last_name
                    ? `${order.first_name} ${order.last_name}`
                    : order.customer_name}
                </span>
                {order.first_name && order.last_name && (
                  <span className="text-[11px] text-[#867872] block">
                    First: {order.first_name} · Last: {order.last_name}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[#867872] block">Email Address</span>
                <a
                  href={`mailto:${order.customer_email}`}
                  className="font-medium text-[#6f3d36] hover:underline"
                >
                  {order.customer_email}
                </a>
              </div>

              <div>
                <span className="text-[#867872] block">Phone Number</span>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="font-medium text-[#352c28] hover:underline flex items-center gap-1"
                >
                  <Phone size={12} className="text-[#867872]" />
                  <span>{order.customer_phone}</span>
                </a>
              </div>

              <div>
                <span className="text-[#867872] block">Country / Region</span>
                <span className="text-[#352c28] font-medium">{order.country || 'Nigeria'}</span>
              </div>

              <div className="pt-2 border-t border-[#eee4dc]">
                <span className="text-[#867872] block">Account Status</span>
                <span className="text-[#352c28]">
                  {order.user_id ? (
                    <span className="text-emerald-700 font-medium">Registered User</span>
                  ) : (
                    <span className="text-[#867872]">Guest Checkout</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information Card (Safe details only) */}
          <div className="bg-white border border-[#e5d9d1] rounded p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[#352c28] flex items-center gap-2 pb-2 border-b border-[#eee4dc]">
              <CreditCard size={16} className="text-[#6f3d36]" />
              <span>Payment & Gateway</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#867872]">Payment Status</span>
                <PaymentStatusBadge status={order.payment_status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#867872]">Total Charge</span>
                <span className="font-semibold text-[#352c28]">{naira(order.total_kobo)}</span>
              </div>

              {order.payments && order.payments.length > 0 ? (
                <div className="pt-2 border-t border-[#eee4dc] space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#867872] block">
                    Gateway Records ({order.payments.length})
                  </span>
                  {order.payments.map((p, pIdx) => (
                    <div
                      key={p.id || pIdx}
                      className="bg-[#fbf7f4] border border-[#e5d9d1] p-2.5 rounded space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[11px] text-[#6f3d36] font-medium truncate max-w-[170px]" title={p.reference}>
                          {p.reference}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                          {p.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[#756862]">
                        <span>Amount: {naira(p.amount_kobo)}</span>
                        <span>{p.currency}</span>
                      </div>
                      {p.verified_at && (
                        <div className="text-[10px] text-[#867872]">
                          Verified: {new Date(p.verified_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#867872] pt-1">
                  No gateway payment reference on file yet.
                </p>
              )}

              <p className="text-[10px] text-[#9c8e87] pt-2 border-t border-[#eee4dc]">
                Security Notice: Card CVVs, authorization keys, and raw gateway secrets are never stored.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
