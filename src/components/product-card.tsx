import Link from 'next/link'
import type { Product } from '@/lib/demo-products'
import { naira } from '@/lib/demo-products'
import { ArrowRight, Clock } from 'lucide-react'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col bg-white rounded-3xl p-3.5 border border-[#FAD1E0] hover:border-[#E60067] hover:shadow-card-hover transition-all duration-300">
      {/* Product Image Container */}
      <Link
        href={`/cakes/${product.slug}`}
        className="block relative overflow-hidden rounded-2xl aspect-[0.94] bg-[#FFEBF2]"
      >
        <img
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        {/* Floating Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#FFE4EE] border border-[#FAD1E0] px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase text-[#E60067] shadow-subtle">
            {product.badge}
          </span>
        )}

        {/* Floating Lead Time Badge */}
        {product.lead_days && (
          <span className="absolute bottom-3 left-3 bg-[#2A1E24]/85 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-subtle">
            <Clock size={11} />
            <span>{product.lead_days}d notice</span>
          </span>
        )}
      </Link>

      {/* Content Details */}
      <div className="pt-4 pb-1 px-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#E60067]">
            {product.category}
          </div>
          <h3 className="text-lg text-[#2A1E24] font-extrabold mt-1 leading-snug group-hover:text-[#E60067] transition-colors">
            <Link href={`/cakes/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>

        {/* Pricing and Action */}
        <div className="mt-4 pt-3 border-t border-[#FAD1E0]/60 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7380] block">Price from</span>
            <span className="text-base font-black text-[#2A1E24] tracking-tight">
              {naira(product.price_kobo)}
            </span>
          </div>

          <Link
            href={`/cakes/${product.slug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#E60067] hover:bg-[#C70055] transition-all shadow-pink-glow active:scale-95"
          >
            <span>Order</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  )
}
