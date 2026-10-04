import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { StoreHeader } from '@/components/store-header'
import { Sparkles, ArrowUpRight, Cake } from 'lucide-react'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Speed Cake — Natural and Healthy Freshly Baked Cakes',
    template: '%s | Speed Cake',
  },
  description:
    'Artisanal bespoke cakes made to order in Lagos. Customized with care for your sweetest celebrations.',
  openGraph: {
    type: 'website',
    siteName: 'Speed Cake',
    title: 'Speed Cake — Natural and Healthy Freshly Baked Cakes',
    description:
      'Artisanal bespoke cakes made to order in Lagos. Customized with care for your sweetest celebrations.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FFF5F8] text-[#55424D] selection:bg-[#FFE4EE] selection:text-[#E60067]">
        {/* Top Vibrant Announcement Bar */}
        <div className="bg-[#E60067] text-white text-center py-2 px-4 text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 shadow-sm">
          <Sparkles size={14} className="text-[#FFD1E3]" />
          <span>Handcrafted bespoke celebration cakes baked fresh to order in Lagos &middot; Same-day &amp; scheduled delivery</span>
        </div>

        {/* Global Navigation */}
        <StoreHeader />

        {/* Page Content */}
        <div className="flex-1">{children}</div>

        {/* Global Footer */}
        <footer className="bg-[#2A1722] text-[#FDF0F4] mt-24 border-t border-[#442838]">
          <div className="container py-16 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
            {/* Col 1: Brand & Philosophy */}
            <div className="md:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E60067] to-[#FF4B93] text-white flex items-center justify-center shadow-subtle">
                  <Cake size={20} strokeWidth={2.2} />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-white">
                  Speed Cake<span className="text-[#E60067]">.</span>
                </span>
              </Link>
              <p className="text-[#D0B8C4] text-sm leading-relaxed max-w-sm">
                Confectionery crafted with 100% natural butter, seasonal berry compotes, and hand-piped finishes. Baked with love for life’s most memorable moments.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#FFB3D1] font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E60067] animate-pulse" />
                <span>Ovens running daily in Lekki Phase 1, Lagos</span>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div className="md:col-span-3">
              <div className="text-xs uppercase font-extrabold tracking-widest text-[#FFB3D1] mb-4">
                The Bakery
              </div>
              <ul className="space-y-3 text-sm text-[#E0D0D9]">
                <li>
                  <Link href="/cakes" className="hover:text-[#FFB3D1] transition-colors">
                    All Celebration Cakes
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Birthday" className="hover:text-[#FFB3D1] transition-colors">
                    Birthday Cakes
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Wedding" className="hover:text-[#FFB3D1] transition-colors">
                    Wedding &amp; Anniversaries
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Cupcakes" className="hover:text-[#FFB3D1] transition-colors">
                    Cupcakes &amp; Sweet Treats
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Customer Care */}
            <div className="md:col-span-2">
              <div className="text-xs uppercase font-extrabold tracking-widest text-[#FFB3D1] mb-4">
                Assistance
              </div>
              <ul className="space-y-3 text-sm text-[#E0D0D9]">
                <li>
                  <Link href="/track" className="hover:text-[#FFB3D1] transition-colors">
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="hover:text-[#FFB3D1] transition-colors">
                    Customer Account
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-[#FFB3D1] transition-colors">
                    View Bag
                  </Link>
                </li>
                <li>
                  <a href="mailto:orders@speedcake.com" className="hover:text-[#FFB3D1] transition-colors">
                    Bespoke Inquiries
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Fresh Notes / Support */}
            <div className="md:col-span-3 space-y-3">
              <div className="text-xs uppercase font-extrabold tracking-widest text-[#FFB3D1] mb-4">
                Bakery Studio
              </div>
              <p className="text-[#D0B8C4] text-sm leading-relaxed">
                14 Admiralty Way, Lekki Phase 1, Lagos
              </p>
              <p className="text-[#A8909D] text-xs leading-relaxed">
                Mon – Sat: 8:00 AM – 7:00 PM<br />Sunday: 10:00 AM – 5:00 PM
              </p>
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 mt-3 px-5 py-2.5 rounded-full border border-[#553849] hover:border-[#E60067] text-xs font-bold text-[#FFB3D1] hover:text-white transition-colors"
              >
                <span>Client Portal</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#3D2533]">
            <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8909D]">
              <span>&copy; {new Date().getFullYear()} Speed Cake. Handcrafted with love in Lagos.</span>
              <div className="flex gap-6 font-medium">
                <Link href="/cakes" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/cakes" className="hover:text-white transition-colors">Terms of Order</Link>
                <Link href="/track" className="hover:text-white transition-colors">Delivery FAQs</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
