'use client'
import {ReactNode, useEffect, useState} from 'react'
import Link from 'next/link'
import {usePathname, useRouter} from 'next/navigation'
import {Loader2, LogOut, ShieldAlert, Store} from 'lucide-react'
import {supabaseBrowser} from '@/lib/supabase/browser'

export interface AdminUser {
  id: string
  email?: string
  name: string
  role: string
}

interface AdminGuardProps {
  children: (props: {adminUser: AdminUser; onLogout: () => Promise<void>}) => ReactNode
}

export function AdminGuard({children}: AdminGuardProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized' | 'unauthenticated'>('checking')
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    let active = true

    async function verify() {
      try {
        const db = supabaseBrowser()
        const { data: { session } } = await db.auth.getSession()

        if (!session?.access_token) {
          if (!active) return
          setStatus('unauthenticated')
          const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
          router.replace(`/admin/login${nextParam}`)
          return
        }

        if (active) setUserEmail(session.user.email || '')

        // Server-side verification of admin authorization
        const res = await fetch('/api/admin/session', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!active) return

        if (res.status === 401) {
          setStatus('unauthenticated')
          const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
          router.replace(`/admin/login${nextParam}`)
          return
        }

        if (res.status === 403) {
          setStatus('unauthorized')
          return
        }

        if (!res.ok) {
          setStatus('unauthenticated')
          router.replace('/admin/login')
          return
        }

        const data = await res.json()
        if (active) {
          setAdminUser(data.user)
          if (data.user?.email) setUserEmail(data.user.email)
          setStatus('authorized')
        }
      } catch {
        if (active) {
          setStatus('unauthenticated')
          router.replace('/admin/login')
        }
      }
    }

    void verify()

    // Listen to Supabase auth changes
    let subscription: {unsubscribe: () => void} | undefined
    try {
      const db = supabaseBrowser()
      const auth = db.auth.onAuthStateChange((event, session) => {
        if (!active) return
        if (event === 'SIGNED_OUT' || !session) {
          setStatus('unauthenticated')
          setAdminUser(null)
          router.replace('/admin/login')
        }
      })
      subscription = auth.data.subscription
    } catch {}

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [pathname, router])

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {}
    try {
      const db = supabaseBrowser()
      await db.auth.signOut()
    } catch {}
    setStatus('unauthenticated')
    setAdminUser(null)
    router.replace('/admin/login')
  }

  if (status === 'checking') {
    return (
      <main className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="animate-spin inline text-[#6f3d36] mb-3" size={24} />
          <p className="text-sm font-medium text-[#403835]">Verifying administrator credentials…</p>
          <p className="text-xs text-[#867872] mt-1">Checking server authorization</p>
        </div>
      </main>
    )
  }

  if (status === 'unauthorized') {
    return (
      <main className="min-h-screen bg-[#fcf8f6] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#f0c8c0] p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#fdeeed] text-[#b42b1f] mx-auto flex items-center justify-center mb-4">
            <ShieldAlert size={26} />
          </div>
          <h1 className="serif text-3xl text-[#2b221f]">Access Denied</h1>
          <p className="text-xs uppercase tracking-wider text-[#b42b1f] font-semibold mt-1">
            Administrator Privileges Required
          </p>
          <p className="text-xs text-[#756862] mt-4 leading-relaxed">
            The account <b>{userEmail || 'currently signed in'}</b> does not have permissions to access the Instant Cakes Delivery administration area.
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-[#6f3d36] hover:bg-[#5b322c] text-white py-3 text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              <span>Sign in with administrator account</span>
            </button>
            <Link
              href="/"
              className="w-full border border-[#ded0c8] hover:bg-[#faf7f4] text-[#403835] py-3 text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <Store size={14} />
              <span>Return to Instant Cakes Delivery store</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated' || !adminUser) {
    return (
      <main className="min-h-screen bg-[#fcf9f5] flex items-center justify-center p-6">
        <div className="text-center text-sm text-[#756862]">Redirecting to admin sign in…</div>
      </main>
    )
  }

  return <>{children({adminUser, onLogout: handleLogout})}</>
}
