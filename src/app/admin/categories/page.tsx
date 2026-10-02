'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { generateSlug, type CategoryInput } from '@/lib/schemas'
import type { CategoryRecord } from '@/lib/catalogue-db'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CategoryInput>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    sort_order: 0,
    active: true,
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete Warning Modal State
  const [deleteWarning, setDeleteWarning] = useState<{
    category: CategoryRecord
    reason: string
  } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchCategories() {
    setLoading(true)
    setActionError('')
    try {
      const res = await fetch('/api/admin/categories', {
        headers: await getAdminAuthHeader(),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setCategories(data.categories)
      } else {
        setActionError(data.error || 'Failed to load categories')
      }
    } catch {
      setActionError('Network error while loading categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, [])

  function openCreateModal() {
    setEditingId(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      sort_order: categories.length + 1,
      active: true,
    })
    setSlugManuallyEdited(false)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(cat: CategoryRecord) {
    setEditingId(cat.id)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      sort_order: cat.sort_order,
      active: cat.active,
    })
    setSlugManuallyEdited(true)
    setFormError('')
    setModalOpen(true)
  }

  function handleNameChange(name: string) {
    setFormData(prev => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : generateSlug(name),
    }))
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSubmitting(true)

    try {
      const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(await getAdminAuthHeader()),
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        setFormError(data.error || 'Failed to save category')
        return
      }

      setActionSuccess(editingId ? `Category "${formData.name}" updated successfully.` : `Category "${formData.name}" created.`)
      setTimeout(() => setActionSuccess(''), 4000)
      setModalOpen(false)
      await fetchCategories()
    } catch {
      setFormError('Failed to communicate with the server.')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleToggleActive(cat: CategoryRecord) {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAdminAuthHeader()),
        },
        body: JSON.stringify({ active: !cat.active }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setCategories(prev =>
          prev.map(c => (c.id === cat.id ? { ...c, active: !cat.active } : c))
        )
      } else {
        setActionError(data.error || 'Failed to update category status')
      }
    } catch {
      setActionError('Error toggling category status')
    }
  }

  async function handleDeleteCategory(cat: CategoryRecord) {
    if (cat.products_count > 0) {
      setDeleteWarning({
        category: cat,
        reason: `This category has ${cat.products_count} active product(s) assigned to it. Deleting it would leave products orphaned.`,
      })
      return
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(cat.id)
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'DELETE',
        headers: await getAdminAuthHeader(),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setCategories(prev => prev.filter(c => c.id !== cat.id))
        setActionSuccess(`Category "${cat.name}" was deleted.`)
        setTimeout(() => setActionSuccess(''), 4000)
      } else {
        setActionError(data.error || 'Failed to delete category')
      }
    } catch {
      setActionError('Network error while deleting category')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase().trim()
    return categories.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
  }, [categories, search])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ded0c8]">
        <div>
          <div className="eyebrow text-[#8a5b51]">Catalogue Structure</div>
          <h1 className="serif text-4xl text-[#352c28] mt-1.5">Categories</h1>
          <p className="text-xs text-[#756862] mt-1.5 leading-relaxed">
            Manage cake categories, slugs, and navigation ordering for the Speed Cake storefront.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-[#6f3d36] hover:bg-[#5b322c] text-white px-4 py-2.5 text-xs font-medium rounded-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-[#effaf0] border border-[#b2e2b8] text-[#1b6b26] text-xs flex items-center gap-2 rounded-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-xs flex items-center justify-between gap-2 rounded-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-[#8b342a] hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-[#ded0c8] shadow-sm">
        <div className="flex items-center gap-2 border border-[#ded0c8] bg-[#faf7f4] px-3 py-1.5 w-full sm:w-72">
          <Search size={15} className="text-[#867872]" />
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full text-[#403835]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#867872] hover:text-[#403835]">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-[#756862]">
          <span>Total: <b>{categories.length}</b></span>
          <span>Active: <b>{categories.filter(c => c.active).length}</b></span>
          <span>Inactive: <b>{categories.filter(c => !c.active).length}</b></span>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-[#ded0c8] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#756862]">
            <Loader2 size={24} className="animate-spin inline text-[#6f3d36] mb-3" />
            <p className="text-xs">Loading categories…</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f6eee8] text-[#6f3d36] mx-auto flex items-center justify-center mb-3">
              <FolderPlus size={22} />
            </div>
            <h3 className="serif text-lg text-[#352c28]">No categories found</h3>
            <p className="text-xs text-[#756862] mt-1 max-w-sm mx-auto">
              {search ? 'Try adjusting your search query.' : 'Create your first cake category to organize your catalogue.'}
            </p>
            {!search && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 bg-[#6f3d36] text-white px-3.5 py-2 text-xs font-medium rounded-sm hover:bg-[#5b322c] transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Category</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f4] border-b border-[#ded0c8] text-[#756862] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee3db]">
                {filteredCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-[#fdfbf9] transition">
                    <td className="py-3.5 px-4 font-mono text-[#867872]">{cat.sort_order}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#352c28]">{cat.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#8a5b51] text-[11px]">{cat.slug}</td>
                    <td className="py-3.5 px-4 text-[#756862] max-w-xs truncate">
                      {cat.description || <span className="italic text-[#a89b94]">No description</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 bg-[#f5ede7] text-[#6f3d36] font-medium rounded-full text-[11px]">
                        {cat.products_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => void handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                          cat.active
                            ? 'bg-[#e7f7ea] text-[#1b6b26] hover:bg-[#d5f0d9]'
                            : 'bg-[#f4ecea] text-[#7d564f] hover:bg-[#e8dedb]'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.active ? 'bg-[#1b6b26]' : 'bg-[#7d564f]'}`} />
                        <span>{cat.active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="inline-flex items-center gap-1 text-[#6f3d36] hover:text-[#5b322c] font-medium px-2 py-1 rounded hover:bg-[#f6eee8] transition cursor-pointer"
                        title="Edit category"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => void handleDeleteCategory(cat)}
                        disabled={deletingId === cat.id}
                        className="inline-flex items-center gap-1 text-[#a53b30] hover:text-[#7f261d] font-medium px-2 py-1 rounded hover:bg-[#fbeeed] transition cursor-pointer disabled:opacity-50"
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#ded0c8] w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#eee3db]">
              <h2 className="serif text-xl text-[#352c28]">
                {editingId ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#867872] hover:text-[#352c28] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-[#fcf0ee] border border-[#f2cfc7] text-[#8b342a] text-xs rounded-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Birthday, Celebration, Cupcakes"
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase tracking-wider text-[#63534c] font-medium">
                    Slug *
                  </label>
                  <span className="text-[10px] text-[#867872]">Lowercase letters and hyphens only</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. birthday-cakes"
                  value={formData.slug}
                  onChange={e => {
                    setSlugManuallyEdited(true)
                    setFormData(prev => ({ ...prev, slug: e.target.value }))
                  }}
                  className="w-full border border-[#ded0c8] bg-[#fdfbf9] font-mono px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description for customers and SEO…"
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#63534c] mb-1.5 font-medium">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sort_order}
                    onChange={e => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full border border-[#ded0c8] bg-[#fdfbf9] px-3 py-2 text-xs outline-none focus:border-[#6f3d36]"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="accent-[#6f3d36] w-4 h-4"
                    />
                    <span className="text-xs text-[#352c28] font-medium">Active on storefront</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#eee3db] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#ded0c8] text-xs font-medium text-[#63534c] hover:bg-[#faf7f4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 bg-[#6f3d36] hover:bg-[#5b322c] text-white px-5 py-2 text-xs font-medium transition disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingId ? 'Update Category' : 'Create Category'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Blocked Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f0c8c0] w-full max-w-md shadow-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fdeeed] text-[#b42b1f] mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="serif text-xl text-[#2b221f]">Category in Use</h3>
            <p className="text-xs text-[#756862] mt-2 leading-relaxed">
              {deleteWarning.reason}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={async () => {
                  await handleToggleActive(deleteWarning.category)
                  setDeleteWarning(null)
                  setActionSuccess(`Category "${deleteWarning.category.name}" has been deactivated.`)
                }}
                className="w-full bg-[#6f3d36] hover:bg-[#5b322c] text-white py-2.5 text-xs font-medium transition cursor-pointer"
              >
                Deactivate category instead
              </button>
              <button
                onClick={() => setDeleteWarning(null)}
                className="w-full border border-[#ded0c8] hover:bg-[#faf7f4] text-[#403835] py-2.5 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
