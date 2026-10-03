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
      setMessage('Payment received. Your cake is getting ready.')
      // Cart data is convenience UI state only; confirmation came from the server.
      localStorage.removeItem('speedcake-cart-v1')
    } catch {
      setState('error')
      setMessage('We could not check your payment yet. Please try again.')
    }
  }, [params])

  useEffect(() => { void verify() }, [verify])

  return (
    <main className="container py-24 text-center min-h-[50vh]">
      <div className="eyebrow">Thank you</div>
      <h1 className="serif text-5xl mt-3">
        {state === 'success' ? 'Your order is in good hands.' : 'One moment, please.'}
      </h1>
      <p className="mt-5 text-[#756862]">{message}</p>
      {order && <p className="mt-3 text-sm">Order number <b>{order}</b></p>}
      {state === 'checking' ? null : state === 'success' ? (
        <Link className="inline-block mt-8 bg-[#6f3d36] text-white px-6 py-4 text-sm" href={`/account/orders/${order}`}>View your order</Link>
      ) : (
        <div className="mt-8 flex justify-center gap-3">
          <button className="bg-[#6f3d36] text-white px-6 py-4 text-sm" onClick={() => void verify()}>Check payment again</button>
          <Link className="border border-[#6f3d36] px-6 py-4 text-sm" href="/account">View your orders</Link>
        </div>
      )}
    </main>
  )
}

export default function PaymentReturn() {
  return <Suspense fallback={<main className="container py-24">Checking payment…</main>}><PaymentReturnContent /></Suspense>
}
