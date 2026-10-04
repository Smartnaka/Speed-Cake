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
    <main className="container py-12 md:py-16 space-y-10">
      {/* Header Banner */}
      <div className="max-w-2xl space-y-3">
        <div className="eyebrow flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>Handcrafted In Lagos</span>
        </div>
        <h1 className="serif text-4xl md:text-5xl lg:text-6xl text-[#1E1917] font-normal tracking-tight">
          The Cake Collection
        </h1>
        <p className="text-base text-[#7A726D] leading-relaxed">
          Explore our seasonal menu of celebration cakes. Every cake is baked fresh to order and customizable with your choice of size, fillings, and bespoke inscriptions.
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
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1E1917] text-white shadow-sm'
                    : 'bg-white border border-[#EAE3DC] text-[#4A4340] hover:border-[#1E1917] hover:text-[#1E1917]'
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
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A726D]" />
            <input
              aria-label="Search cakes"
              placeholder="Search by cake name or flavour..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#EAE3DC] bg-white text-xs text-[#1E1917] placeholder:text-[#9C938E] outline-none focus:border-[#1E1917] focus:ring-1 focus:ring-[#1E1917] transition shadow-subtle"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-[#7A726D] flex items-center gap-1">
              <SlidersHorizontal size={13} />
              <span>Sort:</span>
            </span>
            <select
              aria-label="Sort cakes"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-4 py-2 rounded-full border border-[#EAE3DC] bg-white text-xs font-medium text-[#1E1917] outline-none focus:border-[#1E1917] shadow-subtle cursor-pointer"
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
        <div className="py-28 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1E1917] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-[#7A726D]">Loading our fresh celebration menu...</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {list.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {list.length === 0 && (
            <div className="py-24 text-center bg-white rounded-2xl border border-[#EAE3DC] p-8 max-w-lg mx-auto space-y-4 shadow-subtle">
              <div className="serif text-2xl text-[#1E1917]">No cakes found</div>
              <p className="text-sm text-[#7A726D]">
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
                  className="px-5 py-2.5 rounded-full bg-[#1E1917] text-white text-xs font-semibold shadow-sm hover:bg-[#332C29] transition"
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
