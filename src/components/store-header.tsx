'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingBag, UserRound, Menu, X, LogIn, UserPlus, Cake } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { readCart } from '@/lib/cart'

type ProductSummary = { category: string }

type AuthState = 'loading' | 'guest' | 'signed-in'

export function StoreHeader() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const refresh = () => setCount(readCart().reduce((n, item) => n + item.quantity, 0))
    refresh()
    window.addEventListener('speedcake-cart', refresh)

    let subscription: { unsubscribe: () => void } | undefined
    try {
      const db = supabaseBrowser()

      db.auth.getSession().then(({ data }) => {
        setAuthState(data.session ? 'signed-in' : 'guest')
      })

      const auth = db.auth.onAuthStateChange((_event, session) => {
        setAuthState(session ? 'signed-in' : 'guest')
      })

      subscription = auth.data.subscription
    } catch {
      setAuthState('guest')
    }

    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        const products = Array.isArray(d.products) ? (d.products as ProductSummary[]) : []
        setCategories([...new Set<string>(products.map(p => p.category).filter(Boolean))])
      })
      .catch(() => {})

    return () => {
      window.removeEventListener('speedcake-cart', refresh)
      subscription?.unsubscribe()
    }
  }, [])

  const isGuest = authState === 'guest'
  const isSignedIn = authState === 'signed-in'
  const isLoading = authState === 'loading'

  return (
    <header className="sticky top-0 z-50 bg-[#FFF5F8]/95 backdrop-blur-md border-b border-[#FAD1E0]/80 transition-all">
      <div className="container min-h-[76px] flex items-center justify-between gap-4">
        {/* Brand Logo with Sweet Confectionery Icon */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E60067] to-[#FF4B93] text-white flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform duration-200">
            <Cake size={20} strokeWidth={2.2} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#2A1E24] group-hover:text-[#E60067] transition-colors">
            Instant Cakes Delivery<span className="text-[#E60067]">.</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-[14px] font-semibold text-[#55424D]">
          <Link
            href="/"
            className="px-4 py-2 rounded-full hover:bg-[#FFEBF2] hover:text-[#E60067] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/cakes"
            className="px-4 py-2 rounded-full hover:bg-[#FFEBF2] hover:text-[#E60067] transition-colors"
          >
            Cakes
          </Link>
          {categories.slice(0, 3).map(category => (
            <Link
              key={category}
              href={`/cakes?category=${encodeURIComponent(category)}`}
              className="px-4 py-2 rounded-full hover:bg-[#FFEBF2] hover:text-[#E60067] transition-colors"
            >
              {category}
            </Link>
          ))}
          <Link
            href="/track"
            className="px-4 py-2 rounded-full hover:bg-[#FFEBF2] hover:text-[#E60067] transition-colors"
          >
            Track Order
          </Link>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Desktop Auth Controls */}
          {isLoading && (
            <div className="hidden md:block w-36 h-9" aria-hidden="true" />
          )}

          {isGuest && (
            <div className="hidden md:flex items-center gap-2.5">
              <Link
                href="/account"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#55424D] hover:text-[#E60067] rounded-full hover:bg-[#FFEBF2] transition-colors"
              >
                <LogIn size={15} strokeWidth={2.2} />
                <span>Sign in</span>
              </Link>
              <Link
                href="/account?mode=signup"
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#E60067] hover:bg-[#C70055] rounded-full shadow-pink-glow transition-all active:scale-[0.98]"
              >
                <UserPlus size={15} strokeWidth={2.2} />
                <span>Create account</span>
              </Link>
            </div>
          )}

          {isSignedIn && (
            <Link
              href="/account"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-[#FAD1E0] bg-white hover:border-[#E60067] text-xs font-bold text-[#2A1E24] shadow-subtle transition-all"
            >
              <UserRound size={15} strokeWidth={2.2} className="text-[#E60067]" />
              <span>Account</span>
            </Link>
          )}

          {/* Cart Icon with Vibrant Badge */}
          <Link
            aria-label={`Cart, ${count} items`}
            href="/cart"
            className="relative p-2.5 rounded-full bg-white hover:bg-[#FFEBF2] border border-[#FAD1E0] text-[#2A1E24] transition shadow-subtle group"
          >
            <ShoppingBag size={20} strokeWidth={2} className="group-hover:text-[#E60067] transition-colors" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#E60067] text-white w-5 h-5 flex items-center justify-center text-[10px] font-black shadow-pink-glow animate-in zoom-in-50">
                {count}
              </span>
            )}
          </Link>

          {/* Mobile Navigation Toggle Button */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2.5 rounded-full border border-[#FAD1E0] bg-white text-[#2A1E24] hover:bg-[#FFEBF2] transition"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="md:hidden border-t border-[#FAD1E0] bg-[#FFF5F8] px-6 py-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="text-xs uppercase font-extrabold tracking-wider text-[#E60067]">
            Cake Categories
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link
              onClick={() => setOpen(false)}
              href="/cakes"
              className="p-3 rounded-2xl bg-white border border-[#FAD1E0] text-[#2A1E24] hover:border-[#E60067]"
            >
              Shop All Cakes
            </Link>
            {categories.map(category => (
              <Link
                onClick={() => setOpen(false)}
                key={category}
                href={`/cakes?category=${encodeURIComponent(category)}`}
                className="p-3 rounded-2xl bg-white border border-[#FAD1E0] text-[#2A1E24] hover:border-[#E60067]"
              >
                {category}
              </Link>
            ))}
          </div>

          <Link
            onClick={() => setOpen(false)}
            href="/track"
            className="block text-sm font-bold text-[#55424D] py-2 border-b border-[#FAD1E0] hover:text-[#E60067]"
          >
            Track Order &rarr;
          </Link>

          {/* Mobile Auth Actions */}
          <div className="pt-2">
            {isLoading && (
              <span className="text-xs text-[#8A7380]">Checking account session…</span>
            )}

            {isGuest && (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  onClick={() => setOpen(false)}
                  href="/account"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-[#FAD1E0] bg-white text-xs font-bold text-[#2A1E24]"
                >
                  <LogIn size={15} />
                  Sign in
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/account?mode=signup"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#E60067] text-xs font-bold text-white shadow-pink-glow"
                >
                  <UserPlus size={15} />
                  Create account
                </Link>
              </div>
            )}

            {isSignedIn && (
              <Link
                onClick={() => setOpen(false)}
                href="/account"
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-[#FAD1E0] bg-white text-sm font-bold text-[#2A1E24] shadow-subtle"
              >
                <UserRound size={16} className="text-[#E60067]" />
                Your account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
