'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck, Store, MapPin, Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { checkoutFormSchema, type CheckoutFormInput } from '@/lib/schemas'
import { CartItem, readCart, isCartItemValid } from '@/lib/cart'
import { naira } from '@/lib/demo-products'
import { supabaseBrowser } from '@/lib/supabase/browser'
import {
  DELIVERY_TIME_WINDOWS,
  SPEEDCAKE_PICKUP_LOCATION,
  DEFAULT_DELIVERY_CHARGE_KOBO,
} from '@/lib/delivery-config'

type CheckoutFormData = {
  fulfillment_type: 'delivery' | 'pickup'
  first_name: string
  last_name: string
  country: string
  address?: string | null
  city: string
  state: string
  phone: string
  email: string
  landmark?: string | null
  instructions?: string | null
  delivery_date?: string | null
  delivery_window?: string | null
}

const inputClass =
  'w-full border border-[#FAD1E0] bg-[#FFF5F8] px-4 py-3 rounded-2xl text-sm text-[#2A1E24] outline-none focus:border-[#E60067] focus:bg-white focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle placeholder:text-[#8A7380]'

export default function Checkout() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [windows, setWindows] = useState<string[]>(Array.from(DELIVERY_TIME_WINDOWS))
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `sc-checkout-${Date.now()}`
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fulfillment_type: 'delivery',
      country: 'Nigeria',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      landmark: '',
      instructions: '',
      delivery_date: '',
      delivery_window: DELIVERY_TIME_WINDOWS[0],
    },
  })

  const fulfillmentType = watch('fulfillment_type')
  const isPickup = fulfillmentType === 'pickup'
  const state = watch('state')
  const city = watch('city')
  const date = watch('delivery_date')
  const firstName = watch('first_name')
  const lastName = watch('last_name')
  const phone = watch('phone')
  const email = watch('email')
  const address = watch('address')
  const deliveryWindow = watch('delivery_window')

  // 1. Initial auth check & prefill
  useEffect(() => {
    setItems(readCart())
    let active = true

    async function checkAuth() {
      try {
        const db = supabaseBrowser()
        const {
          data: { session },
        } = await db.auth.getSession()

        if (!session) {
          router.replace('/account?next=%2Fcheckout')
          return
        }

        if (active) {
          setAuthReady(true)
          if (session.user.email) {
            setValue('email', session.user.email)
          }

          // Fetch user profile to prefill name and phone
          const { data: profile } = await db
            .from('profiles')
            .select('full_name, phone')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile) {
            if (profile.full_name) {
              const parts = profile.full_name.trim().split(/\s+/)
              if (parts.length > 0) setValue('first_name', parts[0])
              if (parts.length > 1) setValue('last_name', parts.slice(1).join(' '))
            }
            if (profile.phone) {
              setValue('phone', profile.phone)
            }
          }
        }
      } catch {
        router.replace('/account?next=%2Fcheckout')
      }
    }

    void checkAuth()
    return () => {
      active = false
    }
  }, [router, setValue])

  // 2. Computed pricing (zero delivery-zone dependencies)
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const currentFeeKobo = isPickup ? 0 : DEFAULT_DELIVERY_CHARGE_KOBO
  const totalAmountKobo = subtotal + currentFeeKobo

  // 4. Form submission
  async function submit(values: CheckoutFormData) {
    setError('')
    if (!items.length) {
      setError('Your bag is empty.')
      return
    }

    setLoading(true)

    try {
      const db = supabaseBrowser()
      const {
        data: { session },
      } = await db.auth.getSession()

      if (!session) {
        router.replace('/account?next=%2Fcheckout')
        return
      }

      const orderItems = items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        customization: {
          message: item.message,
          choices: Object.fromEntries(
            Object.entries(item.choices || {}).map(([id, choices]) => [
              id,
              choices.map(choice => choice.value),
            ])
          ),
        },
      }))

      const payload = {
        fulfillment_type: values.fulfillment_type,
        first_name: values.first_name,
        last_name: values.last_name,
        country: values.country || 'Nigeria',
        phone: values.phone,
        email: values.email,
        city: values.city,
        state: values.state,
        address: isPickup ? null : values.address,
        landmark: isPickup ? null : values.landmark || null,
        instructions: isPickup ? null : values.instructions || null,
        delivery_date: isPickup ? null : values.delivery_date,
        delivery_window: isPickup ? 'Store Pickup' : values.delivery_window,
        idempotency_key: idempotencyKey,
        items: orderItems,
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        router.replace('/account?next=%2Fcheckout')
        return
      }

      const data = await response.json()

      if (data.already_paid && data.order_number) {
        router.push(`/account/orders/${data.order_number}`)
        return
      }

      if (data.authorization_url) {
        localStorage.setItem(
          'speedcake-last-order',
          JSON.stringify({ order_number: data.order_number })
        )
        window.location.href = data.authorization_url
        return
      }

      setError(data.error || 'We could not start checkout.')
    } catch {
      setError('We could not connect to payment gateway. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // 5. Loading & Empty Bag views
  if (!authReady) {
    return (
      <main className="container py-24 min-h-[50vh] text-center flex flex-col items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#6f3d36] mb-3" />
        <p className="text-sm text-[#756862]">Verifying your account session…</p>
      </main>
    )
  }

  const hasInvalidItems = items.length > 0 && items.some(i => !isCartItemValid(i))

  if (items.length === 0 || hasInvalidItems) {
    return (
      <main className="container py-20 min-h-[50vh] text-center">
        <div className="eyebrow">Your order</div>
        <h1 className="text-3xl md:text-4xl text-[#2A1E24] font-extrabold mt-3">
          {hasInvalidItems ? 'Invalid order configuration' : 'Your bag is empty'}
        </h1>
        <p className="text-sm text-[#8A7380] mt-4 max-w-md mx-auto">
          {hasInvalidItems
            ? 'One or more items in your cart has an incomplete configuration. Please re-select your cake to continue.'
            : 'You don’t have any cakes in your order bag right now. Please explore our cake collection to start an order.'}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link className="inline-block bg-[#E60067] hover:bg-[#C70055] text-white px-7 py-3.5 text-xs font-black uppercase tracking-wider rounded-full shadow-pink-glow transition" href="/cakes">
            Explore the cakes
          </Link>
          <Link className="inline-block border-2 border-[#E60067] text-[#E60067] hover:bg-[#FFEBF2] px-7 py-3.5 text-xs font-black uppercase tracking-wider rounded-full transition" href="/cart">
            View bag
          </Link>
        </div>
      </main>
    )
  }

  const todayMin = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return (
    <main className="container py-10 md:py-14">
      <div className="space-y-1 mb-8">
        <div className="eyebrow flex items-center gap-1.5">
          <span>Final Step</span>
          <span>&middot;</span>
          <span>Secure Checkout</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#2A1E24] font-extrabold tracking-tight">
          Complete Your Order
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_390px] gap-8 lg:gap-10 mt-6 items-start">
        <form onSubmit={handleSubmit(submit)} className="space-y-8" noValidate>
          {/* Section 1: Fulfillment Selection */}
          <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 md:p-8 shadow-card">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold mb-1">1. Delivery or Pickup</h2>
            <p className="text-xs text-[#8A7380] mb-6">
              Select how you would like to receive your freshly baked celebration cake.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('fulfillment_type', 'delivery')}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition cursor-pointer ${
                  !isPickup
                    ? 'border-[#E60067] bg-[#FFEBF2] ring-2 ring-[#E60067]/30 shadow-subtle'
                    : 'border-[#FAD1E0] bg-white hover:border-[#E60067]'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 ${
                    !isPickup ? 'bg-[#E60067] text-white' : 'bg-[#FFF5F8] text-[#2A1E24] border border-[#FAD1E0]'
                  }`}
                >
                  <Truck size={18} />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#2A1E24]">Doorstep Delivery</div>
                  <div className="text-xs text-[#8A7380] mt-1 leading-relaxed">
                    Carefully transported in cold courier transit to your home, office, or venue.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue('fulfillment_type', 'pickup')}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition cursor-pointer ${
                  isPickup
                    ? 'border-[#E60067] bg-[#FFEBF2] ring-2 ring-[#E60067]/30 shadow-subtle'
                    : 'border-[#FAD1E0] bg-white hover:border-[#E60067]'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl mt-0.5 ${
                    isPickup ? 'bg-[#E60067] text-white' : 'bg-[#FFF5F8] text-[#2A1E24] border border-[#FAD1E0]'
                  }`}
                >
                  <Store size={18} />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[#2A1E24]">Bakery Pickup</div>
                  <div className="text-xs text-[#8A7380] mt-1 leading-relaxed">
                    Collect directly from our Lekki Phase 1 bakery kitchen with zero delivery fee.
                  </div>
                </div>
              </button>
            </div>
            {errors.fulfillment_type && (
              <p className="text-xs text-[#E60067] mt-2 font-bold">{errors.fulfillment_type.message}</p>
            )}
          </div>

          {/* Section 2: Billing Details */}
          <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 md:p-8 shadow-card">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold mb-1">2. Billing Details</h2>
            <p className="text-xs text-[#8A7380] mb-6">
              Enter your contact details for order notifications and payment receipts.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Your First name <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ada"
                  className={inputClass}
                  {...register('first_name')}
                />
                {errors.first_name && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Your Last name <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Okafor"
                  className={inputClass}
                  {...register('last_name')}
                />
                {errors.last_name && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Country / Region <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  defaultValue="Nigeria"
                  className={`${inputClass} bg-[#F4EFEB] cursor-not-allowed`}
                  {...register('country')}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Your Phone number <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +234 802 345 6789"
                  className={inputClass}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Your Email address <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. ada@example.com"
                  className={inputClass}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Town / City <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lekki"
                  className={inputClass}
                  {...register('city')}
                />
                {errors.city && <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.city.message}</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  State <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos"
                  className={inputClass}
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.state.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Fulfillment Specific Details */}
          {!isPickup ? (
            /* DELIVERY DETAILS */
            <div className="bg-white rounded-3xl border border-[#EAE3DC] p-6 md:p-8 space-y-5 shadow-card">
              <div>
                <h2 className="serif text-2xl text-[#1E1917] font-normal mb-1 flex items-center gap-2">
                  <Truck size={22} className="text-[#933D32]" />
                  <span>3. Delivery Details</span>
                </h2>
                <p className="text-xs text-[#7A726D]">
                  Specify your exact delivery address and delivery schedule.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Your House Address <span className="text-[#933D32]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="House number, building name, and street name"
                  className={inputClass}
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Central Mall, Near City Gate"
                  className={inputClass}
                  {...register('landmark')}
                />
                {errors.landmark && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.landmark.message}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                    Delivery Date <span className="text-[#933D32]">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayMin}
                    className={inputClass}
                    {...register('delivery_date')}
                  />
                  {errors.delivery_date && (
                    <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.delivery_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                    Delivery Window <span className="text-[#933D32]">*</span>
                  </label>
                  <select
                    className={inputClass}
                    {...register('delivery_window')}
                  >
                    {windows.map(w => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  {errors.delivery_window && (
                    <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.delivery_window.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#1E1917] mb-1.5 font-semibold">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please ring the doorbell upon arrival, or call before gate security..."
                  className={inputClass}
                  {...register('instructions')}
                />
                {errors.instructions && (
                  <p className="text-xs text-[#933D32] mt-1 font-medium">{errors.instructions.message}</p>
                )}
              </div>
            </div>
          ) : (
            /* PICKUP DETAILS */
            <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 md:p-8 space-y-4 shadow-card">
              <div>
                <h2 className="text-2xl text-[#2A1E24] font-extrabold mb-1 flex items-center gap-2">
                  <Store size={22} className="text-[#E60067]" />
                  <span>3. Pickup Details</span>
                </h2>
                <p className="text-xs text-[#8A7380]">
                  Collect your cake fresh from our central bakery kitchen.
                </p>
              </div>

              <div className="p-5 bg-[#FFF5F8] rounded-2xl border border-[#FAD1E0] space-y-2 text-xs text-[#55424D]">
                <div className="font-extrabold text-sm text-[#2A1E24] flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#E60067]" />
                  <span>{SPEEDCAKE_PICKUP_LOCATION.name}</span>
                </div>
                <p className="pl-5 text-[#55424D]">
                  {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city},{' '}
                  {SPEEDCAKE_PICKUP_LOCATION.state}, {SPEEDCAKE_PICKUP_LOCATION.country}
                </p>
                <div className="pl-5 text-[#8A7380] flex items-center gap-1.5 pt-1">
                  <Clock size={13} />
                  <span>Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</span>
                </div>
                <div className="pl-5 text-[#8A7380] pt-1">
                  Phone:{' '}
                  <span className="font-bold text-[#2A1E24]">
                    {SPEEDCAKE_PICKUP_LOCATION.phone}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#FAD1E0] text-[#E60067] font-semibold leading-relaxed">
                  Notice: {SPEEDCAKE_PICKUP_LOCATION.instructions}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-[#FFE4EE] border border-[#FAD1E0] text-[#E60067] text-xs flex gap-3 items-start"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-5 font-bold">{error}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !items.length}
              className="w-full bg-[#E60067] hover:bg-[#C70055] text-white py-4 px-6 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-pink-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin inline" />
                  <span>Preparing secure Paystack checkout…</span>
                </>
              ) : (
                <span>Pay {naira(totalAmountKobo)} with Paystack</span>
              )}
            </button>
            <p className="text-center text-[11px] text-[#8A7380] mt-3 font-medium">
              Protected by 256-bit encryption &middot; Secure card &amp; bank transfer via Paystack
            </p>
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-28">
          <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-7 shadow-card space-y-5">
            <h2 className="text-xl text-[#2A1E24] font-extrabold pb-3 border-b border-[#FAD1E0]/60">
              Order Summary
            </h2>

            {/* Cake items list */}
            <div className="divide-y divide-[#F2ECE5] max-h-[360px] overflow-y-auto pr-1">
              {items.map(i => (
                <div key={i.key} className="py-3.5 text-sm flex justify-between gap-3 first:pt-0 last:pb-0">
                  <div>
                    <span className="font-medium text-[#1E1917]">
                      {i.quantity} &times; {i.name}
                    </span>
                    <small className="block text-xs text-[#7A726D] mt-0.5">{i.size}</small>
                    {Object.values(i.choices || {})
                      .flat()
                      .map(c => (
                        <small key={c.value} className="block text-xs text-[#7A726D]">
                          {c.label}
                          {c.fee_kobo ? ` · +${naira(c.fee_kobo)}` : ''}
                        </small>
                      ))}
                    {i.message && (
                      <small className="block text-xs italic text-[#E60067] mt-0.5">
                        &ldquo;{i.message}&rdquo;
                      </small>
                    )}
                  </div>
                  <span className="font-extrabold text-[#2A1E24] shrink-0">
                    {naira(i.unitPrice * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Customer & Fulfillment Preview */}
            <div className="pt-4 border-t border-[#FAD1E0]/60 text-xs space-y-2 text-[#55424D]">
              <div className="flex justify-between">
                <span className="text-[#8A7380]">Customer:</span>
                <span className="font-bold text-right text-[#2A1E24]">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7380]">Contact:</span>
                <span className="font-bold text-right text-[#2A1E24]">{phone || email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7380]">Method:</span>
                <span className="font-black text-[#E60067] uppercase tracking-wide">
                  {isPickup ? 'Store Pickup' : 'Home Delivery'}
                </span>
              </div>
              {!isPickup ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#8A7380]">Destination:</span>
                    <span className="text-right text-[#2A1E24] max-w-[190px] truncate font-medium">
                      {address ? `${address}, ` : ''}
                      {city ? `${city}, ` : ''}
                      {watch('state') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A7380]">Schedule:</span>
                    <span className="text-right text-[#2A1E24] font-medium">
                      {date ? `${date}` : 'Select date'}
                      {deliveryWindow ? ` · ${deliveryWindow}` : ''}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[#8A7380]">Location:</span>
                  <span className="text-right text-[#2A1E24] font-medium">
                    {SPEEDCAKE_PICKUP_LOCATION.name}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-[#FAD1E0]/60 space-y-2.5 text-sm">
              <div className="flex justify-between text-[#55424D]">
                <span>Items Subtotal</span>
                <span className="font-bold text-[#2A1E24]">{naira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#55424D]">
                <span>{isPickup ? 'Store Pickup' : 'Delivery Fee'}</span>
                <span className="font-semibold">{isPickup ? '₦0 (Free)' : naira(currentFeeKobo)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-lg text-[#2A1E24] pt-3 border-t border-[#FAD1E0]/60">
                <span>Total Due</span>
                <span className="text-xl text-[#E60067] font-black">{naira(totalAmountKobo)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
