'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Truck, Store, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { naira } from '@/lib/demo-products'
import { SPEEDCAKE_PICKUP_LOCATION } from '@/lib/delivery-config'

const timeline = [
  'pending_payment',
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
]

export default function OrderDetails() {
  const { number } = useParams<{ number: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<any>()
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')

  async function handleRetryPayment() {
    if (!order) return
    setRetrying(true)
    setRetryError('')
    try {
      const {
        data: { session },
      } = await supabaseBrowser().auth.getSession()

      if (!session) {
        router.replace(`/account?next=${encodeURIComponent(`/account/orders/${number}`)}`)
        return
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(order.order_number)}/payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
        return
      }

      setRetryError(data.error || 'Failed to start payment session.')
    } catch {
      setRetryError('Unable to connect to payment gateway. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    let live = true
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser().auth.getSession()

      if (!session) {
        router.replace(`/account?next=${encodeURIComponent(`/account/orders/${number}`)}`)
        return
      }

      const r = await fetch(`/api/orders/${encodeURIComponent(number)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const d = await r.json()
      if (!live) return
      if (!r.ok) setError(d.error || 'Unable to load this order.')
      else setOrder(d.order)
    }

    void load()
    return () => {
      live = false
    }
  }, [number, router])

  if (error) {
    return (
      <main className="container py-16 min-h-[45vh]">
        <div className="p-4 rounded-xl bg-[#F8ECE9] border border-[#E8D4CF] text-[#933D32] text-sm max-w-xl flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <Link className="underline mt-4 inline-block text-xs font-semibold text-[#1E1917]" href="/account">
          &larr; Back to your account
        </Link>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="container py-28 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1E1917] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-[#7A726D]">Loading your order details…</p>
      </main>
    )
  }

  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  return (
    <main className="container py-12 md:py-16 min-h-[50vh] space-y-8">
      <Link href="/account" className="text-xs font-semibold text-[#933D32] hover:underline flex items-center gap-1">
        <span>&larr; Return to Your Account</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Order Receipt</div>
          <h1 className="serif text-3xl sm:text-4xl md:text-5xl text-[#1E1917] font-normal mt-1">
            {order.order_number}
          </h1>
          <p className="text-xs text-[#7A726D] mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <span className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#F8ECE9] text-[#933D32] border border-[#E8D4CF] w-fit">
          {isPickup ? 'Bakery Pickup' : 'Doorstep Delivery'}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_370px] gap-8 lg:gap-12 items-start">
        <section className="space-y-8">
          {/* Order Progress Timeline */}
          <div className="bg-white rounded-3xl border border-[#EAE3DC] p-6 sm:p-8 shadow-card space-y-4">
            <h2 className="serif text-2xl text-[#1E1917] font-normal">Kitchen &middot; Transit Progress</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {timeline.map((status, i) => {
                const isPassed = timeline.indexOf(order.status) >= i
                return (
                  <div
                    key={status}
                    className={`p-3.5 rounded-xl text-xs capitalize flex items-center justify-between border transition-all ${
                      isPassed
                        ? 'bg-[#1E1917] text-white border-[#1E1917] shadow-sm font-medium'
                        : 'bg-[#FAF8F5] text-[#7A726D] border-[#EAE3DC]'
                    }`}
                  >
                    <span>{status.replaceAll('_', ' ')}</span>
                    {isPassed && <span className="text-xs text-[#E8D4CF] font-bold">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fulfillment Details Section */}
          <div className="bg-white rounded-3xl border border-[#EAE3DC] p-6 sm:p-8 shadow-card space-y-4">
            <h2 className="serif text-2xl text-[#1E1917] font-normal flex items-center gap-2 pb-3 border-b border-[#F2ECE5]">
              {isPickup ? <Store size={20} className="text-[#933D32]" /> : <Truck size={20} className="text-[#933D32]" />}
              <span>{isPickup ? 'Pickup Information' : 'Delivery Details'}</span>
            </h2>

            {!isPickup ? (
              <div className="space-y-3.5 text-sm text-[#5A524D]">
                <div className="flex items-start gap-3">
                  <MapPin size={17} className="text-[#933D32] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#7A726D] font-semibold">Destination Address</span>
                    <p className="font-medium text-[#1E1917] mt-0.5">{order.delivery_address}</p>
                    <p className="text-xs text-[#7A726D]">{order.city}, {order.state} &middot; {order.country || 'Nigeria'}</p>
                    {order.landmark && (
                      <p className="text-xs text-[#7A726D] mt-0.5">Landmark: {order.landmark}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-[#F2ECE5]">
                  <Calendar size={17} className="text-[#933D32] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#7A726D] font-semibold">Delivery Schedule</span>
                    <p className="font-medium text-[#1E1917] mt-0.5">
                      {order.delivery_date} &middot; {order.delivery_window}
                    </p>
                  </div>
                </div>

                {order.delivery_instructions && (
                  <div className="pt-3 border-t border-[#F2ECE5]">
                    <span className="block text-[11px] uppercase tracking-wider text-[#7A726D] font-semibold mb-1">Driver Instructions</span>
                    <p className="text-xs bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EAE3DC] italic text-[#5A524D]">
                      &ldquo;{order.delivery_instructions}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 text-sm text-[#5A524D]">
                <div className="flex items-start gap-3">
                  <Store size={17} className="text-[#933D32] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#7A726D] font-semibold">Bakery Location</span>
                    <p className="font-medium text-[#1E1917] mt-0.5">{SPEEDCAKE_PICKUP_LOCATION.name}</p>
                    <p className="text-xs text-[#7A726D]">
                      {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city}, {SPEEDCAKE_PICKUP_LOCATION.state}
                    </p>
                    <p className="text-xs text-[#7A726D] mt-1">Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</p>
                    <p className="text-xs text-[#7A726D]">Phone: {SPEEDCAKE_PICKUP_LOCATION.phone}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F2ECE5] text-xs text-[#933D32] italic">
                  {SPEEDCAKE_PICKUP_LOCATION.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Cake Items List */}
          <div className="space-y-3">
            <h2 className="serif text-2xl text-[#1E1917] font-normal">Cakes in this Order</h2>
            <div className="grid gap-3">
              {order.order_items.map((item: any, idx: number) => (
                <div className="bg-white rounded-2xl border border-[#EAE3DC] p-5 sm:p-6 flex justify-between items-start gap-4 shadow-subtle" key={idx}>
                  <div className="space-y-1">
                    <div className="font-semibold text-base text-[#1E1917]">
                      {item.quantity} &times; {item.product_snapshot?.name}
                    </div>
                    <div className="text-xs text-[#7A726D]">
                      Size: <span className="font-medium text-[#1E1917]">{item.variant_snapshot?.name}</span>
                      {item.customization?.message ? ` &middot; Inscription: “${item.customization.message}”` : ''}
                    </div>
                    {item.customization?.choices && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.customization.choices.map((c: any, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="text-[11px] bg-[#FAF8F5] border border-[#EAE3DC] px-2.5 py-0.5 rounded-full text-[#5A524D]"
                          >
                            {c.label}: <b>{c.value}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-base font-bold text-[#1E1917] shrink-0">
                    {naira(item.line_total_kobo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Financial & Status Summary Sidebar */}
        <aside className="bg-white rounded-3xl border border-[#EAE3DC] p-6 sm:p-7 shadow-card space-y-5 lg:sticky lg:top-28">
          <h2 className="serif text-2xl text-[#1E1917] font-normal pb-3 border-b border-[#F2ECE5]">
            Payment &amp; Summary
          </h2>

          <div className="space-y-2 text-xs text-[#5A524D] pb-4 border-b border-[#F2ECE5]">
            <div className="flex justify-between">
              <span className="text-[#7A726D]">Customer:</span>
              <span className="font-medium text-[#1E1917]">
                {order.first_name || order.last_name
                  ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                  : order.customer_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A726D]">Phone:</span>
              <span className="font-medium text-[#1E1917]">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A726D]">Email:</span>
              <span className="font-medium text-[#1E1917] truncate max-w-[190px]">{order.customer_email}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-sm text-[#5A524D]">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-semibold text-[#1E1917]">{naira(order.subtotal_kobo)}</span>
            </div>
            <div className="flex justify-between">
              <span>{isPickup ? 'Store Pickup' : 'Delivery Charge'}</span>
              <span>{isPickup ? '₦0 (Free)' : naira(order.delivery_charge_kobo)}</span>
            </div>
            <div className="flex justify-between font-serif font-bold text-lg text-[#1E1917] pt-3 border-t border-[#F2ECE5]">
              <span>Total Paid</span>
              <span>{naira(order.total_kobo)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F2ECE5] text-xs">
            <span className="text-[#7A726D] block">Payment Gateway Status:</span>
            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold capitalize bg-[#FAF8F5] border border-[#EAE3DC] text-[#1E1917]">
              {order.payment_status}
            </span>
          </div>

          {order.status === 'pending_payment' && order.payment_status !== 'success' && (
            <div className="pt-3">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retrying}
                className="w-full bg-[#1E1917] hover:bg-[#332C29] text-white py-3.5 px-6 rounded-full text-xs font-semibold shadow-card hover:shadow-card-hover transition disabled:opacity-50"
              >
                {retrying ? 'Connecting to Paystack…' : 'Complete Payment Now'}
              </button>
              {retryError && (
                <p className="text-[11px] text-[#933D32] mt-2 leading-snug">{retryError}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
