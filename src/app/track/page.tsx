'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PackageCheck, Clock3, Truck, Store, MapPin, Calendar } from 'lucide-react'
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
    <main className="container py-16 min-h-[50vh]">
      <div className="eyebrow">A little peace of mind</div>
      <h1 className="serif text-4xl md:text-5xl mt-3 text-[#352c28]">Track your order</h1>
      <p className="text-sm text-[#756862] mt-3">
        Enter your order reference number to view the preparation and fulfillment status.
      </p>

      <form onSubmit={lookup} className="grid sm:grid-cols-[1fr_auto] gap-3 mt-8 max-w-xl">
        <input
          aria-label="Order number"
          required
          placeholder="e.g. SC-A8F4C2D1E0"
          value={number}
          onChange={e => setNumber(e.target.value)}
          className="border border-[#ded0c8] bg-[#fdfbf9] p-3.5 text-sm outline-none focus:border-[#6f3d36] transition"
        />
        <button
          disabled={busy}
          className="bg-[#6f3d36] hover:bg-[#5b322c] text-white px-7 py-3.5 text-sm font-medium transition disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Checking…' : 'Find my order'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-10 border border-[#e5d9d1] bg-white p-6 md:p-8 max-w-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-[#eee4dc]">
            <div>
              <span className="eyebrow">Order Reference</span>
              <h2 className="serif text-3xl text-[#352c28] mt-1">{order.order_number}</h2>
            </div>
            <div className="sm:text-right">
              <span className="eyebrow">Status</span>
              <div className="capitalize mt-1 font-semibold text-[#6f3d36]">
                {order.status.replaceAll('_', ' ')}
              </div>
            </div>
          </div>

          {/* Fulfillment Badge & Info */}
          <div className="p-4 bg-[#fbf7f4] border border-[#e8dcd6] rounded-none text-xs text-[#52443e] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#352c28]">
              {isPickup ? <Store size={18} className="text-[#6f3d36]" /> : <Truck size={18} className="text-[#6f3d36]" />}
              <span>{isPickup ? 'Store Pickup Order' : 'Doorstep Delivery Order'}</span>
            </div>

            {!isPickup ? (
              <div className="space-y-1 pl-6 text-[#5e514b]">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#867872]" />
                  <span>
                    Destination: <b>{order.delivery_address}</b>, {order.city}, {order.state}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#867872]" />
                  <span>
                    Delivery Schedule: <b>{order.delivery_date}</b> ({order.delivery_window})
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 pl-6 text-[#5e514b]">
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
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[#867872] mb-3">
              Progress
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {steps.map((step, i) => (
                <div
                  className={`text-xs px-3.5 py-3 flex items-center gap-2.5 border ${
                    steps.indexOf(order.status) >= i
                      ? 'bg-[#6f3d36] text-white border-[#6f3d36]'
                      : 'bg-[#fcf9f6] text-[#867872] border-[#ded0c8]'
                  }`}
                  key={step}
                >
                  {steps.indexOf(order.status) >= i ? (
                    <PackageCheck size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}
                  <span className="capitalize">{step.replaceAll('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#eee4dc] flex items-center justify-between text-xs">
            <span className="text-[#756862]">
              Payment Status: <b className="capitalize text-[#352c28]">{order.payment_status}</b>
            </span>
            <Link
              href={`/account/orders/${order.order_number}`}
              className="text-[#6f3d36] font-semibold underline hover:text-[#5b322c]"
            >
              View complete order details →
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
