'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Cake,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { naira } from '@/lib/demo-products'
import type { AdminProductRecord, CategoryRecord } from '@/lib/catalogue-db'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const headers = await getAdminAuthHeader()
      const [prodsRes, catsRes] = await Promise.all([
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/categories', { headers }),
      ])

      const prodsData = await prodsRes.json()
      const catsData = await catsRes.json()

      if (prodsRes.ok && prodsData.ok) {
        setProducts(prodsData.products)
      } else {
        setNotification({ type: 'error', text: prodsData.error || 'Failed to load products' })
      }

      if (catsRes.ok && catsData.ok) {
        setCategories(catsData.categories)
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error while loading catalogue' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleToggleActive(p: AdminProductRecord) {
    setTogglingId(p.id)
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAdminAuthHeader()),
        },
        body: JSON.stringify({ active: !p.active }),
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        setProducts(prev => prev.map(prod => (prod.id === p.id ? { ...prod, active: !p.active } : prod)))
        setNotification({
          type: 'success',
          text: `"${p.name}" is now ${!p.active ? 'active on storefront' : 'hidden from storefront'}.`,
        })
        setTimeout(() => setNotification(null), 3500)
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to update product' })
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error while updating status' })
    } finally {
      setTogglingId(null)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesSlug = p.slug.toLowerCase().includes(q)
        if (!matchesName && !matchesSlug) return false
      }

      // Category
      if (selectedCategory !== 'all') {
        if (p.category_id !== selectedCategory) return false
      }

      // Status
      if (selectedStatus === 'active' && !p.active) return false
      if (selectedStatus === 'inactive' && p.active) return false

      return true
    })
  }, [products, search, selectedCategory, selectedStatus])

  function getPriceRange(variants: AdminProductRecord['variants']): string {
    const activeVars = variants.filter(v => v.active)
    if (!activeVars.length) return 'No sizes set'
    const prices = activeVars.map(v => v.price_kobo)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min === max) return naira(min)
    return `${naira(min)} – ${naira(max)}`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ded0c8]">
        <div>
          <div className="eyebrow text-[#8a5b51]">Catalogue Management</div>
          <h1 className="serif text-4xl text-[#352c28] mt-1.5">Products</h1>
          <p className="text-xs text-[#756862] mt-1.5 leading-relaxed">
            Manage your cake catalogue, sizes, pricing, and storefront availability.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-[#6f3d36] hover:bg-[#5b322c] text-white px-4 py-2.5 text-xs font-medium rounded-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Cake Product</span>
        </Link>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 text-xs flex items-center justify-between gap-2 rounded-sm ${
            notification.type === 'success'
              ? 'bg-[#effaf0] border border-[#b2e2b8] text-[#1b6b26]'
              : 'bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#ded0c8] shadow-sm">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex items-center gap-2 border border-[#ded0c8] bg-[#faf7f4] px-3 py-1.5 w-full sm:w-64">
            <Search size={14} className="text-[#867872]" />
            <input
              type="text"
              placeholder="Search by cake name or slug…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs outline-none w-full text-[#403835]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#867872] hover:text-[#403835]">
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border border-[#ded0c8] bg-[#faf7f4] px-3 py-1.5 text-xs text-[#403835] outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="border border-[#ded0c8] bg-[#faf7f4] px-3 py-1.5 text-xs text-[#403835] outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#756862] shrink-0">
          <span>Showing: <b>{filteredProducts.length}</b> of {products.length}</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#ded0c8] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-[#756862]">
            <Loader2 size={24} className="animate-spin inline text-[#6f3d36] mb-3" />
            <p className="text-xs">Loading products catalogue…</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f6eee8] text-[#6f3d36] mx-auto flex items-center justify-center mb-3">
              <Cake size={22} />
            </div>
            <h3 className="serif text-lg text-[#352c28]">No cakes found</h3>
            <p className="text-xs text-[#756862] mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try resetting your search or filter selections.'
                : 'Get started by creating your first cake product.'}
            </p>
            <Link
              href="/admin/products/new"
              className="mt-4 inline-flex items-center gap-1.5 bg-[#6f3d36] text-white px-4 py-2 text-xs font-medium rounded-sm hover:bg-[#5b322c] transition"
            >
              <Plus size={14} />
              <span>Add Cake</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f4] border-b border-[#ded0c8] text-[#756862] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cake</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price Range</th>
                  <th className="py-3 px-4 text-center">Sizes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee3db]">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-[#fdfbf9] transition">
                    {/* Cake Info & Image */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#faf7f4] border border-[#ded0c8] shrink-0 overflow-hidden relative">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#ded0c8]">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#352c28] flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.featured && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#fdf5eb] text-[#8a5b1f] border border-[#f5dfc3] text-[9px] font-bold rounded-sm uppercase tracking-wider">
                                <Sparkles size={10} />
                                <span>Featured</span>
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[#8a5b51] text-[10px] mt-0.5">{p.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 bg-[#faf7f4] border border-[#eee3db] text-[#554640] rounded-sm text-[11px] font-medium">
                        {p.category_name}
                      </span>
                    </td>

                    {/* Price Range */}
                    <td className="py-3.5 px-4 font-medium text-[#352c28]">
                      {getPriceRange(p.variants)}
                    </td>

                    {/* Sizes Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 bg-[#f5ede7] text-[#6f3d36] font-medium rounded-full text-[11px]">
                        {p.variants.length} size{p.variants.length === 1 ? '' : 's'}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => void handleToggleActive(p)}
                        disabled={togglingId === p.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ${
                          p.active
                            ? 'bg-[#e7f7ea] text-[#1b6b26] hover:bg-[#d5f0d9]'
                            : 'bg-[#f4ecea] text-[#7d564f] hover:bg-[#e8dedb]'
                        }`}
                        title="Click to toggle storefront visibility"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-[#1b6b26]' : 'bg-[#7d564f]'}`} />
                        <span>{p.active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {p.active && (
                        <Link
                          href={`/cakes/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#867872] hover:text-[#352c28] px-2 py-1 rounded hover:bg-[#f6eee8] transition"
                          title="View on storefront"
                        >
                          <ExternalLink size={13} />
                          <span>View</span>
                        </Link>
                      )}
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex items-center gap-1 text-[#6f3d36] hover:text-[#5b322c] font-medium px-2 py-1 rounded hover:bg-[#f6eee8] transition"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
