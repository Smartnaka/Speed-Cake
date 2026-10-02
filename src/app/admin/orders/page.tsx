'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  User,
  X,
} from 'lucide-react'
import { naira } from '@/lib/demo-products'
import type { AdminOrderRecord } from '@/lib/orders-db'

import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/order-badges'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination state
  const [search, setSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (orderStatus !== 'all') params.set('orderStatus', orderStatus)
      if (paymentStatus !== 'all') params.set('paymentStatus', paymentStatus)
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: await getAdminAuthHeader(),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch orders')
      }

      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching orders')
    } finally {
      setLoading(false)
    }
  }, [search, orderStatus, paymentStatus, page, limit])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  // Reset to page 1 on search or filter change
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleOrderStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setOrderStatus(e.target.value)
    setPage(1)
  }

  function handlePaymentStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPaymentStatus(e.target.value)
    setPage(1)
  }

  function handleResetFilters() {
    setSearch('')
    setOrderStatus('all')
    setPaymentStatus('all')
    setPage(1)
  }

  const hasActiveFilters = search.trim() !== '' || orderStatus !== 'all' || paymentStatus !== 'all'

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#e5d9d1]">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#867872] font-semibold">Speed Cake Operations</span>
          <h1 className="text-3xl font-serif text-[#352c28] mt-0.5">Orders Management</h1>
          <p className="text-sm text-[#756862] mt-1">
            Track customer cake orders, monitor payment statuses, and advance fulfillment.
          </p>
        </div>

        <button
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#6f3d36] bg-[#fbf7f4] border border-[#e5d9d1] rounded hover:bg-[#f6eee8] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#fbf7f4] border border-[#e5d9d1] p-4 rounded space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#867872]" />
            <input
              type="text"
              placeholder="Search by order #, customer name, email..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#ded0c8] rounded focus:outline-none focus:border-[#6f3d36] text-[#352c28] placeholder-[#9c8e87]"
            />
          </div>

          {/* Order Status Select */}
          <div className="md:col-span-3">
            <select
              value={orderStatus}
              onChange={handleOrderStatusChange}
              className="w-full px-3 py-2 text-sm bg-white border border-[#ded0c8] rounded focus:outline-none focus:border-[#6f3d36] text-[#352c28]"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refund_pending">Refund Pending</option>
            </select>
          </div>

          {/* Payment Status Select */}
          <div className="md:col-span-3">
            <select
              value={paymentStatus}
              onChange={handlePaymentStatusChange}
              className="w-full px-3 py-2 text-sm bg-white border border-[#ded0c8] rounded focus:outline-none focus:border-[#6f3d36] text-[#352c28]"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid / Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Reset Action */}
          <div className="md:col-span-1 flex items-center justify-end">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#867872] hover:text-[#6f3d36] px-2 py-2 rounded hover:bg-[#f2e7df] transition"
                title="Clear filters"
              >
                <X size={14} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Count summary */}
        <div className="flex items-center justify-between text-xs text-[#756862] pt-1">
          <span>
            Found <b className="text-[#352c28]">{totalCount}</b> {totalCount === 1 ? 'order' : 'orders'}
            {hasActiveFilters ? ' matching filter' : ''}
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-3 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-[#e5d9d1] rounded overflow-hidden shadow-sm">
        {loading && orders.length === 0 ? (
          <div className="p-12 text-center text-[#756862]">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-[#6f3d36]" />
            <p className="text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag size={40} className="mx-auto text-[#c2b2a9]" />
            <h3 className="text-lg font-serif text-[#352c28]">No orders found</h3>
            <p className="text-sm text-[#756862] max-w-md mx-auto">
              {hasActiveFilters
                ? 'No customer orders match the current search or status filter. Try clearing or relaxing your filters.'
                : 'There are no customer orders in the system yet. Once customers place orders, they will show up here.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-medium text-[#6f3d36] underline hover:text-[#5b322c]"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#fcf9f7] border-b border-[#e5d9d1] text-xs font-medium text-[#756862] uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee4dc]">
                {orders.map(order => {
                  const itemsCount = order.order_items?.length || 0
                  const firstItem = order.order_items?.[0]
                  const createdDate = new Date(order.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                  const createdTime = new Date(order.created_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <tr key={order.id} className="hover:bg-[#fdfbf9] transition-colors">
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#6f3d36]">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span>{order.order_number}</span>
                        </Link>
                        <span className="block text-xs text-[#867872] font-sans font-normal mt-0.5">
                          {createdDate} · {createdTime}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-[#352c28]">
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-xs text-[#867872]">{order.customer_email}</div>
                        <div className="text-xs text-[#867872]">{order.customer_phone}</div>
                      </td>

                      {/* Delivery Date & Window */}
                      <td className="py-3.5 px-4 text-[#352c28]">
                        {order.delivery_date ? (
                          <>
                            <div className="flex items-center gap-1 font-medium text-xs">
                              <Calendar size={13} className="text-[#867872]" />
                              <span>{order.delivery_date}</span>
                            </div>
                            <div className="text-xs text-[#867872] mt-0.5">{order.delivery_window || 'Standard window'}</div>
                          </>
                        ) : (
                          <span className="text-xs text-[#867872]">Not scheduled</span>
                        )}
                        <div className="text-xs text-[#867872] truncate max-w-[160px] mt-0.5" title={order.delivery_address}>
                          {order.city ? `${order.city}, ${order.state}` : order.delivery_address}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-[#352c28]">
                        <div className="font-medium text-xs">
                          {firstItem?.product_snapshot?.name || `${itemsCount} item(s)`}
                        </div>
                        {itemsCount > 1 && (
                          <div className="text-xs text-[#867872]">
                            +{itemsCount - 1} other item{itemsCount > 2 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-medium text-[#352c28]">
                        {naira(order.total_kobo)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-[#6f3d36] hover:text-[#5b322c] font-medium text-xs px-2.5 py-1.5 rounded hover:bg-[#f6eee8] border border-transparent hover:border-[#ded0c8] transition"
                        >
                          <Eye size={13} />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#fcf9f7] border-t border-[#e5d9d1] text-xs text-[#756862]">
            <div>
              Showing orders {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#ded0c8] bg-white text-[#352c28] hover:bg-[#f6eee8] transition disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span className="px-2 font-medium text-[#352c28]">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#ded0c8] bg-white text-[#352c28] hover:bg-[#f6eee8] transition disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
