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
        <div className="p-4 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-sm max-w-xl flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <Link className="underline mt-4 inline-block text-sm text-[#6f3d36]" href="/account">
          ← Back to your account
        </Link>
      </main>
    )
  }

  if (!order) {
    return <main className="container py-24 text-center text-sm text-[#756862]">Loading your order…</main>
  }

  const isPickup =
    order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup'

  return (
    <main className="container py-14 min-h-[50vh]">
      <Link href="/account" className="text-xs uppercase tracking-wider font-semibold text-[#8a5b51] hover:underline">
        ← Your account
      </Link>

      <div className="eyebrow mt-6">Order details</div>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-2">
        <h1 className="serif text-4xl md:text-5xl text-[#352c28]">{order.order_number}</h1>
        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-[#f4ebe6] text-[#6f3d36] border border-[#ded0c8] w-fit">
          {isPickup ? 'Store Pickup' : 'Home Delivery'}
        </span>
      </div>
      <p className="text-xs text-[#756862] mt-2">
        Placed {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 mt-8">
        <section className="space-y-10">
          {/* Order Progress Timeline */}
          <div>
            <h2 className="serif text-2xl text-[#352c28]">Order progress</h2>
            <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
              {timeline.map((status, i) => (
                <div
                  key={status}
                  className={`p-3 text-xs capitalize flex items-center justify-between border ${
                    timeline.indexOf(order.status) >= i
                      ? 'bg-[#6f3d36] text-white border-[#6f3d36]'
                      : 'bg-[#fcf9f6] text-[#867872] border-[#ded0c8]'
                  }`}
                >
                  <span>{status.replaceAll('_', ' ')}</span>
                  {timeline.indexOf(order.status) >= i && <span className="text-[10px]">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Details Section */}
          <div className="border border-[#ded0c8] p-6 bg-white space-y-4">
            <h2 className="serif text-2xl text-[#352c28] flex items-center gap-2 pb-3 border-b border-[#eee4dc]">
              {isPickup ? <Store size={20} className="text-[#6f3d36]" /> : <Truck size={20} className="text-[#6f3d36]" />}
              <span>{isPickup ? 'Pickup Information' : 'Delivery Details'}</span>
            </h2>

            {!isPickup ? (
              <div className="space-y-3 text-sm text-[#52443e]">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[#6f3d36] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-[#867872] font-medium">Destination</span>
                    <p className="font-medium text-[#352c28] mt-0.5">{order.delivery_address}</p>
                    <p className="text-xs text-[#756862]">{order.city}, {order.state} · {order.country || 'Nigeria'}</p>
                    {order.landmark && (
                      <p className="text-xs text-[#867872] mt-0.5">Landmark: {order.landmark}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-[#f4ece6]">
                  <Calendar size={16} className="text-[#6f3d36] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-[#867872] font-medium">Delivery Date & Window</span>
                    <p className="font-medium text-[#352c28] mt-0.5">
                      {order.delivery_date} · {order.delivery_window}
                    </p>
                  </div>
                </div>

                {order.delivery_instructions && (
                  <div className="pt-2 border-t border-[#f4ece6]">
                    <span className="block text-xs uppercase tracking-wider text-[#867872] font-medium mb-1">Driver Instructions</span>
                    <p className="text-xs bg-[#fbf7f4] p-3 border border-[#ded0c8] italic text-[#52443e]">
                      &ldquo;{order.delivery_instructions}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[#52443e]">
                <div className="flex items-start gap-2.5">
                  <Store size={16} className="text-[#6f3d36] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-[#867872] font-medium">Bakery Location</span>
                    <p className="font-medium text-[#352c28] mt-0.5">{SPEEDCAKE_PICKUP_LOCATION.name}</p>
                    <p className="text-xs text-[#756862]">
                      {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city}, {SPEEDCAKE_PICKUP_LOCATION.state}
                    </p>
                    <p className="text-xs text-[#756862] mt-1">Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</p>
                    <p className="text-xs text-[#756862]">Phone: {SPEEDCAKE_PICKUP_LOCATION.phone}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f4ece6] text-xs text-[#6f3d36]">
                  {SPEEDCAKE_PICKUP_LOCATION.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Cake Items List */}
          <div>
            <h2 className="serif text-2xl text-[#352c28]">Your cakes</h2>
            <div className="grid gap-3 mt-4">
              {order.order_items.map((item: any, idx: number) => (
                <div className="border border-[#ded0c8] bg-white p-5 flex justify-between gap-4" key={idx}>
                  <div>
                    <b className="text-sm text-[#352c28]">
                      {item.quantity} × {item.product_snapshot?.name}
                    </b>
                    <div className="text-xs text-[#756862] mt-1">
                      {item.variant_snapshot?.name}
                      {item.customization?.message ? ` · Message: “${item.customization.message}”` : ''}
                    </div>
                    {item.customization?.choices && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.customization.choices.map((c: any, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="text-[11px] bg-[#fbf7f4] border border-[#ded0c8] px-2 py-0.5 text-[#63534c]"
                          >
                            {c.label}: <b>{c.value}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#352c28] shrink-0">
                    {naira(item.line_total_kobo)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Financial & Status Summary Sidebar */}
        <aside className="bg-[#f5ece6] border border-[#e3d5cc] p-6 h-fit space-y-5">
          <h2 className="serif text-2xl text-[#352c28]">Payment & Summary</h2>

          <div className="space-y-2 text-xs text-[#52443e] pb-4 border-b border-[#dac8be]">
            <div className="flex justify-between">
              <span className="text-[#867872]">Customer:</span>
              <span className="font-medium text-[#352c28]">
                {order.first_name || order.last_name
                  ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                  : order.customer_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#867872]">Phone:</span>
              <span className="font-medium text-[#352c28]">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#867872]">Email:</span>
              <span className="font-medium text-[#352c28] truncate max-w-[190px]">{order.customer_email}</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[#52443e]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{naira(order.subtotal_kobo)}</span>
            </div>
            <div className="flex justify-between">
              <span>{isPickup ? 'Store Pickup' : 'Delivery Charge'}</span>
              <span>{isPickup ? '₦0 (Free)' : naira(order.delivery_charge_kobo)}</span>
            </div>
            <div className="flex justify-between border-t border-[#dac8be] pt-3 font-serif font-bold text-base text-[#352c28]">
              <span>Total</span>
              <span>{naira(order.total_kobo)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#dac8be] text-xs">
            <span className="text-[#867872] block">Payment Status:</span>
            <b className="capitalize text-sm text-[#6f3d36] mt-0.5 block">{order.payment_status}</b>
          </div>

          {order.status === 'pending_payment' && order.payment_status !== 'success' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retrying}
                className="w-full bg-[#6f3d36] text-white py-3 px-4 text-xs font-semibold uppercase tracking-wider hover:bg-[#592f29] transition disabled:opacity-50"
              >
                {retrying ? 'Connecting to Paystack…' : 'Complete Payment / Pay Now'}
              </button>
              {retryError && (
                <p className="text-[11px] text-[#8b342a] mt-1.5 leading-snug">{retryError}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
