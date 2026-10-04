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
    <main className="container py-12 md:py-16 min-h-[55vh]">
      <div className="space-y-2 mb-8">
        <div className="eyebrow flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>Review Your Selection</span>
        </div>
        <h1 className="serif text-4xl md:text-5xl text-[#1E1917] font-normal tracking-tight">
          Your Celebration Bag
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#EAE3DC] p-12 md:p-16 text-center max-w-lg mx-auto shadow-subtle space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#FAF8F5] text-[#933D32] flex items-center justify-center mx-auto border border-[#EAE3DC]">
            <ShoppingBag size={28} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="serif text-2xl md:text-3xl text-[#1E1917]">Your bag is currently empty</h2>
            <p className="text-sm text-[#7A726D]">
              Explore our artisanal cake menu to find the perfect centerpiece for your celebration.
            </p>
          </div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-semibold text-white bg-[#1E1917] hover:bg-[#332C29] transition shadow-card hover:shadow-card-hover"
          >
            <span>Explore Celebration Cakes</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Items List */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE3DC] shadow-card space-y-6">
            <div className="text-xs uppercase font-semibold tracking-wider text-[#7A726D] pb-3 border-b border-[#F2ECE5]">
              {items.length} {items.length === 1 ? 'Creation' : 'Creations'} Selected
            </div>

            <div className="divide-y divide-[#F2ECE5]">
              {items.map(item => (
                <div key={item.key} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-start">
                  {/* Item Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-28 sm:w-28 sm:h-32 object-cover rounded-xl bg-[#F5EFE9] border border-[#EAE3DC]"
                  />

                  {/* Item Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/cakes/${item.slug}`}
                          className="serif text-xl text-[#1E1917] hover:text-[#933D32] transition font-normal"
                        >
                          {item.name}
                        </Link>
                        <div className="text-xs text-[#7A726D] mt-0.5">
                          Size: <span className="font-medium text-[#1E1917]">{item.size}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[#1E1917] text-base">
                          {naira(item.unitPrice * item.quantity)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-[#7A726D]">
                            {naira(item.unitPrice)} each
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Inscription */}
                    {item.message && (
                      <div className="inline-block px-3 py-1 rounded-md bg-[#FAF8F5] border border-[#EAE3DC] text-xs text-[#933D32] italic">
                        Inscription: &ldquo;{item.message}&rdquo;
                      </div>
                    )}

                    {/* Customization choices */}
                    {Object.values(item.choices || {}).flat().length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.values(item.choices || {}).flat().map(c => (
                          <span
                            key={c.value}
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EAE3DC] text-[#5A524D]"
                          >
                            {c.label}: <b>{c.value}</b> {c.fee_kobo ? `(+${naira(c.fee_kobo)})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center border border-[#EAE3DC] rounded-full bg-[#FAF8F5] p-0.5 shadow-subtle">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white text-[#1E1917] transition"
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
                        <span className="w-8 text-center text-xs font-semibold text-[#1E1917]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white text-[#1E1917] transition"
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
                        className="text-xs text-[#9C938E] hover:text-[#933D32] flex items-center gap-1 transition"
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
          <aside className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE3DC] shadow-card space-y-6">
            <h2 className="serif text-2xl text-[#1E1917] font-normal pb-3 border-b border-[#F2ECE5]">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#5A524D]">
                <span>Cakes Subtotal</span>
                <span className="font-semibold text-[#1E1917]">{naira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5A524D]">
                <span>Fulfillment &amp; Delivery</span>
                <span className="text-xs text-[#7A726D]">Calculated at checkout</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F2ECE5] flex justify-between items-baseline">
              <div>
                <div className="serif text-xl text-[#1E1917]">Total Amount</div>
                <div className="text-[11px] text-[#7A726D]">VAT inclusive where applicable</div>
              </div>
              <div className="serif text-2xl font-bold text-[#1E1917]">
                {naira(subtotal)}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full py-4 px-6 rounded-full bg-[#1E1917] hover:bg-[#332C29] text-white text-sm font-semibold transition-all shadow-card hover:shadow-card-hover disabled:opacity-60 flex items-center justify-center gap-2"
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
              className="block text-center text-xs font-medium text-[#7A726D] hover:text-[#1E1917] transition pt-1"
            >
              &larr; Add more cakes to bag
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
