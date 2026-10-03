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
  'w-full border border-[#ded0c8] bg-[#fdfbf9] px-3.5 py-3 text-sm text-[#352c28] outline-none focus:border-[#6f3d36] transition rounded-none placeholder:text-[#9c8e87]'

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
        <h1 className="serif text-4xl mt-3">
          {hasInvalidItems ? 'Invalid order configuration' : 'Your bag is empty'}
        </h1>
        <p className="text-sm text-[#756862] mt-4 max-w-md mx-auto">
          {hasInvalidItems
            ? 'One or more items in your cart has an incomplete configuration. Please re-select your cake to continue.'
            : 'You don’t have any cakes in your order bag right now. Please explore our cake collection to start an order.'}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link className="inline-block bg-[#6f3d36] text-white px-6 py-4 text-sm" href="/cakes">
            Explore the cakes
          </Link>
          <Link className="inline-block border border-[#6f3d36] px-6 py-4 text-sm" href="/cart">
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
    <main className="container py-12 md:py-16">
      <div className="eyebrow">Almost there</div>
      <h1 className="serif text-4xl md:text-5xl mt-2 text-[#352c28]">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-12 mt-10">
        <form onSubmit={handleSubmit(submit)} className="space-y-10" noValidate>
          {/* Section 1: Fulfillment Selection */}
          <div className="bg-white border border-[#ded0c8] p-6 md:p-8">
            <h2 className="serif text-2xl text-[#352c28] mb-2">1. Delivery or Pickup</h2>
            <p className="text-xs text-[#756862] mb-6">
              Select how you would like to receive your freshly prepared cake.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('fulfillment_type', 'delivery')}
                className={`p-4 border text-left flex items-start gap-3 transition cursor-pointer ${
                  !isPickup
                    ? 'border-[#6f3d36] bg-[#fbf7f4] ring-1 ring-[#6f3d36]'
                    : 'border-[#ded0c8] bg-white hover:border-[#bba89f]'
                }`}
              >
                <div
                  className={`p-2 rounded-full mt-0.5 ${
                    !isPickup ? 'bg-[#6f3d36] text-white' : 'bg-[#f4ebe6] text-[#6f3d36]'
                  }`}
                >
                  <Truck size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#352c28]">Doorstep Delivery</div>
                  <div className="text-xs text-[#756862] mt-0.5">
                    Carefully brought to your home, office, or event location.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue('fulfillment_type', 'pickup')}
                className={`p-4 border text-left flex items-start gap-3 transition cursor-pointer ${
                  isPickup
                    ? 'border-[#6f3d36] bg-[#fbf7f4] ring-1 ring-[#6f3d36]'
                    : 'border-[#ded0c8] bg-white hover:border-[#bba89f]'
                }`}
              >
                <div
                  className={`p-2 rounded-full mt-0.5 ${
                    isPickup ? 'bg-[#6f3d36] text-white' : 'bg-[#f4ebe6] text-[#6f3d36]'
                  }`}
                >
                  <Store size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#352c28]">Store Pickup</div>
                  <div className="text-xs text-[#756862] mt-0.5">
                    Collect directly from our Lekki bakery with zero delivery charge.
                  </div>
                </div>
              </button>
            </div>
            {errors.fulfillment_type && (
              <p className="text-xs text-red-700 mt-2">{errors.fulfillment_type.message}</p>
            )}
          </div>

          {/* Section 2: Billing Details */}
          <div className="bg-white border border-[#ded0c8] p-6 md:p-8">
            <h2 className="serif text-2xl text-[#352c28] mb-2">2. Billing Details</h2>
            <p className="text-xs text-[#756862] mb-6">
              Enter your contact details for order notifications and payment receipts.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Your First name <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ada"
                  className={inputClass}
                  {...register('first_name')}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-700 mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Your Last name <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Okafor"
                  className={inputClass}
                  {...register('last_name')}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-700 mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Country / Region <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  defaultValue="Nigeria"
                  className={`${inputClass} bg-[#f5ede8] cursor-not-allowed`}
                  {...register('country')}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Your Phone number <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +234 802 345 6789"
                  className={inputClass}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-xs text-red-700 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Your Email address <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. ada@example.com"
                  className={inputClass}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-700 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Town / City <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lekki"
                  className={inputClass}
                  {...register('city')}
                />
                {errors.city && <p className="text-xs text-red-700 mt-1">{errors.city.message}</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  State <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos"
                  className={inputClass}
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-xs text-red-700 mt-1">{errors.state.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Fulfillment Specific Details */}
          {!isPickup ? (
            /* DELIVERY DETAILS */
            <div className="bg-white border border-[#ded0c8] p-6 md:p-8 space-y-5">
              <div>
                <h2 className="serif text-2xl text-[#352c28] mb-1 flex items-center gap-2">
                  <Truck size={22} className="text-[#6f3d36]" />
                  <span>3. Delivery Details</span>
                </h2>
                <p className="text-xs text-[#756862]">
                  Specify your exact delivery address and delivery schedule.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Your House Address <span className="text-[#a43629]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="House number, building name, and street name"
                  className={inputClass}
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-xs text-red-700 mt-1">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Central Mall, Near City Gate"
                  className={inputClass}
                  {...register('landmark')}
                />
                {errors.landmark && (
                  <p className="text-xs text-red-700 mt-1">{errors.landmark.message}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                    Delivery Date <span className="text-[#a43629]">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayMin}
                    className={inputClass}
                    {...register('delivery_date')}
                  />
                  {errors.delivery_date && (
                    <p className="text-xs text-red-700 mt-1">{errors.delivery_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                    Delivery Window <span className="text-[#a43629]">*</span>
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
                    <p className="text-xs text-red-700 mt-1">{errors.delivery_window.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please ring the doorbell upon arrival, or call before gate security..."
                  className={inputClass}
                  {...register('instructions')}
                />
                {errors.instructions && (
                  <p className="text-xs text-red-700 mt-1">{errors.instructions.message}</p>
                )}
              </div>
            </div>
          ) : (
            /* PICKUP DETAILS */
            <div className="bg-white border border-[#ded0c8] p-6 md:p-8 space-y-4">
              <div>
                <h2 className="serif text-2xl text-[#352c28] mb-1 flex items-center gap-2">
                  <Store size={22} className="text-[#6f3d36]" />
                  <span>3. Pickup Details</span>
                </h2>
                <p className="text-xs text-[#756862]">
                  Collect your cake fresh from our central bakery kitchen.
                </p>
              </div>

              <div className="p-4 bg-[#fbf7f4] border border-[#e8dcd6] space-y-2 text-xs text-[#52443e]">
                <div className="font-semibold text-sm text-[#352c28] flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#6f3d36]" />
                  <span>{SPEEDCAKE_PICKUP_LOCATION.name}</span>
                </div>
                <p className="pl-5 text-[#5e514b]">
                  {SPEEDCAKE_PICKUP_LOCATION.address}, {SPEEDCAKE_PICKUP_LOCATION.city},{' '}
                  {SPEEDCAKE_PICKUP_LOCATION.state}, {SPEEDCAKE_PICKUP_LOCATION.country}
                </p>
                <div className="pl-5 text-[#756862] flex items-center gap-1.5 pt-1">
                  <Clock size={13} />
                  <span>Hours: {SPEEDCAKE_PICKUP_LOCATION.hours}</span>
                </div>
                <div className="pl-5 text-[#756862] pt-1">
                  Phone:{' '}
                  <span className="font-medium text-[#352c28]">
                    {SPEEDCAKE_PICKUP_LOCATION.phone}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#e8dcd6] text-[#6f3d36] font-medium leading-relaxed">
                  Notice: {SPEEDCAKE_PICKUP_LOCATION.instructions}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-4 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-xs flex gap-3 items-start"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-5">{error}</div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading || !items.length}
              className="w-full bg-[#6f3d36] hover:bg-[#5b322c] text-white py-4 text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
            <p className="text-center text-[11px] text-[#756862] mt-3">
              Protected by 256-bit encryption · Secure card & bank payment via Paystack
            </p>
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="space-y-6">
          <div className="bg-[#f5ece6] border border-[#e3d5cc] p-6">
            <h2 className="serif text-2xl text-[#352c28] pb-4 border-b border-[#dac8be]">
              Order Summary
            </h2>

            {/* Cake items list */}
            <div className="divide-y divide-[#e8dcd4] max-h-[380px] overflow-y-auto pr-1">
              {items.map(i => (
                <div key={i.key} className="py-4 text-sm flex justify-between gap-3">
                  <div>
                    <span className="font-medium text-[#352c28]">
                      {i.quantity} × {i.name}
                    </span>
                    <small className="block text-xs text-[#756862] mt-0.5">{i.size}</small>
                    {Object.values(i.choices || {})
                      .flat()
                      .map(c => (
                        <small key={c.value} className="block text-xs text-[#756862]">
                          {c.label}
                          {c.fee_kobo ? ` · +${naira(c.fee_kobo)}` : ''}
                        </small>
                      ))}
                    {i.message && (
                      <small className="block text-xs italic text-[#6f3d36] mt-0.5">
                        &ldquo;{i.message}&rdquo;
                      </small>
                    )}
                  </div>
                  <span className="font-semibold text-[#352c28] shrink-0">
                    {naira(i.unitPrice * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Customer & Fulfillment Preview */}
            <div className="mt-4 pt-4 border-t border-[#dac8be] text-xs space-y-2 text-[#52443e]">
              <div className="flex justify-between">
                <span className="text-[#867872]">Customer:</span>
                <span className="font-medium text-right text-[#352c28]">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#867872]">Contact:</span>
                <span className="font-medium text-right text-[#352c28]">{phone || email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#867872]">Method:</span>
                <span className="font-semibold text-[#6f3d36] uppercase tracking-wide">
                  {isPickup ? 'Store Pickup' : 'Home Delivery'}
                </span>
              </div>
              {!isPickup ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#867872]">Destination:</span>
                    <span className="text-right text-[#352c28] max-w-[190px] truncate">
                      {address ? `${address}, ` : ''}
                      {city ? `${city}, ` : ''}
                      {watch('state') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#867872]">Schedule:</span>
                    <span className="text-right text-[#352c28]">
                      {date ? `${date}` : 'Select date'}
                      {deliveryWindow ? ` · ${deliveryWindow}` : ''}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[#867872]">Location:</span>
                  <span className="text-right text-[#352c28]">
                    {SPEEDCAKE_PICKUP_LOCATION.name}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="mt-5 pt-4 border-t border-[#dac8be] space-y-2.5 text-sm">
              <div className="flex justify-between text-[#52443e]">
                <span>Items Subtotal</span>
                <span>{naira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#52443e]">
                <span>{isPickup ? 'Store Pickup' : 'Delivery Fee'}</span>
                <span>{isPickup ? '₦0 (Free)' : naira(currentFeeKobo)}</span>
              </div>
              <div className="flex justify-between font-serif font-bold text-lg text-[#352c28] pt-3 border-t border-[#dac8be]">
                <span>Total Due</span>
                <span>{naira(totalAmountKobo)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
