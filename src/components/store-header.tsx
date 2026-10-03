'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingBag, UserRound, Menu, X, LogIn, UserPlus } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { readCart } from '@/lib/cart'

type ProductSummary = { category: string }

/**
 * Auth state:
 *   'loading'  — initial session check in progress (avoid flicker)
 *   'guest'    — no active Supabase session
 *   'signed-in' — active Supabase session
 */
type AuthState = 'loading' | 'guest' | 'signed-in'

export function StoreHeader() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    // Cart count
    const refresh = () => setCount(readCart().reduce((n, item) => n + item.quantity, 0))
    refresh()
    window.addEventListener('speedcake-cart', refresh)

    // Supabase auth — real session, not localStorage flags
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

    // Categories for nav
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
    <header className="bg-[#fff9f2]/95 sticky top-0 z-40 border-b border-[#eee4dc]">
      <div className="container min-h-[76px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="serif text-[29px] tracking-tight text-[#6f3d36]">
          speed cake<span className="text-[#c28d79]">.</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-[#403835]">
          <Link href="/cakes">Shop all</Link>
          {categories.slice(0, 3).map(category => (
            <Link key={category} href={`/cakes?category=${encodeURIComponent(category)}`}>
              {category}
            </Link>
          ))}
          <Link href="/track">Track order</Link>
        </nav>

        {/* Right side: auth actions + cart + mobile menu toggle */}
        <div className="flex items-center gap-4">
          {/* Desktop auth actions — visible text links, not just icons */}
          {isLoading && (
            <div className="hidden md:block w-24" aria-hidden="true">
              {/* Invisible placeholder to prevent layout shift */}
            </div>
          )}

          {isGuest && (
            <div className="hidden md:flex items-center gap-3 text-[13px]">
              <Link
                href="/account"
                className="flex items-center gap-1.5 text-[#403835] hover:text-[#6f3d36] transition"
              >
                <LogIn size={15} strokeWidth={1.8} />
                <span>Sign in</span>
              </Link>
              <span className="text-[#d4c8c0]">|</span>
              <Link
                href="/account?mode=signup"
                className="flex items-center gap-1.5 text-[#6f3d36] font-medium hover:text-[#522a24] transition"
              >
                <UserPlus size={15} strokeWidth={1.8} />
                <span>Create account</span>
              </Link>
            </div>
          )}

          {isSignedIn && (
            <Link
              href="/account"
              className="hidden md:flex items-center gap-1.5 text-[13px] text-[#403835] hover:text-[#6f3d36] transition"
            >
              <UserRound size={16} strokeWidth={1.7} />
              <span>Account</span>
            </Link>
          )}

          {/* Cart icon — always visible */}
          <Link aria-label={`Cart, ${count} items`} href="/cart" className="relative">
            <ShoppingBag size={19} strokeWidth={1.6} />
            <span className="absolute -right-2 -top-2 rounded-full bg-[#6f3d36] text-white w-4 h-4 grid place-items-center text-[9px]">
              {count}
            </span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {open && (
        <nav className="md:hidden px-6 pb-5 grid gap-4 text-sm border-t border-[#eee4dc]">
          <Link onClick={() => setOpen(false)} href="/cakes" className="pt-4">
            Shop all cakes
          </Link>
          {categories.map(category => (
            <Link
              onClick={() => setOpen(false)}
              key={category}
              href={`/cakes?category=${encodeURIComponent(category)}`}
            >
              {category}
            </Link>
          ))}
          <Link onClick={() => setOpen(false)} href="/track">
            Track order
          </Link>

          {/* Mobile auth — clear text actions, not an icon */}
          <div className="border-t border-[#eee4dc] pt-4 grid gap-3">
            {isLoading && (
              <span className="text-xs text-[#98857e]">Checking account…</span>
            )}

            {isGuest && (
              <>
                <Link
                  onClick={() => setOpen(false)}
                  href="/account"
                  className="flex items-center gap-2 text-[#403835]"
                >
                  <LogIn size={16} strokeWidth={1.7} />
                  Sign in
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/account?mode=signup"
                  className="flex items-center gap-2 font-medium text-[#6f3d36]"
                >
                  <UserPlus size={16} strokeWidth={1.7} />
                  Create account
                </Link>
              </>
            )}

            {isSignedIn && (
              <Link
                onClick={() => setOpen(false)}
                href="/account"
                className="flex items-center gap-2 text-[#403835]"
              >
                <UserRound size={16} strokeWidth={1.7} />
                Your account
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
