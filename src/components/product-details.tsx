'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/demo-products'
import { naira } from '@/lib/demo-products'
import { addCartItem } from '@/lib/cart'
import type { CartChoice, CartItem } from '@/lib/cart'

type ProductSize = Product['sizes'][number]
import { Clock, ShieldCheck, Sparkles, Check, ShoppingBag, Plus, Minus, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/browser'

export function ProductDetails({ product }: { product: Product }) {
  const router = useRouter()
  const [size, setSize] = useState<ProductSize>(
    product.sizes[0] || { name: 'Standard', price_kobo: product.price_kobo }
  )
  const [selected, setSelected] = useState<Record<string, CartChoice[]>>({})
  const [message, setMessage] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [ordering, setOrdering] = useState(false)

  const groups = product.customizations || []

  function choose(id: string, choice: CartChoice, multiple: boolean, checked: boolean) {
    setSelected(old => {
      const current = old[id] || []
      const next = multiple
        ? (checked ? [...current.filter(x => x.value !== choice.value), choice] : current.filter(x => x.value !== choice.value))
        : (checked ? [choice] : [])
      return { ...old, [id]: next }
    })
  }

  const extras = Object.values(selected).flat().reduce((n, x) => n + x.fee_kobo, 0)
  const total = (size.price_kobo + extras) * qty

  async function add(buy = false) {
    const variantId = size.id || size.name
    if (!variantId) return
    const choices = Object.fromEntries(
      Object.entries(selected).filter(([id, list]) => groups.some(g => g.id === id) && (list || []).length > 0)
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
        const { data: { session } } = await db.auth.getSession()
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
    <main className="container py-8 md:py-14">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Product Visuals */}
        <div className="lg:col-span-6 lg:sticky lg:top-28 space-y-6">
          <div className="relative rounded-3xl overflow-hidden bg-white border-2 border-[#FAD1E0] shadow-card">
            <img
              src={product.image}
              alt={product.name}
              className="w-full aspect-[0.94] object-cover"
            />

            {product.badge && (
              <span className="absolute top-4 left-4 bg-[#FFE4EE] border border-[#FAD1E0] px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase text-[#E60067] shadow-subtle">
                {product.badge}
              </span>
            )}
          </div>

          {/* Bakery Highlights Under Image */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white border border-[#FAD1E0] text-xs space-y-1 shadow-subtle">
              <Clock size={18} className="mx-auto text-[#E60067]" />
              <div className="font-extrabold text-[#2A1E24]">{product.lead_days} Days Notice</div>
              <div className="text-[11px] text-[#8A7380]">Baked fresh to order</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#FAD1E0] text-xs space-y-1 shadow-subtle">
              <Sparkles size={18} className="mx-auto text-[#E60067]" />
              <div className="font-extrabold text-[#2A1E24]">Pure Ingredients</div>
              <div className="text-[11px] text-[#8A7380]">Real butter sponge</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#FAD1E0] text-xs space-y-1 shadow-subtle">
              <ShieldCheck size={18} className="mx-auto text-[#E60067]" />
              <div className="font-extrabold text-[#2A1E24]">Safe Courier</div>
              <div className="text-[11px] text-[#8A7380]">Cold box transit</div>
            </div>
          </div>
        </div>

        {/* Right Column: Customizer & Ordering */}
        <div className="lg:col-span-6 space-y-8 bg-white rounded-3xl p-6 sm:p-10 border border-[#FAD1E0] shadow-card">
          {/* Header & Description */}
          <div className="space-y-3 pb-6 border-b border-[#FAD1E0]/60">
            <div className="eyebrow flex items-center gap-1.5">
              <span>{product.category}</span>
              <span>&middot;</span>
              <span>Bespoke Celebration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#2A1E24] font-extrabold tracking-tight">
              {product.name}
            </h1>
            <div className="text-2xl font-black text-[#E60067] tracking-tight">
              {naira(size.price_kobo + extras)}
              {qty > 1 && (
                <span className="text-sm font-semibold text-[#8A7380] ml-2">
                  ({naira(total)} total for {qty})
                </span>
              )}
            </div>
            <p className="text-sm text-[#55424D] leading-relaxed pt-1">
              {product.description}
            </p>
          </div>

          {/* 1. Size Selector */}
          <div className="space-y-3">
            <label className="block text-xs uppercase font-extrabold tracking-wider text-[#2A1E24]">
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
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#E60067] bg-[#FFEBF2] ring-2 ring-[#E60067]/30 shadow-subtle'
                        : 'border-[#FAD1E0] bg-white hover:border-[#E60067]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#E60067] bg-[#E60067]' : 'border-[#D0B8C4]'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-bold text-[#2A1E24]">{s.name}</span>
                    </div>
                    <span className="text-sm font-extrabold text-[#2A1E24]">
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
              <legend className="block text-xs uppercase font-extrabold tracking-wider text-[#2A1E24]">
                {g.label} {g.kind === 'addon' && <span className="text-[#8A7380] font-normal lowercase">(optional)</span>}
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {g.options.map(o => {
                  const isChecked = (selected[g.id] || []).some(x => x.value === o.value)
                  return (
                    <label
                      key={o.value}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'border-[#E60067] bg-[#FFEBF2] text-[#2A1E24] font-bold shadow-subtle'
                          : 'border-[#FAD1E0] bg-white hover:border-[#E60067] text-[#55424D]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type={g.kind === 'addon' ? 'checkbox' : 'radio'}
                          name={g.id}
                          checked={isChecked}
                          onChange={e => choose(g.id, o, g.kind === 'addon', e.target.checked)}
                          className="accent-[#E60067] w-4 h-4 cursor-pointer"
                        />
                        <span className="font-semibold">{o.label}</span>
                      </div>
                      {o.fee_kobo > 0 && (
                        <span className="font-extrabold text-[#E60067]">+{naira(o.fee_kobo)}</span>
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
              <label htmlFor="inscription" className="block text-xs uppercase font-extrabold tracking-wider text-[#2A1E24]">
                Hand-Piped Cake Inscription <span className="text-[#8A7380] font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-[#8A7380] font-bold">{message.length}/45 characters</span>
            </div>
            <input
              maxLength={45}
              id="inscription"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Happy 30th Birthday, Folake!"
              className="w-full px-4 py-3 rounded-2xl border border-[#FAD1E0] bg-[#FFF5F8] text-sm text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:bg-white focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
            />
          </div>

          {/* 4. Quantity Stepper */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#2A1E24]">
              Quantity
            </span>
            <div className="flex items-center border border-[#FAD1E0] rounded-full bg-white p-1 shadow-subtle">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FFEBF2] text-[#2A1E24] transition"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-sm font-black text-[#2A1E24]">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FFEBF2] text-[#2A1E24] transition"
                onClick={() => setQty(Math.min(30, qty + 1))}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* 5. Summary & Action Buttons */}
          <div className="space-y-3 pt-6 border-t border-[#FAD1E0]/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#8A7380]">Estimated Total</span>
              <span className="text-2xl font-black text-[#2A1E24]">{naira(total)}</span>
            </div>

            <div className="grid gap-3 pt-2">
              <button
                disabled={ordering}
                onClick={() => add(true)}
                className="w-full py-4 px-6 rounded-full bg-[#E60067] hover:bg-[#C70055] text-white text-xs font-black uppercase tracking-wider transition-all shadow-pink-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
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
                className="w-full py-3.5 px-6 rounded-full border-2 border-[#E60067] hover:bg-[#FFEBF2] bg-white text-[#E60067] text-xs font-black uppercase tracking-wider transition-all shadow-subtle disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {added ? (
                  <>
                    <Check className="text-[#059669]" size={17} />
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

            <p className="text-center text-xs text-[#8A7380] font-medium pt-2">
              Please order at least {product.lead_days} days ahead. Exact delivery or pickup window is chosen at checkout.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
