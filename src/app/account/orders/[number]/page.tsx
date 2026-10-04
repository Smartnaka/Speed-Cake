'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Truck, Store, MapPin, Calendar, AlertCircle } from 'lucide-react'
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
        <div className="p-4 rounded-2xl bg-[#FFE4EE] border border-[#FAD1E0] text-[#E60067] text-sm max-w-xl flex items-center gap-3 font-bold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <Link className="underline mt-4 inline-block text-xs font-bold text-[#E60067]" href="/account">
          &larr; Back to your account
        </Link>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="container py-28 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#FAD1E0] border-t-[#E60067] animate-spin mx-auto" />
        <p className="text-sm font-bold text-[#8A7380]">Loading your order details…</p>
      </main>
    )
  }

  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  return (
    <main className="container py-10 md:py-14 min-h-[60vh] space-y-8">
      <Link href="/account" className="text-xs font-bold text-[#E60067] hover:underline flex items-center gap-1">
        <span>&larr; Return to Your Account</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Order Receipt</div>
          <h1 className="text-3xl sm:text-4xl text-[#2A1E24] font-black mt-1 font-mono">
            {order.order_number}
          </h1>
          <p className="text-xs text-[#8A7380] mt-1 font-medium">
            Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <span className="text-xs font-black px-4 py-1.5 rounded-full bg-[#FFE4EE] text-[#E60067] border border-[#FAD1E0] w-fit">
          {isPickup ? 'Bakery Pickup' : 'Doorstep Delivery'}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_370px] gap-8 lg:gap-10 items-start">
        <section className="space-y-8">
          {/* Order Progress Timeline */}
          <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-8 shadow-card space-y-4">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold">Kitchen &middot; Transit Progress</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {timeline.map((status, i) => {
                const isPassed = timeline.indexOf(order.status) >= i
                return (
                  <div
                    key={status}
                    className={`p-3.5 rounded-2xl text-xs capitalize flex items-center justify-between border transition-all ${
                      isPassed
                        ? 'bg-[#E60067] text-white border-[#E60067] shadow-pink-glow font-bold'
                        : 'bg-[#FFF5F8] text-[#8A7380] border-[#FAD1E0]'
                    }`}
                  >
                    <span>{status.replaceAll('_', ' ')}</span>
                    {isPassed && <span className="text-xs text-white font-black">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fulfillment Details Section */}
          <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-8 shadow-card space-y-4">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold flex items-center gap-2 pb-3 border-b border-[#FAD1E0]/60">
              {isPickup ? <Store size={20} className="text-[#E60067]" /> : <Truck size={20} className="text-[#E60067]" />}
              <span>{isPickup ? 'Pickup Information' : 'Delivery Details'}</span>
            </h2>

            {!isPickup ? (
              <div className="space-y-3.5 text-sm text-[#5A524D]">
                <div className="flex items-start gap-3">
                  <MapPin size={17} className="text-[#E60067] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#8A7380] font-bold">Destination Address</span>
                    <p className="font-bold text-[#2A1E24] mt-0.5">{order.delivery_address}</p>
                    <p className="text-xs text-[#8A7380]">{order.city}, {order.state} &middot; {order.country || 'Nigeria'}</p>
                    {order.landmark && (
                      <p className="text-xs text-[#8A7380] mt-0.5">Landmark: {order.landmark}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-[#FAD1E0]/60">
                  <Calendar size={17} className="text-[#E60067] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#8A7380] font-bold">Delivery Schedule</span>
                    <p className="font-bold text-[#2A1E24] mt-0.5">
                      {order.delivery_date} &middot; {order.delivery_window}
                    </p>
                  </div>
                </div>

                {order.delivery_instructions && (
                  <div className="pt-3 border-t border-[#FAD1E0]/60">
                    <span className="block text-[11px] uppercase tracking-wider text-[#8A7380] font-bold mb-1">Driver Instructions</span>
                    <p className="text-xs bg-[#FFF5F8] p-3.5 rounded-2xl border border-[#FAD1E0] italic text-[#55424D]">
                      &ldquo;{order.delivery_instructions}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 text-sm text-[#5A524D]">
                <div className="flex items-start gap-3">
                  <Store size={17} className="text-[#E60067] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-[#8A7380] font-bold">Bakery Location</span>
                    <p className="font-bold text-[#2A1E24] mt-0.5">{SPEEDCAKE_PICKUP_LOCATION.name}</p>
                    <p className="text-xs text-[#8A7380]">
                      {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city}, {SPEEDCAKE_PICKUP_LOCATION.state}
                    </p>
                    <p className="text-xs text-[#8A7380] mt-1">Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</p>
                    <p className="text-xs text-[#8A7380]">Phone: {SPEEDCAKE_PICKUP_LOCATION.phone}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#FAD1E0]/60 text-xs text-[#E60067] font-semibold italic">
                  {SPEEDCAKE_PICKUP_LOCATION.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Cake Items List */}
          <div className="space-y-3">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold">Cakes in this Order</h2>
            <div className="grid gap-3">
              {order.order_items.map((item: any, idx: number) => (
                <div className="bg-white rounded-3xl border border-[#FAD1E0] p-5 sm:p-6 flex justify-between items-start gap-4 shadow-card" key={idx}>
                  <div className="space-y-1">
                    <div className="font-extrabold text-base text-[#2A1E24]">
                      {item.quantity} &times; {item.product_snapshot?.name}
                    </div>
                    <div className="text-xs text-[#8A7380]">
                      Size: <span className="font-bold text-[#2A1E24]">{item.variant_snapshot?.name}</span>
                      {item.customization?.message ? ` &middot; Inscription: “${item.customization.message}”` : ''}
                    </div>
                    {item.customization?.choices && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.customization.choices.map((c: any, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="text-[11px] bg-[#FFF5F8] border border-[#FAD1E0] px-2.5 py-0.5 rounded-full text-[#55424D] font-medium"
                          >
                            {c.label}: <b>{c.value}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-base font-black text-[#2A1E24] shrink-0">
                    {naira(item.line_total_kobo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Financial & Status Summary Sidebar */}
        <aside className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-7 shadow-card space-y-5 lg:sticky lg:top-28">
          <h2 className="text-xl text-[#2A1E24] font-extrabold pb-3 border-b border-[#FAD1E0]/60">
            Payment &amp; Summary
          </h2>

          <div className="space-y-2 text-xs text-[#5A524D] pb-4 border-b border-[#FAD1E0]/60">
            <div className="flex justify-between">
              <span className="text-[#8A7380]">Customer:</span>
              <span className="font-bold text-[#2A1E24]">
                {order.first_name || order.last_name
                  ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                  : order.customer_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A7380]">Phone:</span>
              <span className="font-bold text-[#2A1E24]">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A7380]">Email:</span>
              <span className="font-bold text-[#2A1E24] truncate max-w-[190px]">{order.customer_email}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-sm text-[#5A524D]">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-bold text-[#2A1E24]">{naira(order.subtotal_kobo)}</span>
            </div>
            <div className="flex justify-between">
              <span>{isPickup ? 'Store Pickup' : 'Delivery Charge'}</span>
              <span className="font-semibold">{isPickup ? '₦0 (Free)' : naira(order.delivery_charge_kobo)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-lg text-[#2A1E24] pt-3 border-t border-[#FAD1E0]/60">
              <span>Total Paid</span>
              <span className="text-xl text-[#E60067] font-black">{naira(order.total_kobo)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#FAD1E0]/60 text-xs">
            <span className="text-[#8A7380] block">Payment Gateway Status:</span>
            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-black capitalize bg-[#FFE4EE] border border-[#FAD1E0] text-[#E60067]">
              {order.payment_status}
            </span>
          </div>

          {order.status === 'pending_payment' && order.payment_status !== 'success' && (
            <div className="pt-3">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retrying}
                className="w-full bg-[#E60067] hover:bg-[#C70055] text-white py-4 px-6 rounded-full text-xs font-black uppercase tracking-wider shadow-pink-glow transition disabled:opacity-50"
              >
                {retrying ? 'Connecting to Paystack…' : 'Complete Payment Now'}
              </button>
              {retryError && (
                <p className="text-[11px] text-[#E60067] font-bold mt-2 leading-snug">{retryError}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
