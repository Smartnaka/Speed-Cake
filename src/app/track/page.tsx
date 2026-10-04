'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PackageCheck, Clock3, Truck, Store, MapPin, Calendar, Search, ArrowRight } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { SPEEDCAKE_PICKUP_LOCATION } from '@/lib/delivery-config'

const steps = [
  'pending_payment',
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
]

export default function Track() {
  const [number, setNumber] = useState('')
  const [order, setOrder] = useState<any>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setOrder(null)

    try {
      const {
        data: { session },
      } = await supabaseBrowser().auth.getSession()

      if (!session) {
        router.push(`/account?next=${encodeURIComponent(`/track`)}`)
        return
      }

      const r = await fetch(`/api/orders/${encodeURIComponent(number.trim())}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Unable to locate order.')
      setOrder(d.order)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load this order.')
    } finally {
      setBusy(false)
    }
  }

  const isPickup =
    order &&
    (order.fulfillment_type === 'pickup' || order.delivery_window === 'Store Pickup')

  return (
    <main className="container py-12 md:py-16 min-h-[55vh] space-y-8">
      <div className="max-w-xl space-y-2">
        <div className="eyebrow">Real-Time Kitchen Updates</div>
        <h1 className="serif text-4xl md:text-5xl text-[#1E1917] font-normal tracking-tight">
          Track Your Order
        </h1>
        <p className="text-sm text-[#7A726D] leading-relaxed">
          Enter your order reference code (e.g. SC-...) to view live preparation progress and delivery status.
        </p>
      </div>

      {/* Lookup Form */}
      <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A726D]" />
          <input
            aria-label="Order number"
            required
            placeholder="e.g. SC-A8F4C2D1E0"
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-full border border-[#EAE3DC] bg-white text-sm text-[#1E1917] placeholder:text-[#9C938E] outline-none focus:border-[#1E1917] focus:ring-1 focus:ring-[#1E1917] transition shadow-subtle"
          />
        </div>
        <button
          disabled={busy}
          className="px-7 py-3.5 rounded-full bg-[#1E1917] hover:bg-[#332C29] text-white text-sm font-semibold transition-all shadow-card hover:shadow-card-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {busy ? 'Checking…' : 'Locate Order'}
        </button>
      </form>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-[#F8ECE9] border border-[#E8D4CF] text-[#933D32] text-xs max-w-xl">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white rounded-3xl border border-[#EAE3DC] p-6 sm:p-10 max-w-3xl space-y-8 shadow-card animate-in fade-in-50 duration-300">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-6 border-b border-[#F2ECE5]">
            <div>
              <span className="eyebrow">Order Reference</span>
              <h2 className="serif text-3xl text-[#1E1917] font-normal mt-1">{order.order_number}</h2>
            </div>
            <div>
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#F8ECE9] border border-[#E8D4CF] text-xs font-semibold capitalize text-[#933D32]">
                {order.status.replaceAll('_', ' ')}
              </span>
            </div>
          </div>

          {/* Fulfillment Badge & Info */}
          <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#EAE3DC] text-xs text-[#5A524D] space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#1E1917]">
              {isPickup ? <Store size={18} className="text-[#933D32]" /> : <Truck size={18} className="text-[#933D32]" />}
              <span>{isPickup ? 'Store Pickup Order' : 'Doorstep Delivery Order'}</span>
            </div>

            {!isPickup ? (
              <div className="space-y-1.5 pl-6 text-[#5A524D]">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-[#933D32]" />
                  <span>
                    Destination: <b>{order.delivery_address}</b>, {order.city}, {order.state}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#933D32]" />
                  <span>
                    Delivery Schedule: <b>{order.delivery_date}</b> ({order.delivery_window})
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pl-6 text-[#5A524D]">
                <div>
                  Pickup Location: <b>{SPEEDCAKE_PICKUP_LOCATION.name}</b>
                </div>
                <div>
                  Address: {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city}
                </div>
                <div>Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</div>
              </div>
            )}
          </div>

          {/* Progress Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1E1917]">
              Kitchen &middot; Delivery Milestones
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {steps.map((step, i) => {
                const isPassed = steps.indexOf(order.status) >= i
                return (
                  <div
                    key={step}
                    className={`text-xs px-4 py-3 rounded-xl flex items-center gap-3 border transition-all ${
                      isPassed
                        ? 'bg-[#1E1917] text-white border-[#1E1917] shadow-sm'
                        : 'bg-[#FAF8F5] text-[#7A726D] border-[#EAE3DC]'
                    }`}
                  >
                    {isPassed ? (
                      <PackageCheck size={16} className="text-[#E8D4CF]" />
                    ) : (
                      <Clock3 size={16} className="text-[#C8BFBA]" />
                    )}
                    <span className="capitalize font-medium">{step.replaceAll('_', ' ')}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Card */}
          <div className="pt-4 border-t border-[#F2ECE5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <span className="text-[#7A726D]">
              Payment Status: <b className="capitalize text-[#1E1917]">{order.payment_status}</b>
            </span>
            <Link
              href={`/account/orders/${order.order_number}`}
              className="inline-flex items-center gap-1 font-semibold text-[#933D32] hover:underline"
            >
              <span>View complete order receipt</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
