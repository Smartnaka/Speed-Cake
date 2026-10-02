'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ProductForm } from '@/components/admin/product-form'
import type { CategoryRecord } from '@/lib/catalogue-db'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

export default function NewProductPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/categories', { headers: await getAdminAuthHeader() })
        const data = await res.json()
        if (res.ok && data.ok) {
          setCategories(data.categories)
        }
      } catch {}
      setLoading(false)
    }
    void fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="py-24 text-center text-[#756862]">
        <Loader2 size={24} className="animate-spin inline text-[#6f3d36] mb-3" />
        <p className="text-xs">Preparing product editor…</p>
      </div>
    )
  }

  return <ProductForm categories={categories} />
}
