'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { generateSlug, type ProductInput, type VariantInput } from '@/lib/schemas'
import type { AdminProductRecord, CategoryRecord } from '@/lib/catalogue-db'

interface ProductFormProps {
  initialProduct?: AdminProductRecord
  categories: CategoryRecord[]
}

export function ProductForm({ initialProduct, categories }: ProductFormProps) {
  const router = useRouter()
  const isEditing = Boolean(initialProduct)

  const [name, setName] = useState(initialProduct?.name || '')
  const [slug, setSlug] = useState(initialProduct?.slug || '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing)
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || (categories[0]?.id || ''))
  const [description, setDescription] = useState(initialProduct?.description || '')
  const [leadDays, setLeadDays] = useState(initialProduct?.lead_days ?? 2)
  const [active, setActive] = useState(initialProduct?.active ?? true)
  const [featured, setFeatured] = useState(initialProduct?.featured ?? false)
  const [image, setImage] = useState(initialProduct?.image || '')

  // Variants state (price in Naira for display/input: kobo / 100)
  const [variants, setVariants] = useState<Array<VariantInput & { price_naira: string }>>(
    initialProduct?.variants?.length
      ? initialProduct.variants.map(v => ({
          id: v.id,
          name: v.name,
          price_kobo: v.price_kobo,
          price_naira: (v.price_kobo / 100).toString(),
          active: v.active,
        }))
      : [
          { name: '6 inch · serves 8', price_kobo: 2850000, price_naira: '28500', active: true },
          { name: '8 inch · serves 14', price_kobo: 3900000, price_naira: '39000', active: true },
        ]
  )

  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function getAuthHeader(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('speedcake_admin_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function handleNameChange(newName: string) {
    setName(newName)
    if (!slugManuallyEdited) {
      setSlug(generateSlug(newName))
    }
  }

  function handleAddVariant() {
    setVariants(prev => [
      ...prev,
      {
        name: `${(prev.length + 1) * 2 + 6} inch`,
        price_kobo: 4500000,
        price_naira: '45000',
        active: true,
      },
    ])
  }

  function handleRemoveVariant(index: number) {
    if (variants.length <= 1) return
    setVariants(prev => prev.filter((_, idx) => idx !== index))
  }

  function handleVariantChange(index: number, field: string, value: any) {
    setVariants(prev => {
      const copy = [...prev]
      if (field === 'price_naira') {
        const num = parseFloat(value) || 0
        copy[index] = {
          ...copy[index],
          price_naira: value,
          price_kobo: Math.round(num * 100),
        }
      } else {
        copy[index] = {
          ...copy[index],
          [field]: value,
        }
      }
      return copy
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setImage(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    // Ensure variants are formatted
    const cleanVariants: VariantInput[] = variants.map(v => ({
      id: v.id,
      name: v.name.trim(),
      price_kobo: v.price_kobo,
      active: v.active,
    }))

    if (cleanVariants.length === 0) {
      setError('Please add at least one cake size/variant.')
      setSubmitting(false)
      return
    }

    const payload: ProductInput = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      category_id: categoryId || null,
      description: description.trim(),
      lead_days: Number(leadDays) || 0,
      active,
      featured,
      image: image.trim() || null,
      variants: cleanVariants,
    }

    try {
      const url = isEditing ? `/api/admin/products/${initialProduct?.id}` : '/api/admin/products'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.issues?.fieldErrors) {
          const firstErr = Object.values(data.issues.fieldErrors)[0] as string[]
          throw new Error(firstErr?.[0] || 'Validation error. Please verify all fields.')
        }
        throw new Error(data.error || 'Failed to save product.')
      }

      setSuccess(isEditing ? 'Product updated successfully.' : 'Product created successfully.')
      setTimeout(() => {
        router.push('/admin/products')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl pb-12">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ded0c8]">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-[#8a5b51] hover:text-[#6f3d36] font-medium mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to products</span>
          </Link>
          <h1 className="serif text-4xl text-[#352c28]">
            {isEditing ? `Edit: ${initialProduct?.name}` : 'New Cake Product'}
          </h1>
          <p className="text-xs text-[#756862] mt-1">
            Configure cake specifications, category, pricing variants, and imagery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2 border border-[#ded0c8] bg-white text-xs font-medium text-[#63534c] hover:bg-[#faf7f4]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-[#6f3d36] hover:bg-[#5b322c] text-white px-5 py-2 text-xs font-medium rounded-sm transition disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-xs rounded-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-[#effaf0] border border-[#b2e2b8] text-[#1b6b26] text-xs rounded-sm">
          {success}
        </div>
      )}

      {/* Section 1: Basic Information */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm space-y-4">
        <h2 className="serif text-lg text-[#352c28] pb-2 border-b border-[#eee3db]">
          Basic Information
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Vanilla Rose Cloud Cake"
              className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3.5 py-2.5 text-xs outline-none focus:border-[#6f3d36]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#63534c] font-medium">
                URL Slug *
              </label>
              <span className="text-[10px] text-[#867872]">auto-generated</span>
            </div>
            <input
              type="text"
              required
              value={slug}
              onChange={e => {
                setSlugManuallyEdited(true)
                setSlug(e.target.value)
              }}
              placeholder="e.g. vanilla-rose-cloud-cake"
              className="w-full border border-[#ded0c8] bg-[#fdfbf9] font-mono px-3.5 py-2.5 text-xs outline-none focus:border-[#6f3d36]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detailed description of flavors, texture, buttercream, and serving inspiration…"
            className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3.5 py-2 text-xs outline-none focus:border-[#6f3d36] resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
              Category
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.active ? '' : '(Inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
              Lead Time (Days required)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={leadDays}
              onChange={e => setLeadDays(parseInt(e.target.value, 10) || 0)}
              className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
            />
            <p className="text-[10px] text-[#867872] mt-1">Minimum notice required at checkout</p>
          </div>
        </div>
      </section>

      {/* Section 2: Media / Main Image */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm space-y-4">
        <h2 className="serif text-lg text-[#352c28] pb-2 border-b border-[#eee3db]">
          Product Image
        </h2>

        <div className="grid sm:grid-cols-3 gap-6 items-start">
          <div className="sm:col-span-1">
            <div className="border border-[#ded0c8] aspect-square bg-[#faf7f4] flex items-center justify-center overflow-hidden relative">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-[#867872]">
                  <ImageIcon size={28} className="mx-auto mb-1 text-[#ded0c8]" />
                  <span className="text-[11px]">No image assigned</span>
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                Upload New Image (Storage)
              </label>
              <label className="inline-flex items-center gap-2 border border-[#ded0c8] hover:bg-[#faf7f4] px-4 py-2.5 text-xs text-[#403835] font-medium cursor-pointer transition">
                <Upload size={14} className="text-[#6f3d36]" />
                <span>{uploadingImage ? 'Uploading image…' : 'Choose File (JPEG, PNG, WebP)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-[#867872] mt-1">Maximum size: 5MB</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                Or Image URL
              </label>
              <input
                type="text"
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Sizes & Pricing (Variants) */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#eee3db]">
          <div>
            <h2 className="serif text-lg text-[#352c28]">Sizes & Pricing</h2>
            <p className="text-xs text-[#756862] mt-0.5">
              Define the available sizes and their authoritative prices in Naira (₦).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="inline-flex items-center gap-1.5 bg-[#f5ede7] text-[#6f3d36] hover:bg-[#ebdcd4] px-3 py-1.5 text-xs font-medium rounded-sm transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Size</span>
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((v, index) => (
            <div
              key={v.id || index}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-[#fdfbf9] border border-[#eee3db]"
            >
              <div className="flex-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#867872] mb-1 font-medium">
                  Size Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8 inch · serves 14"
                  value={v.name}
                  onChange={e => handleVariantChange(index, 'name', e.target.value)}
                  className="w-full border border-[#ded0c8] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#6f3d36]"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-[10px] uppercase tracking-wider text-[#867872] mb-1 font-medium">
                  Price (₦ Naira)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-[#867872]">₦</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    required
                    placeholder="35000"
                    value={v.price_naira}
                    onChange={e => handleVariantChange(index, 'price_naira', e.target.value)}
                    className="w-full border border-[#ded0c8] bg-white pl-6 pr-3 py-1.5 text-xs outline-none focus:border-[#6f3d36]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center pt-2 sm:pt-4">
                <label className="flex items-center gap-1.5 text-xs text-[#403835] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={v.active}
                    onChange={e => handleVariantChange(index, 'active', e.target.checked)}
                    className="accent-[#6f3d36] w-3.5 h-3.5"
                  />
                  <span>Active</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleRemoveVariant(index)}
                  disabled={variants.length <= 1}
                  className="text-[#a53b30] hover:text-[#7f261d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
                  title="Remove size"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Visibility & Badges */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm space-y-4">
        <h2 className="serif text-lg text-[#352c28] pb-2 border-b border-[#eee3db]">
          Visibility & Placement
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-4 border border-[#eee3db] bg-[#faf7f4] cursor-pointer hover:border-[#ded0c8] transition">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="accent-[#6f3d36] w-4 h-4 mt-0.5"
            />
            <div>
              <div className="text-xs font-semibold text-[#352c28]">Active on Storefront</div>
              <div className="text-[11px] text-[#756862] mt-0.5">
                When active, customers can discover, customize, and order this cake.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-[#eee3db] bg-[#faf7f4] cursor-pointer hover:border-[#ded0c8] transition">
            <input
              type="checkbox"
              checked={featured}
              onChange={e => setFeatured(e.target.checked)}
              className="accent-[#6f3d36] w-4 h-4 mt-0.5"
            />
            <div>
              <div className="text-xs font-semibold text-[#352c28] flex items-center gap-1.5">
                <span>Featured Cake</span>
                <Sparkles size={12} className="text-[#6f3d36]" />
              </div>
              <div className="text-[11px] text-[#756862] mt-0.5">
                Highlights this cake in the featured showcase and bestsellers.
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Preserved Customizations Info Card */}
      {isEditing && (initialProduct?.customizations?.length || 0) > 0 && (
        <div className="p-4 bg-[#f8f5f2] border border-[#e5dcd6] rounded-sm text-xs text-[#5f514b]">
          <div className="font-semibold text-[#6f3d36] mb-1">Preserved Customizations</div>
          <p className="text-[11px] leading-relaxed">
            This cake has {initialProduct?.customizations?.length} active customization group(s) attached (e.g. flavours, colours, and bakery add-ons). These are safely preserved and will be editable in the customization management stage.
          </p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/admin/products"
          className="px-5 py-2.5 border border-[#ded0c8] bg-white text-xs font-medium text-[#63534c] hover:bg-[#faf7f4]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-[#6f3d36] hover:bg-[#5b322c] text-white px-6 py-2.5 text-xs font-medium rounded-sm transition disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Saving Product…</span>
            </>
          ) : (
            <>
              <Check size={15} />
              <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
