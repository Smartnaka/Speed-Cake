import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { StoreHeader } from '@/components/store-header'
import { Sparkles, ArrowUpRight } from 'lucide-react'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Speed Cake — Handcrafted Celebration Cakes',
    template: '%s | Speed Cake',
  },
  description:
    'Artisanal bespoke cakes made to order in Lagos. Customized with care for your sweetest celebrations.',
  openGraph: {
    type: 'website',
    siteName: 'Speed Cake',
    title: 'Speed Cake — Handcrafted Celebration Cakes',
    description:
      'Artisanal bespoke cakes made to order in Lagos. Customized with care for your sweetest celebrations.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#4A4340] selection:bg-[#F8ECE9] selection:text-[#933D32]">
        {/* Top Announcement Bar */}
        <div className="bg-[#1E1917] text-[#FAF8F5] text-center py-2.5 px-4 text-xs font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles size={13} className="text-[#C58B82]" />
          <span>Handcrafted bespoke cakes baked fresh to order · Delivery &amp; bakery pickup in Lagos</span>
        </div>

        {/* Global Navigation */}
        <StoreHeader />

        {/* Page Content */}
        <div className="flex-1">{children}</div>

        {/* Global Footer */}
        <footer className="bg-[#161312] text-[#F4EFEB] mt-32 border-t border-[#2D2623]">
          <div className="container py-20 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
            {/* Col 1: Brand & Philosophy */}
            <div className="md:col-span-4">
              <Link href="/" className="serif text-3xl tracking-tight text-white inline-block">
                speed cake<span className="text-[#933D32]">.</span>
              </Link>
              <p className="text-[#A39993] text-sm leading-relaxed mt-4 max-w-sm">
                Bespoke confectionery crafted with pure butter, seasonal compotes, and hand-piped finishes. Baked fresh for life’s most memorable moments.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-[#8A807B]">
                <span className="w-2 h-2 rounded-full bg-[#2A6947] animate-pulse" />
                <span>Ovens running daily in Lekki Phase 1, Lagos</span>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div className="md:col-span-3">
              <div className="text-xs uppercase font-semibold tracking-widest text-[#E8D4CF] mb-4">
                The Bakery
              </div>
              <ul className="space-y-3 text-sm text-[#C8BFBA]">
                <li>
                  <Link href="/cakes" className="hover:text-white transition-colors">
                    All Celebration Cakes
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Birthday" className="hover:text-white transition-colors">
                    Birthday Cakes
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Wedding" className="hover:text-white transition-colors">
                    Wedding &amp; Anniversaries
                  </Link>
                </li>
                <li>
                  <Link href="/cakes?category=Cupcakes" className="hover:text-white transition-colors">
                    Cupcakes &amp; Sweet Treats
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Customer Care */}
            <div className="md:col-span-2">
              <div className="text-xs uppercase font-semibold tracking-widest text-[#E8D4CF] mb-4">
                Assistance
              </div>
              <ul className="space-y-3 text-sm text-[#C8BFBA]">
                <li>
                  <Link href="/track" className="hover:text-white transition-colors">
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="hover:text-white transition-colors">
                    Customer Account
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-white transition-colors">
                    View Bag
                  </Link>
                </li>
                <li>
                  <a href="mailto:orders@speedcake.com" className="hover:text-white transition-colors">
                    Bespoke Inquiries
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Fresh Notes / Support */}
            <div className="md:col-span-3">
              <div className="text-xs uppercase font-semibold tracking-widest text-[#E8D4CF] mb-4">
                Bakery Studio
              </div>
              <p className="text-[#A39993] text-sm leading-relaxed">
                14 Admiralty Way, Lekki Phase 1, Lagos
              </p>
              <p className="text-[#8A807B] text-xs mt-2">
                Mon – Sat: 8:00 AM – 7:00 PM<br />Sunday: 10:00 AM – 5:00 PM
              </p>
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-full border border-[#3D3430] hover:border-[#E8D4CF] text-xs text-[#E8D4CF] hover:text-white transition-colors"
              >
                <span>Client Portal</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#241E1C]">
            <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A706A]">
              <span>&copy; {new Date().getFullYear()} Speed Cake. Crafted with care in Lagos.</span>
              <div className="flex gap-6">
                <Link href="/cakes" className="hover:text-[#C8BFBA] transition-colors">Privacy</Link>
                <Link href="/cakes" className="hover:text-[#C8BFBA] transition-colors">Terms of Order</Link>
                <Link href="/track" className="hover:text-[#C8BFBA] transition-colors">Delivery FAQs</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
