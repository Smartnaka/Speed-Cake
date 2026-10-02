'use client'
import {ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {AdminGuard} from '@/components/admin/admin-guard'
import {AdminShell} from '@/components/admin/admin-layout'

export default function AdminLayout({children}: {children: ReactNode}) {
  const pathname = usePathname()

  // For /admin/login, bypass the admin shell and guard so the login form renders cleanly
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <AdminGuard>
      {({adminUser, onLogout}) => (
        <AdminShell adminUser={adminUser} onLogout={onLogout}>
          {children}
        </AdminShell>
      )}
    </AdminGuard>
  )
}
