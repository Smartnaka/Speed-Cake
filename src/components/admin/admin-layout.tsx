'use client'
import {ReactNode, useState} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  UserCheck,
  X,
} from 'lucide-react'
import type {AdminUser} from './admin-guard'

interface AdminShellProps {
  adminUser: AdminUser
  onLogout: () => Promise<void>
  children: ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  active: boolean
  badge?: string
  disabled?: boolean
}

export function AdminShell({adminUser, onLogout, children}: AdminShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      active: pathname === '/admin/orders',
      badge: 'Stage 3',
      disabled: true,
    },
    {
      label: 'Products',
      href: '/admin/products',
      icon: Package,
      active: pathname === '/admin/products',
      badge: 'Stage 2',
      disabled: true,
    },
    {
      label: 'Categories',
      href: '/admin/categories',
      icon: FolderTree,
      active: pathname === '/admin/categories',
      badge: 'Stage 2',
      disabled: true,
    },
    {
      label: 'Delivery',
      href: '/admin/delivery',
      icon: Truck,
      active: pathname === '/admin/delivery',
      badge: 'Later',
      disabled: true,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      active: pathname === '/admin/settings',
      badge: 'Later',
      disabled: true,
    },
  ]

  async function handleLogoutClick() {
    setLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-[#ded0c8] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="serif text-xl tracking-tight text-[#6f3d36]">
            speed cake<span className="text-[#c28d79]">.</span>
          </Link>
          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#f3e5df] text-[#6f3d36] font-semibold tracking-wider">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="p-1.5 text-[#594c46] hover:text-[#6f3d36]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <nav
            className="w-4/5 max-w-xs h-full bg-[#fdfaf7] border-r border-[#ded0c8] p-5 flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#eee3db]">
                <div>
                  <div className="serif text-xl text-[#6f3d36]">speed cake.</div>
                  <div className="text-[10px] uppercase tracking-widest text-[#867872]">Operations</div>
                </div>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X size={20} className="text-[#756862]" />
                </button>
              </div>

              <div className="mt-6 space-y-1.5">
                {navItems.map(item => (
                  <div key={item.label}>
                    {item.disabled ? (
                      <div className="flex items-center justify-between px-3 py-2.5 text-xs text-[#9d8d85] cursor-not-allowed">
                        <span className="flex items-center gap-2.5">
                          <item.icon size={16} />
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="text-[9px] uppercase tracking-wider bg-[#eee6e0] px-1.5 py-0.5 rounded-sm">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-sm transition ${
                          item.active
                            ? 'bg-[#6f3d36] text-white'
                            : 'text-[#403835] hover:bg-[#f5ebe4]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <item.icon size={16} />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#eee3db] space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-[#594c46]">
                <UserCheck size={16} className="text-[#6f3d36]" />
                <div className="truncate">
                  <div className="font-medium truncate">{adminUser.name || 'Admin'}</div>
                  <div className="text-[10px] text-[#867872] truncate">{adminUser.email}</div>
                </div>
              </div>

              <button
                onClick={handleLogoutClick}
                disabled={loggingOut}
                className="w-full border border-[#ded0c8] bg-white text-[#6f3d36] hover:bg-[#fbf4f0] py-2 text-xs font-medium transition flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[#ded0c8] bg-[#fdfbf9] min-h-screen p-6 shrink-0 sticky top-0 h-screen">
        <div>
          {/* Brand */}
          <div className="pb-6 border-b border-[#eee3db]">
            <Link href="/admin" className="serif text-2xl tracking-tight text-[#6f3d36] block">
              speed cake<span className="text-[#c28d79]">.</span>
            </Link>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8a5b51]">
                Bakery Operations
              </span>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-[#f3e5df] text-[#6f3d36] font-semibold">
                Admin
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map(item => (
              <div key={item.label}>
                {item.disabled ? (
                  <div
                    title="Available in later stage"
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs text-[#9d8d85] cursor-not-allowed select-none rounded-sm"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={16} className="text-[#b2a49d]" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider bg-[#eee6e0] text-[#7a6c65] px-1.5 py-0.5 rounded-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-sm transition ${
                      item.active
                        ? 'bg-[#6f3d36] text-white shadow-sm'
                        : 'text-[#403835] hover:bg-[#f6eee8]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="pt-6 border-t border-[#eee3db] space-y-3">
          <div className="bg-[#f7efe9] p-3 rounded-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#6f3d36] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {(adminUser.name || adminUser.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-semibold text-[#352c28] truncate">{adminUser.name || 'Administrator'}</div>
              <div className="text-[10px] text-[#867872] truncate">{adminUser.email}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              target="_blank"
              title="View live website"
              className="border border-[#ded0c8] bg-white hover:bg-[#faf6f2] text-[#594c46] p-2 text-xs transition flex items-center justify-center shrink-0"
            >
              <ExternalLink size={14} />
            </Link>
            <button
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className="flex-1 border border-[#ded0c8] bg-white hover:bg-[#faf6f2] text-[#6f3d36] py-2 px-3 text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-[#ded0c8] px-6 py-3.5 hidden md:flex items-center justify-between text-xs text-[#756862]">
          <div className="flex items-center gap-2">
            <span className="text-[#867872]">Speed Cake Operations</span>
            <span>/</span>
            <span className="font-medium text-[#352c28]">Admin Foundation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#eaf4ec] text-[#246b38] font-medium text-[10px] uppercase tracking-wider rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2da44e]"></span>
              Secure Session
            </span>
            <Link
              href="/"
              target="_blank"
              className="hover:underline flex items-center gap-1 text-[#6f3d36]"
            >
              <span>View live store</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
