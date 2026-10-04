'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingBag, UserRound, Menu, X, LogIn, UserPlus } from 'lucide-react'
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
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EAE3DC]/80 transition-all">
      <div className="container min-h-[72px] flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="serif text-[28px] tracking-tight text-[#1E1917] hover:opacity-90 transition">
          speed cake<span className="text-[#933D32]">.</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-[13px] font-medium text-[#4A4340]">
          <Link
            href="/cakes"
            className="px-3.5 py-1.5 rounded-full hover:bg-[#F2ECE5] hover:text-[#1E1917] transition"
          >
            Shop all
          </Link>
          {categories.slice(0, 3).map(category => (
            <Link
              key={category}
              href={`/cakes?category=${encodeURIComponent(category)}`}
              className="px-3.5 py-1.5 rounded-full hover:bg-[#F2ECE5] hover:text-[#1E1917] transition"
            >
              {category}
            </Link>
          ))}
          <Link
            href="/track"
            className="px-3.5 py-1.5 rounded-full hover:bg-[#F2ECE5] hover:text-[#1E1917] transition"
          >
            Track order
          </Link>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Desktop Auth Controls */}
          {isLoading && (
            <div className="hidden md:block w-36 h-9" aria-hidden="true" />
          )}

          {isGuest && (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/account"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4A4340] hover:text-[#1E1917] rounded-full hover:bg-[#F2ECE5] transition"
              >
                <LogIn size={14} strokeWidth={2} />
                <span>Sign in</span>
              </Link>
              <Link
                href="/account?mode=signup"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E1917] hover:bg-[#332C29] rounded-full shadow-sm transition"
              >
                <UserPlus size={14} strokeWidth={2} />
                <span>Create account</span>
              </Link>
            </div>
          )}

          {isSignedIn && (
            <Link
              href="/account"
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#DFD7CF] bg-white/80 hover:border-[#1E1917] text-xs font-medium text-[#1E1917] shadow-sm transition"
            >
              <UserRound size={14} strokeWidth={2} className="text-[#933D32]" />
              <span>Account</span>
            </Link>
          )}

          {/* Cart Icon */}
          <Link
            aria-label={`Cart, ${count} items`}
            href="/cart"
            className="relative p-2.5 rounded-full bg-white/70 hover:bg-white border border-[#EAE3DC] text-[#1E1917] transition shadow-sm"
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#933D32] text-white w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm animate-in zoom-in-50">
                {count}
              </span>
            )}
          </Link>

          {/* Mobile Navigation Toggle Button */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 rounded-full border border-[#EAE3DC] bg-white text-[#1E1917] hover:bg-[#F2ECE5] transition"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="md:hidden border-t border-[#EAE3DC] bg-[#FAF8F5] px-6 py-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="text-xs uppercase font-semibold tracking-widest text-[#933D32]">
            Collections
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-medium">
            <Link
              onClick={() => setOpen(false)}
              href="/cakes"
              className="p-3 rounded-xl bg-white border border-[#EAE3DC] text-[#1E1917]"
            >
              Shop all cakes
            </Link>
            {categories.map(category => (
              <Link
                onClick={() => setOpen(false)}
                key={category}
                href={`/cakes?category=${encodeURIComponent(category)}`}
                className="p-3 rounded-xl bg-white border border-[#EAE3DC] text-[#1E1917]"
              >
                {category}
              </Link>
            ))}
          </div>

          <Link
            onClick={() => setOpen(false)}
            href="/track"
            className="block text-sm font-medium text-[#4A4340] py-2 border-b border-[#EAE3DC]"
          >
            Track order &rarr;
          </Link>

          {/* Mobile Auth Actions */}
          <div className="pt-2">
            {isLoading && (
              <span className="text-xs text-[#7A726D]">Checking account session…</span>
            )}

            {isGuest && (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  onClick={() => setOpen(false)}
                  href="/account"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#DFD7CF] bg-white text-xs font-semibold text-[#1E1917]"
                >
                  <LogIn size={15} />
                  Sign in
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/account?mode=signup"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1E1917] text-xs font-semibold text-white shadow-sm"
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
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-[#DFD7CF] bg-white text-sm font-semibold text-[#1E1917] shadow-sm"
              >
                <UserRound size={16} className="text-[#933D32]" />
                Your account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
