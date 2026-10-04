'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, Loader2, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react'
import { CartItem, readCart, writeCart } from '@/lib/cart'
import { naira } from '@/lib/demo-products'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [checkingOut, setCheckingOut] = useState(false)
  const router = useRouter()

  useEffect(() => setItems(readCart()), [])

  function save(next: CartItem[]) {
    setItems(next)
    writeCart(next)
  }

  const subtotal = items.reduce((a, x) => a + x.unitPrice * x.quantity, 0)

  async function handleCheckout(e: React.MouseEvent) {
    e.preventDefault()
    if (!items.length) return
    setCheckingOut(true)
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
      setCheckingOut(false)
    }
  }

  return (
    <main className="container py-10 md:py-14 min-h-[60vh]">
      <div className="space-y-1 mb-8">
        <div className="eyebrow flex items-center gap-1.5">
          <Sparkles size={14} />
          <span>Review Your Selection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#2A1E24] font-extrabold tracking-tight">
          Your Celebration Bag
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#FAD1E0] p-10 md:p-14 text-center max-w-lg mx-auto shadow-card space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#FFEBF2] text-[#E60067] flex items-center justify-center mx-auto border border-[#FAD1E0]">
            <ShoppingBag size={28} strokeWidth={2} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold">Your bag is currently empty</h2>
            <p className="text-sm text-[#8A7380]">
              Explore our artisanal cake menu to find the perfect centerpiece for your celebration.
            </p>
          </div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-wider text-white bg-[#E60067] hover:bg-[#C70055] transition shadow-pink-glow"
          >
            <span>Explore Celebration Cakes</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Items List */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#FAD1E0] shadow-card space-y-6">
            <div className="text-xs uppercase font-extrabold tracking-wider text-[#8A7380] pb-3 border-b border-[#FAD1E0]/60">
              {items.length} {items.length === 1 ? 'Cake' : 'Cakes'} Selected
            </div>

            <div className="divide-y divide-[#FAD1E0]/60">
              {items.map(item => (
                <div key={item.key} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-start">
                  {/* Item Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-28 sm:w-28 sm:h-32 object-cover rounded-2xl bg-[#FFEBF2] border border-[#FAD1E0]"
                  />

                  {/* Item Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/cakes/${item.slug}`}
                          className="text-lg font-extrabold text-[#2A1E24] hover:text-[#E60067] transition leading-snug"
                        >
                          {item.name}
                        </Link>
                        <div className="text-xs text-[#8A7380] mt-0.5">
                          Size: <span className="font-bold text-[#2A1E24]">{item.size}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-[#2A1E24] text-base">
                          {naira(item.unitPrice * item.quantity)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-[#8A7380] font-medium">
                            {naira(item.unitPrice)} each
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Inscription */}
                    {item.message && (
                      <div className="inline-block px-3 py-1 rounded-xl bg-[#FFEBF2] border border-[#FAD1E0] text-xs text-[#E60067] font-semibold">
                        Inscription: &ldquo;{item.message}&rdquo;
                      </div>
                    )}

                    {/* Customization choices */}
                    {Object.values(item.choices || {}).flat().length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.values(item.choices || {}).flat().map(c => (
                          <span
                            key={c.value}
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF5F8] border border-[#FAD1E0] text-[#55424D] font-medium"
                          >
                            {c.label}: <b>{c.value}</b> {c.fee_kobo ? `(+${naira(c.fee_kobo)})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center border border-[#FAD1E0] rounded-full bg-[#FFF5F8] p-0.5 shadow-subtle">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white text-[#2A1E24] transition"
                          onClick={() =>
                            save(
                              items.map(x =>
                                x.key === item.key
                                  ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                                  : x
                              )
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-[#2A1E24]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white text-[#2A1E24] transition"
                          onClick={() =>
                            save(
                              items.map(x =>
                                x.key === item.key
                                  ? { ...x, quantity: Math.min(30, x.quantity + 1) }
                                  : x
                              )
                            )
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => save(items.filter(x => x.key !== item.key))}
                        className="text-xs text-[#8A7380] hover:text-[#E60067] flex items-center gap-1 transition font-bold"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-[#FAD1E0] shadow-card space-y-6">
            <h2 className="text-xl text-[#2A1E24] font-extrabold pb-3 border-b border-[#FAD1E0]/60">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#55424D]">
                <span>Cakes Subtotal</span>
                <span className="font-extrabold text-[#2A1E24]">{naira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#55424D]">
                <span>Fulfillment &amp; Delivery</span>
                <span className="text-xs text-[#8A7380] font-semibold">Calculated at checkout</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#FAD1E0]/60 flex justify-between items-baseline">
              <div>
                <div className="text-lg font-extrabold text-[#2A1E24]">Total Amount</div>
                <div className="text-[11px] text-[#8A7380]">VAT inclusive where applicable</div>
              </div>
              <div className="text-2xl font-black text-[#E60067]">
                {naira(subtotal)}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full py-4 px-6 rounded-full bg-[#E60067] hover:bg-[#C70055] text-white text-xs font-black uppercase tracking-wider transition-all shadow-pink-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="animate-spin inline" size={17} />
                  <span>Checking session…</span>
                </>
              ) : (
                <>
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <Link
              href="/cakes"
              className="block text-center text-xs font-bold text-[#8A7380] hover:text-[#E60067] transition pt-1"
            >
              &larr; Add more cakes to bag
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
