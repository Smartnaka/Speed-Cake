'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, Plus, ShoppingBag, Loader2, Sparkles, Clock, ShieldCheck } from 'lucide-react'
import type { Product } from '@/lib/demo-products'
import { naira } from '@/lib/demo-products'
import { addCartItem } from '@/lib/cart'
import type { CartChoice, CartItem } from '@/lib/cart'
import { supabaseBrowser } from '@/lib/supabase/browser'

export function ProductDetails({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0])
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState('')
  const [added, setAdded] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [selected, setSelected] = useState<Record<string, CartChoice[]>>({})
  const router = useRouter()

  const groups = product.customizations || []
  const extras = Object.values(selected)
    .flat()
    .reduce((n, x) => n + x.fee_kobo, 0)
  const total = (size.price_kobo + extras) * qty

  function choose(id: string, choice: CartChoice, multiple: boolean, checked: boolean) {
    setSelected(old => {
      const current = old[id] || []
      const next = multiple
        ? checked
          ? [...current.filter(x => x.value !== choice.value), choice]
          : current.filter(x => x.value !== choice.value)
        : checked
        ? [choice]
        : []
      return { ...old, [id]: next }
    })
  }

  async function add(buy = false) {
    const variantId = size.id || size.name
    if (!variantId) return

    const choices = Object.fromEntries(
      Object.entries(selected).filter(
        ([id, list]) => groups.some(g => g.id === id) && (list || []).length > 0
      )
    )
    const sortedChoiceEntries = Object.entries(choices).sort(([a], [b]) => a.localeCompare(b))
    const labels = sortedChoiceEntries.flatMap(([_, list]) => list.map(x => x.label).sort()).join(',')
    const trimmedMessage = message.trim()

    const item: CartItem = {
      key: `${product.id}:${variantId}:${trimmedMessage}:${labels}`,
      productId: product.id,
      variantId,
      slug: product.slug,
      name: product.name,
      image: product.image,
      size: size.name,
      unitPrice: size.price_kobo + extras,
      quantity: qty,
      message: trimmedMessage,
      choices,
    }

    if (buy) {
      setOrdering(true)
      addCartItem(item, { replace: true })
      try {
        const db = supabaseBrowser()
        const {
          data: { session },
        } = await db.auth.getSession()
        if (session) {
          router.push('/checkout')
        } else {
          router.push('/account?next=%2Fcheckout')
        }
      } catch {
        router.push('/account?next=%2Fcheckout')
      } finally {
        setOrdering(false)
      }
    } else {
      addCartItem(item)
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    }
  }

  return (
    <main className="container py-10 md:py-16">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Product Visuals */}
        <div className="lg:col-span-6 lg:sticky lg:top-28">
          <div className="relative rounded-3xl overflow-hidden bg-white border border-[#EAE3DC] shadow-card">
            <img
              src={product.image}
              alt={product.name}
              className="w-full aspect-[0.94] object-cover"
            />

            {product.badge && (
              <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-[#1E1917] shadow-subtle">
                {product.badge}
              </span>
            )}
          </div>

          {/* Bakery Highlights Under Image */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-white border border-[#EAE3DC] text-xs space-y-1">
              <Clock size={16} className="mx-auto text-[#933D32]" />
              <div className="font-semibold text-[#1E1917]">{product.lead_days} Days Notice</div>
              <div className="text-[11px] text-[#7A726D]">Baked fresh to order</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#EAE3DC] text-xs space-y-1">
              <Sparkles size={16} className="mx-auto text-[#933D32]" />
              <div className="font-semibold text-[#1E1917]">Bespoke Recipe</div>
              <div className="text-[11px] text-[#7A726D]">Pure butter sponge</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#EAE3DC] text-xs space-y-1">
              <ShieldCheck size={16} className="mx-auto text-[#933D32]" />
              <div className="font-semibold text-[#1E1917]">Safe Transit</div>
              <div className="text-[11px] text-[#7A726D]">Cold cake courier</div>
            </div>
          </div>
        </div>

        {/* Right Column: Customizer & Ordering */}
        <div className="lg:col-span-6 space-y-8 bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE3DC] shadow-card">
          {/* Header & Description */}
          <div className="space-y-3 pb-6 border-b border-[#F2ECE5]">
            <div className="eyebrow flex items-center gap-1.5">
              <span>{product.category}</span>
              <span>&middot;</span>
              <span>Bespoke Celebration</span>
            </div>
            <h1 className="serif text-4xl sm:text-5xl text-[#1E1917] font-normal tracking-tight">
              {product.name}
            </h1>
            <div className="text-2xl font-bold text-[#1E1917] tracking-tight">
              {naira(size.price_kobo + extras)}
              {qty > 1 && (
                <span className="text-sm font-normal text-[#7A726D] ml-2">
                  ({naira((size.price_kobo + extras) * qty)} total for {qty})
                </span>
              )}
            </div>
            <p className="text-sm text-[#5A524D] leading-relaxed pt-2">
              {product.description}
            </p>
          </div>

          {/* 1. Size Selector */}
          <div className="space-y-3">
            <label className="block text-xs uppercase font-semibold tracking-wider text-[#1E1917]">
              Select Cake Size &middot; Servings
            </label>
            <div className="grid gap-2.5">
              {product.sizes.map(s => {
                const isSelected = size.name === s.name
                return (
                  <button
                    key={s.id || s.name}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#1E1917] bg-[#FAF8F5] ring-1 ring-[#1E1917] shadow-sm'
                        : 'border-[#EAE3DC] bg-white hover:border-[#DFD7CF]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#1E1917] bg-[#1E1917]' : 'border-[#C8BFBA]'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium text-[#1E1917]">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1E1917]">
                      {naira(s.price_kobo)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Customization Addons / Flavour Options */}
          {groups.map(g => (
            <fieldset key={g.id} className="space-y-3">
              <legend className="block text-xs uppercase font-semibold tracking-wider text-[#1E1917]">
                {g.label} {g.kind === 'addon' && <span className="text-[#7A726D] font-normal lowercase">(optional)</span>}
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {g.options.map(o => {
                  const isChecked = (selected[g.id] || []).some(x => x.value === o.value)
                  return (
                    <label
                      key={o.value}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'border-[#933D32] bg-[#F8ECE9]/50 text-[#1E1917]'
                          : 'border-[#EAE3DC] bg-white hover:border-[#DFD7CF] text-[#4A4340]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type={g.kind === 'addon' ? 'checkbox' : 'radio'}
                          name={g.id}
                          checked={isChecked}
                          onChange={e => choose(g.id, o, g.kind === 'addon', e.target.checked)}
                          className="accent-[#933D32] w-4 h-4"
                        />
                        <span className="font-medium">{o.label}</span>
                      </div>
                      {o.fee_kobo > 0 && (
                        <span className="font-semibold text-[#933D32]">+{naira(o.fee_kobo)}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}

          {/* 3. Inscription Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="inscription" className="block text-xs uppercase font-semibold tracking-wider text-[#1E1917]">
                Custom Cake Inscription <span className="text-[#7A726D] font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-[#7A726D]">{message.length}/45 characters</span>
            </div>
            <input
              maxLength={45}
              id="inscription"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Happy 30th Birthday, Folake!"
              className="w-full px-4 py-3 rounded-xl border border-[#EAE3DC] bg-[#FAF8F5] text-sm text-[#1E1917] placeholder:text-[#9C938E] outline-none focus:border-[#1E1917] focus:bg-white focus:ring-1 focus:ring-[#1E1917] transition shadow-subtle"
            />
          </div>

          {/* 4. Quantity Stepper */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#1E1917]">
              Quantity
            </span>
            <div className="flex items-center border border-[#EAE3DC] rounded-full bg-white p-1 shadow-subtle">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F2ECE5] transition"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-sm font-semibold text-[#1E1917]">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F2ECE5] transition"
                onClick={() => setQty(Math.min(30, qty + 1))}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* 5. Summary & Action Buttons */}
          <div className="space-y-3 pt-6 border-t border-[#F2ECE5]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#7A726D]">Estimated Total</span>
              <span className="serif text-2xl font-bold text-[#1E1917]">{naira(total)}</span>
            </div>

            <div className="grid gap-3 pt-2">
              <button
                disabled={ordering}
                onClick={() => add(true)}
                className="w-full py-4 px-6 rounded-full bg-[#1E1917] hover:bg-[#332C29] text-white text-sm font-semibold transition-all shadow-card hover:shadow-card-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <>
                    <Loader2 className="animate-spin inline" size={17} />
                    <span>Preparing your order…</span>
                  </>
                ) : (
                  <span>Order Cake Now &middot; {naira(total)}</span>
                )}
              </button>

              <button
                disabled={ordering}
                onClick={() => add(false)}
                className="w-full py-3.5 px-6 rounded-full border border-[#DFD7CF] hover:border-[#1E1917] bg-white text-[#1E1917] text-sm font-semibold transition-all shadow-subtle disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {added ? (
                  <>
                    <Check className="text-[#2A6947]" size={17} />
                    <span>Added to your bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={17} />
                    <span>Add to bag</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-[#7A726D] pt-2">
              Please order at least {product.lead_days} days ahead. Exact delivery or pickup window is chosen at checkout.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
