'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/demo-products'

export default function CakesContent() {
  const params = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.products)) setProducts(d.products)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(params.get('category') || 'All')
  const [sort, setSort] = useState('featured')

  const categories = useMemo(
    () => ['All', ...new Set(products.map(p => p.category).filter(Boolean))],
    [products]
  )

  const list = useMemo(
    () =>
      products
        .filter(
          p =>
            (category === 'All' || p.category === category) &&
            p.name.toLowerCase().includes(query.toLowerCase())
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price_kobo - b.price_kobo
            : sort === 'high'
            ? b.price_kobo - a.price_kobo
            : 0
        ),
    [products, category, query, sort]
  )

  return (
    <main className="container py-10 md:py-14 space-y-8">
      {/* Header Banner */}
      <div className="max-w-2xl space-y-2">
        <div className="eyebrow flex items-center gap-1.5">
          <Sparkles size={14} />
          <span>Small-Batch Confectionery</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl text-[#2A1E24] font-extrabold tracking-tight">
          The Cake Collection
        </h1>
        <p className="text-base text-[#55424D] leading-relaxed">
          Explore our seasonal menu of celebration cakes. Every cake is baked fresh to order and customizable with your choice of size, fillings, and hand-piped messages.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div id="categories" className="space-y-4 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(c => {
            const isActive = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#E60067] text-white shadow-pink-glow scale-105'
                    : 'bg-white border border-[#FAD1E0] text-[#55424D] hover:border-[#E60067] hover:text-[#E60067]'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7380]" />
            <input
              aria-label="Search cakes"
              placeholder="Search by cake name or flavour..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#FAD1E0] bg-white text-xs text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-[#8A7380] font-bold flex items-center gap-1">
              <SlidersHorizontal size={13} />
              <span>Sort:</span>
            </span>
            <select
              aria-label="Sort cakes"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-4 py-2 rounded-full border border-[#FAD1E0] bg-white text-xs font-bold text-[#2A1E24] outline-none focus:border-[#E60067] shadow-subtle cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid Area */}
      {!loaded ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#FAD1E0] border-t-[#E60067] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#8A7380]">Loading our fresh celebration cakes...</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {list.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {list.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#FAD1E0] p-8 max-w-lg mx-auto space-y-4 shadow-card">
              <div className="text-2xl text-[#2A1E24] font-extrabold">No cakes found</div>
              <p className="text-sm text-[#8A7380]">
                {products.length
                  ? 'We couldn’t find any recipes matching your search. Try resetting your filters.'
                  : 'Our cake catalogue is currently being prepared. Please check back shortly.'}
              </p>
              {products.length > 0 && (
                <button
                  onClick={() => {
                    setQuery('')
                    setCategory('All')
                  }}
                  className="px-6 py-3 rounded-full bg-[#E60067] text-white text-xs font-black uppercase tracking-wider shadow-pink-glow hover:bg-[#C70055] transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
