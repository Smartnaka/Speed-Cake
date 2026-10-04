'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/browser'

type VerificationState = 'checking' | 'success' | 'unconfirmed' | 'error'

function PaymentReturnContent() {
  const params = useSearchParams()
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Checking your payment securely…')
  const [order, setOrder] = useState('')

  const verify = useCallback(async () => {
    const reference = params.get('reference')
    if (!reference) {
      setState('unconfirmed')
      setMessage('We could not find a payment reference. Your order has not been marked as paid.')
      return
    }

    setState('checking')
    setMessage('Checking your payment securely…')
    const { data: { session } } = await supabaseBrowser().auth.getSession()
    if (!session) {
      setState('unconfirmed')
      setMessage('Sign in to securely confirm this payment and view your order.')
      return
    }

    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reference }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setState(response.status >= 500 ? 'error' : 'unconfirmed')
        setMessage(data.error || 'Payment has not been confirmed yet.')
        return
      }
      setOrder(data.order_number)
      setState('success')
      setMessage('Payment received. Your bespoke confection is officially queued for baking.')
      // Cart data is convenience UI state only; confirmation came from the server.
      localStorage.removeItem('speedcake-cart-v1')
    } catch {
      setState('error')
      setMessage('We could not verify your payment with the banking gateway yet. Please try again.')
    }
  }, [params])

  useEffect(() => { void verify() }, [verify])

  return (
    <main className="min-h-[75vh] flex items-center justify-center py-16 px-4 bg-[#FAF8F5]">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAE3DC] p-8 md:p-12 shadow-card text-center">
        {state === 'checking' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#EAE3DC] border-t-[#933D32] animate-spin mb-6" />
            <span className="eyebrow mb-2">Secure Verification</span>
            <h1 className="serif text-3xl md:text-4xl text-[#1E1917] mb-3">Checking Payment…</h1>
            <p className="text-[#655953] text-sm leading-relaxed max-w-sm">{message}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-6 shadow-subtle">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="eyebrow text-emerald-800 mb-2">Payment Confirmed</span>
            <h1 className="serif text-3xl md:text-4xl text-[#1E1917] mb-3">Your Order is Queued!</h1>
            <p className="text-[#655953] text-sm leading-relaxed max-w-sm mb-6">{message}</p>

            {order && (
              <div className="bg-[#FAF8F5] border border-[#EAE3DC] rounded-2xl px-5 py-3 mb-8 w-full max-w-xs">
                <span className="block text-xs uppercase tracking-widest text-[#7C6E65] font-semibold mb-0.5">Order Reference</span>
                <span className="font-mono text-base font-semibold text-[#1E1917]">{order}</span>
              </div>
            )}

            <Link
              href={`/account/orders/${order}`}
              className="w-full max-w-xs inline-flex items-center justify-center bg-[#933D32] hover:bg-[#7D3228] text-white font-medium px-6 py-3.5 rounded-full text-sm transition-all duration-200 shadow-subtle active:scale-[0.99]"
            >
              View Order Receipt & Tracking
            </Link>
          </div>
        )}

        {(state === 'unconfirmed' || state === 'error') && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-6 shadow-subtle">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="eyebrow text-amber-800 mb-2">Verification Notice</span>
            <h1 className="serif text-3xl text-[#1E1917] mb-3">Payment Pending</h1>
            <p className="text-[#655953] text-sm leading-relaxed max-w-sm mb-8">{message}</p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => void verify()}
                className="flex-1 bg-[#933D32] hover:bg-[#7D3228] text-white font-medium px-5 py-3 rounded-full text-sm transition-all duration-200 shadow-subtle text-center"
              >
                Retry Check
              </button>
              <Link
                href="/account"
                className="flex-1 bg-white hover:bg-[#FAF8F5] text-[#1E1917] font-medium px-5 py-3 rounded-full text-sm border border-[#EAE3DC] transition-all duration-200 text-center"
              >
                My Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PaymentReturn() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[70vh] flex items-center justify-center bg-[#FAF8F5]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#EAE3DC] border-t-[#933D32] animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-[#7C6E65]">Loading confirmation…</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  )
}
