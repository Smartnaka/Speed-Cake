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
    <main className="container py-10 md:py-14 min-h-[60vh] space-y-8">
      <div className="max-w-xl space-y-1">
        <div className="eyebrow">Real-Time Kitchen Updates</div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#2A1E24] font-extrabold tracking-tight">
          Track Your Order
        </h1>
        <p className="text-sm text-[#8A7380] leading-relaxed">
          Enter your order reference code (e.g. SC-...) to view live preparation progress and delivery status.
        </p>
      </div>

      {/* Lookup Form */}
      <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7380]" />
          <input
            aria-label="Order number"
            required
            placeholder="e.g. SC-A8F4C2D1E0"
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-full border border-[#FAD1E0] bg-white text-sm text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
          />
        </div>
        <button
          disabled={busy}
          className="px-8 py-3.5 rounded-full bg-[#E60067] hover:bg-[#C70055] text-white text-xs font-black uppercase tracking-wider transition-all shadow-pink-glow hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {busy ? 'Checking…' : 'Locate Order'}
        </button>
      </form>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-[#FFE4EE] border border-[#FAD1E0] text-[#E60067] text-xs font-bold max-w-xl">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-10 max-w-3xl space-y-8 shadow-card animate-in fade-in-50 duration-300">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-6 border-b border-[#FAD1E0]/60">
            <div>
              <span className="eyebrow">Order Reference</span>
              <h2 className="text-3xl text-[#2A1E24] font-black mt-1 font-mono">{order.order_number}</h2>
            </div>
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFE4EE] border border-[#FAD1E0] text-xs font-black capitalize text-[#E60067]">
                {order.status.replaceAll('_', ' ')}
              </span>
            </div>
          </div>

          {/* Fulfillment Badge & Info */}
          <div className="p-5 bg-[#FFF5F8] rounded-2xl border border-[#FAD1E0] text-xs text-[#55424D] space-y-2.5">
            <div className="flex items-center gap-2 font-extrabold text-sm text-[#2A1E24]">
              {isPickup ? <Store size={18} className="text-[#E60067]" /> : <Truck size={18} className="text-[#E60067]" />}
              <span>{isPickup ? 'Store Pickup Order' : 'Doorstep Delivery Order'}</span>
            </div>

            {!isPickup ? (
              <div className="space-y-1.5 pl-6 text-[#55424D]">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-[#E60067]" />
                  <span>
                    Destination: <b>{order.delivery_address}</b>, {order.city}, {order.state}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#E60067]" />
                  <span>
                    Delivery Schedule: <b>{order.delivery_date}</b> ({order.delivery_window})
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pl-6 text-[#55424D]">
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
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#2A1E24]">
              Kitchen &middot; Delivery Milestones
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {steps.map((step, i) => {
                const isPassed = steps.indexOf(order.status) >= i
                return (
                  <div
                    key={step}
                    className={`text-xs px-4 py-3 rounded-2xl flex items-center gap-3 border transition-all ${
                      isPassed
                        ? 'bg-[#E60067] text-white border-[#E60067] shadow-pink-glow font-bold'
                        : 'bg-[#FFF5F8] text-[#8A7380] border-[#FAD1E0]'
                    }`}
                  >
                    {isPassed ? (
                      <PackageCheck size={16} className="text-white" />
                    ) : (
                      <Clock3 size={16} className="text-[#8A7380]" />
                    )}
                    <span className="capitalize">{step.replaceAll('_', ' ')}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Card */}
          <div className="pt-4 border-t border-[#FAD1E0]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <span className="text-[#8A7380]">
              Payment Status: <b className="capitalize text-[#2A1E24]">{order.payment_status}</b>
            </span>
            <Link
              href={`/account/orders/${order.order_number}`}
              className="inline-flex items-center gap-1 font-bold text-[#E60067] hover:underline"
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
