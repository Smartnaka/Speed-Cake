import Link from 'next/link'
import type { Product } from '@/lib/demo-products'
import { naira } from '@/lib/demo-products'
import { ArrowRight, Clock } from 'lucide-react'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col bg-white rounded-2xl p-3 border border-[#EAE3DC] hover:border-[#DFD7CF] hover:shadow-card-hover transition-all duration-300">
      {/* Product Image Container */}
      <Link
        href={`/cakes/${product.slug}`}
        className="block relative overflow-hidden rounded-xl aspect-[0.94] bg-[#F5EFE9]"
      >
        <img
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        {/* Floating Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase text-[#1E1917] shadow-subtle">
            {product.badge}
          </span>
        )}

        {/* Floating Lead Time Badge */}
        {product.lead_days && (
          <span className="absolute bottom-3 left-3 bg-[#1E1917]/85 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 shadow-subtle">
            <Clock size={11} />
            <span>{product.lead_days}d notice</span>
          </span>
        )}
      </Link>

      {/* Content Details */}
      <div className="pt-4 pb-2 px-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#933D32]">
            {product.category}
          </div>
          <h3 className="serif text-xl text-[#1E1917] font-normal mt-1 leading-snug group-hover:text-[#933D32] transition-colors">
            <Link href={`/cakes/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>

        {/* Pricing and Action */}
        <div className="mt-5 pt-3 border-t border-[#F2ECE5] flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-[#7A726D] block">Price from</span>
            <span className="text-base font-bold text-[#1E1917] tracking-tight">
              {naira(product.price_kobo)}
            </span>
          </div>

          <Link
            href={`/cakes/${product.slug}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white bg-[#1E1917] hover:bg-[#332C29] transition-all shadow-sm"
          >
            <span>Order</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  )
}
