'use client'
import {Suspense, useEffect, useState} from 'react'
import Link from 'next/link'
import {useRouter, useSearchParams} from 'next/navigation'
import {Loader2, ShieldAlert} from 'lucide-react'
import {supabaseBrowser} from '@/lib/supabase/browser'
import {safeAdminReturnPath} from '@/lib/schemas'

function AdminLoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeAdminReturnPath(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingInitialSession, setCheckingInitialSession] = useState(true)

  useEffect(() => {
    let active = true
    async function checkExisting() {
      try {
        const db = supabaseBrowser()
        const { data: { session } } = await db.auth.getSession()
        if (session?.access_token) {
          const res = await fetch('/api/admin/session', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (res.ok && active) {
            router.replace(next)
            return
          }
        }
      } catch {}
      if (active) setCheckingInitialSession(false)
    }
    void checkExisting()
    return () => {
      active = false
    }
  }, [next, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const db = supabaseBrowser()
      const { data, error: signInError } = await db.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError || !data.session) {
        throw new Error(signInError?.message || 'Invalid administrator email or password.')
      }

      // Verify server-side admin authorization
      const res = await fetch('/api/admin/session', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })

      if (res.status === 403) {
        await db.auth.signOut()
        throw new Error('Access denied: Administrator privileges required.')
      }

      if (!res.ok) {
        await db.auth.signOut()
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to verify administrator privileges.')
      }

      router.replace(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingInitialSession) {
    return (
      <main className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-6">
        <div className="text-center text-sm text-[#756862] flex items-center gap-2">
          <Loader2 className="animate-spin inline" size={16} />
          <span>Verifying admin session…</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="serif text-3xl tracking-tight text-[#6f3d36] inline-block">
            speed cake<span className="text-[#c28d79]">.</span>
          </Link>
          <div className="mt-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8a5b51]">
            Staff & Operations Admin
          </div>
          <h1 className="serif text-3xl mt-4 text-[#352c28]">Admin Sign In</h1>
          <p className="text-xs text-[#756862] mt-2 leading-relaxed">
            Enter your authorized administrator credentials to manage bakery operations.
          </p>
        </div>

        <div className="bg-white border border-[#ded0c8] p-8 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-xs flex gap-3 items-start"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-5">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-xs uppercase tracking-wider text-[#63534c] mb-2 font-medium">
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3.5 py-3 text-sm outline-none focus:border-[#6f3d36] transition"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs uppercase tracking-wider text-[#63534c] mb-2 font-medium">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3.5 py-3 text-sm outline-none focus:border-[#6f3d36] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6f3d36] hover:bg-[#5b322c] text-white py-3.5 text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin inline" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in to dashboard</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#756862] mt-8">
          <Link href="/" className="hover:underline text-[#6f3d36]">
            ← Return to Speed Cake store
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-6">
          <div className="text-center text-sm text-[#756862]">Loading admin sign in…</div>
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  )
}
