'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ProductForm } from '@/components/admin/product-form'
import type { AdminProductRecord, CategoryRecord } from '@/lib/catalogue-db'

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<AdminProductRecord | null>(null)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getAuthHeader(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('speedcake_admin_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`/api/admin/products/${params.id}`, { headers: getAuthHeader() }),
          fetch('/api/admin/categories', { headers: getAuthHeader() }),
        ])

        const prodData = await prodRes.json()
        const catData = await catRes.json()

        if (prodRes.ok && prodData.ok) {
          setProduct(prodData.product)
        } else {
          setError(prodData.error || 'Product not found.')
        }

        if (catRes.ok && catData.ok) {
          setCategories(catData.categories)
        }
      } catch {
        setError('Network error while loading product.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.id])

  if (loading) {
    return (
      <div className="py-24 text-center text-[#756862]">
        <Loader2 size={24} className="animate-spin inline text-[#6f3d36] mb-3" />
        <p className="text-xs">Loading product details…</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="serif text-2xl text-[#352c28]">Product Not Found</h2>
        <p className="text-xs text-[#756862]">{error || 'The requested product could not be located.'}</p>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-[#6f3d36] font-medium hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Return to products list</span>
        </Link>
      </div>
    )
  }

  return <ProductForm initialProduct={product} categories={categories} />
}
