import { supabaseAdmin } from '@/lib/supabase/server'
import { demoProducts, type Product } from '@/lib/demo-products'
import type { CategoryInput, ProductInput } from '@/lib/schemas'

export interface CategoryRecord {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  active: boolean
  created_at: string
  products_count: number
}

export interface ProductVariantRecord {
  id: string
  product_id: string
  name: string
  price_kobo: number
  active: boolean
}

export interface ProductImageRecord {
  id: string
  product_id: string
  storage_path: string
  alt: string
  sort_order: number
}

export interface ProductCustomizationRecord {
  id: string
  product_id: string
  kind: 'flavour' | 'colour' | 'addon'
  label: string
  options: any[]
  fee_kobo: number
  active: boolean
}

export interface AdminProductRecord {
  id: string
  category_id: string | null
  category_name: string
  name: string
  slug: string
  description: string
  active: boolean
  featured: boolean
  lead_days: number
  image: string
  variants: ProductVariantRecord[]
  customizations?: ProductCustomizationRecord[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// In-Memory Fallback Store (Used when Supabase credentials are not configured)
// ---------------------------------------------------------------------------
interface LocalStore {
  categories: CategoryRecord[]
  products: AdminProductRecord[]
}

const initialCategories: CategoryRecord[] = [
  { id: 'cat-birthday', name: 'Birthday', slug: 'birthday', description: 'Celebration cakes crafted for birthdays', image_url: null, sort_order: 1, active: true, created_at: new Date().toISOString(), products_count: 2 },
  { id: 'cat-celebration', name: 'Celebration', slug: 'celebration', description: 'Statement cakes for every milestone', image_url: null, sort_order: 2, active: true, created_at: new Date().toISOString(), products_count: 1 },
  { id: 'cat-anniversary', name: 'Anniversary', slug: 'anniversary', description: 'Romantic and milestone anniversary cakes', image_url: null, sort_order: 3, active: true, created_at: new Date().toISOString(), products_count: 1 },
  { id: 'cat-cupcakes', name: 'Cupcakes', slug: 'cupcakes', description: 'Freshly boxed tender cupcakes', image_url: null, sort_order: 4, active: true, created_at: new Date().toISOString(), products_count: 1 },
  { id: 'cat-wedding', name: 'Wedding', slug: 'wedding', description: 'Handcrafted bespoke wedding centrepieces', image_url: null, sort_order: 5, active: true, created_at: new Date().toISOString(), products_count: 1 },
]

const initialProducts: AdminProductRecord[] = demoProducts.map((p) => {
  const categoryMatch = initialCategories.find(c => c.name.toLowerCase() === p.category.toLowerCase())
  return {
    id: p.id,
    category_id: categoryMatch ? categoryMatch.id : null,
    category_name: p.category,
    name: p.name,
    slug: p.slug,
    description: p.description,
    active: true,
    featured: p.badge === 'Bestseller' || p.badge === 'New',
    lead_days: p.lead_days,
    image: p.image,
    variants: p.sizes.map((s, idx) => ({
      id: s.id || `var-${p.id}-${idx + 1}`,
      product_id: p.id,
      name: s.name,
      price_kobo: s.price_kobo,
      active: true,
    })),
    customizations: [
      {
        id: `cust-${p.id}-flavour`,
        product_id: p.id,
        kind: 'flavour',
        label: 'Cake Flavour',
        options: [
          { value: 'vanilla', label: 'Vanilla Bean', fee_kobo: 0 },
          { value: 'chocolate', label: 'Rich Chocolate Ganache', fee_kobo: 200000 },
          { value: 'red-velvet', label: 'Classic Red Velvet', fee_kobo: 250000 },
        ],
        fee_kobo: 0,
        active: true,
      },
      {
        id: `cust-${p.id}-addon`,
        product_id: p.id,
        kind: 'addon',
        label: 'Bakery Add-ons',
        options: [
          { value: 'sparkler', label: 'Gold Sparkler Candle', fee_kobo: 150000 },
          { value: 'topper', label: 'Custom Acrylic Topper', fee_kobo: 350000 },
        ],
        fee_kobo: 0,
        active: true,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
})

// Global singleton for in-memory persistence across requests in demo mode
declare global {
  // eslint-disable-next-line no-var
  var __SPEEDCAKE_LOCAL_CATALOGUE__: LocalStore | undefined
}

function getLocalStore(): LocalStore {
  if (!globalThis.__SPEEDCAKE_LOCAL_CATALOGUE__) {
    globalThis.__SPEEDCAKE_LOCAL_CATALOGUE__ = {
      categories: [...initialCategories],
      products: [...initialProducts],
    }
  }
  return globalThis.__SPEEDCAKE_LOCAL_CATALOGUE__
}

export function isSupabaseConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT') &&
    typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_SUPABASE')
  )
}

// ---------------------------------------------------------------------------
// Category Operations
// ---------------------------------------------------------------------------
export async function getCategories(): Promise<CategoryRecord[]> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    // Compute current live product counts
    return store.categories.map(c => ({
      ...c,
      products_count: store.products.filter(p => p.category_id === c.id).length,
    })).sort((a, b) => a.sort_order - b.sort_order)
  }

  const db = supabaseAdmin()
  const { data: categories, error } = await db
    .from('categories')
    .select('id, name, slug, description, image_url, sort_order, active, created_at, products(id)')
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (categories || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: c.image_url,
    sort_order: c.sort_order,
    active: c.active,
    created_at: c.created_at,
    products_count: Array.isArray(c.products) ? c.products.length : 0,
  }))
}

export async function getCategoryById(id: string): Promise<CategoryRecord | null> {
  const all = await getCategories()
  return all.find(c => c.id === id) || null
}

export async function createCategory(input: CategoryInput): Promise<CategoryRecord> {
  const slug = input.slug.trim().toLowerCase()
  const name = input.name.trim()

  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    if (store.categories.some(c => c.slug.toLowerCase() === slug)) {
      throw new Error(`A category with the slug "${slug}" already exists.`)
    }
    if (store.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A category with the name "${name}" already exists.`)
    }

    const newCat: CategoryRecord = {
      id: crypto.randomUUID(),
      name,
      slug,
      description: input.description?.trim() || null,
      image_url: input.image_url?.trim() || null,
      sort_order: input.sort_order ?? 0,
      active: input.active ?? true,
      created_at: new Date().toISOString(),
      products_count: 0,
    }
    store.categories.push(newCat)
    return newCat
  }

  const db = supabaseAdmin()
  // Check uniqueness
  const { data: existingSlug } = await db.from('categories').select('id').eq('slug', slug).maybeSingle()
  if (existingSlug) throw new Error(`A category with the slug "${slug}" already exists.`)

  const { data: existingName } = await db.from('categories').select('id').ilike('name', name).maybeSingle()
  if (existingName) throw new Error(`A category with the name "${name}" already exists.`)

  const { data, error } = await db
    .from('categories')
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      image_url: input.image_url?.trim() || null,
      sort_order: input.sort_order ?? 0,
      active: input.active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return { ...data, products_count: 0 }
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategoryRecord> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    const index = store.categories.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Category not found')

    if (input.slug) {
      const slug = input.slug.trim().toLowerCase()
      if (store.categories.some(c => c.id !== id && c.slug.toLowerCase() === slug)) {
        throw new Error(`A category with the slug "${slug}" already exists.`)
      }
      store.categories[index].slug = slug
    }

    if (input.name) {
      const name = input.name.trim()
      if (store.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`A category with the name "${name}" already exists.`)
      }
      store.categories[index].name = name
    }

    if (input.description !== undefined) store.categories[index].description = input.description?.trim() || null
    if (input.image_url !== undefined) store.categories[index].image_url = input.image_url?.trim() || null
    if (input.sort_order !== undefined) store.categories[index].sort_order = input.sort_order
    if (input.active !== undefined) store.categories[index].active = input.active

    const cat = store.categories[index]
    cat.products_count = store.products.filter(p => p.category_id === id).length
    return cat
  }

  const db = supabaseAdmin()
  const updates: Record<string, any> = {}

  if (input.slug) {
    const slug = input.slug.trim().toLowerCase()
    const { data: existing } = await db.from('categories').select('id').eq('slug', slug).neq('id', id).maybeSingle()
    if (existing) throw new Error(`A category with the slug "${slug}" already exists.`)
    updates.slug = slug
  }

  if (input.name) {
    const name = input.name.trim()
    const { data: existing } = await db.from('categories').select('id').ilike('name', name).neq('id', id).maybeSingle()
    if (existing) throw new Error(`A category with the name "${name}" already exists.`)
    updates.name = name
  }

  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.image_url !== undefined) updates.image_url = input.image_url?.trim() || null
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order
  if (input.active !== undefined) updates.active = input.active

  const { data, error } = await db.from('categories').update(updates).eq('id', id).select().single()
  if (error) throw error

  const { count } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id)
  return { ...data, products_count: count || 0 }
}

export async function deleteCategory(id: string): Promise<{ ok: true; deletedId: string }> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    const index = store.categories.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Category not found')

    const assignedProducts = store.products.filter(p => p.category_id === id)
    if (assignedProducts.length > 0) {
      throw new Error(
        `Cannot delete "${store.categories[index].name}" because it is currently assigned to ${assignedProducts.length} cake(s). Please deactivate the category or reassign those cakes before deleting.`
      )
    }

    store.categories.splice(index, 1)
    return { ok: true, deletedId: id }
  }

  const db = supabaseAdmin()
  // Check if any product references this category
  const { count, error: countErr } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countErr) throw countErr

  if (count && count > 0) {
    throw new Error(
      `Cannot delete this category because it is currently assigned to ${count} product(s). Please deactivate the category or reassign those products before deleting.`
    )
  }

  const { error } = await db.from('categories').delete().eq('id', id)
  if (error) throw error

  return { ok: true, deletedId: id }
}

// ---------------------------------------------------------------------------
// Product Operations
// ---------------------------------------------------------------------------
export interface ProductFilterQuery {
  search?: string
  categoryId?: string
  status?: 'all' | 'active' | 'inactive'
}

export async function getAdminProducts(filter?: ProductFilterQuery): Promise<AdminProductRecord[]> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    let list = [...store.products]

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
    }

    if (filter?.categoryId) {
      list = list.filter(p => p.category_id === filter.categoryId)
    }

    if (filter?.status === 'active') {
      list = list.filter(p => p.active)
    } else if (filter?.status === 'inactive') {
      list = list.filter(p => !p.active)
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const db = supabaseAdmin()
  let query = db
    .from('products')
    .select('id, category_id, name, slug, description, active, featured, lead_days, created_at, updated_at, categories(id, name), product_images(storage_path, alt, sort_order), product_variants(id, product_id, name, price_kobo, active)')
    .order('created_at', { ascending: false })

  if (filter?.categoryId) {
    query = query.eq('category_id', filter.categoryId)
  }

  if (filter?.status === 'active') {
    query = query.eq('active', true)
  } else if (filter?.status === 'inactive') {
    query = query.eq('active', false)
  }

  const { data, error } = await query
  if (error) throw error

  let items = (data || []).map((p: any) => {
    const images = [...(p.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    let imageUrl = ''
    if (images[0]?.storage_path) {
      if (images[0].storage_path.startsWith('http')) {
        imageUrl = images[0].storage_path
      } else {
        imageUrl = db.storage.from('product-images').getPublicUrl(images[0].storage_path).data.publicUrl
      }
    }

    return {
      id: p.id,
      category_id: p.category_id,
      category_name: (Array.isArray(p.categories) ? (p.categories[0] as any)?.name : (p.categories as any)?.name) || 'Uncategorized',
      name: p.name,
      slug: p.slug,
      description: p.description,
      active: p.active,
      featured: p.featured,
      lead_days: p.lead_days,
      image: imageUrl,
      variants: (p.product_variants || []).map((v: any) => ({
        id: v.id,
        product_id: p.id,
        name: v.name,
        price_kobo: Number(v.price_kobo),
        active: v.active,
      })),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }
  })

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim()
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
  }

  return items
}

export async function getAdminProductById(id: string): Promise<AdminProductRecord | null> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    const p = store.products.find(x => x.id === id)
    return p ? { ...p } : null
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('products')
    .select('id, category_id, name, slug, description, active, featured, lead_days, created_at, updated_at, categories(id, name), product_images(id, storage_path, alt, sort_order), product_variants(id, product_id, name, price_kobo, active), customizations(id, product_id, kind, label, options, fee_kobo, active)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const images = [...(data.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
  let imageUrl = ''
  if (images[0]?.storage_path) {
    if (images[0].storage_path.startsWith('http')) {
      imageUrl = images[0].storage_path
    } else {
      imageUrl = db.storage.from('product-images').getPublicUrl(images[0].storage_path).data.publicUrl
    }
  }

  return {
    id: data.id,
    category_id: data.category_id,
    category_name: (Array.isArray(data.categories) ? (data.categories[0] as any)?.name : (data.categories as any)?.name) || 'Uncategorized',
    name: data.name,
    slug: data.slug,
    description: data.description,
    active: data.active,
    featured: data.featured,
    lead_days: data.lead_days,
    image: imageUrl,
    variants: (data.product_variants || []).map((v: any) => ({
      id: v.id,
      product_id: data.id,
      name: v.name,
      price_kobo: Number(v.price_kobo),
      active: v.active,
    })),
    customizations: (data.customizations || []).map((c: any) => ({
      id: c.id,
      product_id: data.id,
      kind: c.kind,
      label: c.label,
      options: Array.isArray(c.options) ? c.options : [],
      fee_kobo: Number(c.fee_kobo),
      active: c.active,
    })),
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function createProduct(input: ProductInput): Promise<AdminProductRecord> {
  const slug = input.slug.trim().toLowerCase()
  const name = input.name.trim()

  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    if (store.products.some(p => p.slug.toLowerCase() === slug)) {
      throw new Error(`A product with the slug "${slug}" already exists.`)
    }

    const category = store.categories.find(c => c.id === input.category_id)
    const newId = crypto.randomUUID()
    const newVariants: ProductVariantRecord[] = input.variants.map((v, idx) => ({
      id: v.id || `var-${newId}-${idx + 1}`,
      product_id: newId,
      name: v.name.trim(),
      price_kobo: v.price_kobo,
      active: v.active ?? true,
    }))

    const newProduct: AdminProductRecord = {
      id: newId,
      category_id: input.category_id || null,
      category_name: category ? category.name : 'Uncategorized',
      name,
      slug,
      description: input.description.trim(),
      active: input.active ?? true,
      featured: input.featured ?? false,
      lead_days: input.lead_days ?? 2,
      image: input.image?.trim() || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85',
      variants: newVariants,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    store.products.unshift(newProduct)
    return newProduct
  }

  const db = supabaseAdmin()
  // Check slug uniqueness
  const { data: existing } = await db.from('products').select('id').eq('slug', slug).maybeSingle()
  if (existing) throw new Error(`A product with the slug "${slug}" already exists.`)

  // Verify category if supplied
  if (input.category_id) {
    const { data: catCheck } = await db.from('categories').select('id').eq('id', input.category_id).maybeSingle()
    if (!catCheck) throw new Error('The selected category does not exist.')
  }

  // Insert product
  const { data: product, error: prodErr } = await db
    .from('products')
    .insert({
      name,
      slug,
      category_id: input.category_id || null,
      description: input.description.trim(),
      active: input.active ?? true,
      featured: input.featured ?? false,
      lead_days: input.lead_days ?? 2,
    })
    .select('id, name, slug, category_id, description, active, featured, lead_days, created_at, updated_at')
    .single()

  if (prodErr) throw prodErr

  // Insert variants
  const variantsToInsert = input.variants.map(v => ({
    product_id: product.id,
    name: v.name.trim(),
    price_kobo: v.price_kobo,
    active: v.active ?? true,
  }))

  const { data: insertedVariants, error: varErr } = await db
    .from('product_variants')
    .insert(variantsToInsert)
    .select('id, product_id, name, price_kobo, active')

  if (varErr) throw varErr

  // Insert image if provided
  if (input.image?.trim()) {
    await db.from('product_images').insert({
      product_id: product.id,
      storage_path: input.image.trim(),
      alt: name,
      sort_order: 0,
    })
  }

  return getAdminProductById(product.id) as Promise<AdminProductRecord>
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<AdminProductRecord> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    const index = store.products.findIndex(p => p.id === id)
    if (index === -1) throw new Error('Product not found')

    if (input.slug) {
      const slug = input.slug.trim().toLowerCase()
      if (store.products.some(p => p.id !== id && p.slug.toLowerCase() === slug)) {
        throw new Error(`A product with the slug "${slug}" already exists.`)
      }
      store.products[index].slug = slug
    }

    if (input.name) store.products[index].name = input.name.trim()
    if (input.description !== undefined) store.products[index].description = input.description.trim()
    if (input.lead_days !== undefined) store.products[index].lead_days = input.lead_days
    if (input.active !== undefined) store.products[index].active = input.active
    if (input.featured !== undefined) store.products[index].featured = input.featured
    if (input.image !== undefined) store.products[index].image = input.image?.trim() || ''

    if (input.category_id !== undefined) {
      store.products[index].category_id = input.category_id || null
      const cat = store.categories.find(c => c.id === input.category_id)
      store.products[index].category_name = cat ? cat.name : 'Uncategorized'
    }

    if (input.variants && Array.isArray(input.variants)) {
      store.products[index].variants = input.variants.map((v, idx) => ({
        id: v.id || `var-${id}-${idx + 1}`,
        product_id: id,
        name: v.name.trim(),
        price_kobo: v.price_kobo,
        active: v.active ?? true,
      }))
    }

    store.products[index].updated_at = new Date().toISOString()
    return { ...store.products[index] }
  }

  const db = supabaseAdmin()

  // Verify slug uniqueness if slug changed
  if (input.slug) {
    const slug = input.slug.trim().toLowerCase()
    const { data: existing } = await db.from('products').select('id').eq('slug', slug).neq('id', id).maybeSingle()
    if (existing) throw new Error(`A product with the slug "${slug}" already exists.`)
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.name) updates.name = input.name.trim()
  if (input.slug) updates.slug = input.slug.trim().toLowerCase()
  if (input.description !== undefined) updates.description = input.description.trim()
  if (input.category_id !== undefined) updates.category_id = input.category_id || null
  if (input.lead_days !== undefined) updates.lead_days = input.lead_days
  if (input.active !== undefined) updates.active = input.active
  if (input.featured !== undefined) updates.featured = input.featured

  const { error: prodErr } = await db.from('products').update(updates).eq('id', id)
  if (prodErr) throw prodErr

  // Manage variants if provided
  if (input.variants && Array.isArray(input.variants)) {
    // Delete variants removed by the admin, or update/insert
    const incomingIds = input.variants.map(v => v.id).filter(Boolean) as string[]

    if (incomingIds.length > 0) {
      await db.from('product_variants').delete().eq('product_id', id).not('id', 'in', `(${incomingIds.join(',')})`)
    } else {
      await db.from('product_variants').delete().eq('product_id', id)
    }

    for (const v of input.variants) {
      if (v.id) {
        await db
          .from('product_variants')
          .update({ name: v.name.trim(), price_kobo: v.price_kobo, active: v.active ?? true })
          .eq('id', v.id)
      } else {
        await db
          .from('product_variants')
          .insert({ product_id: id, name: v.name.trim(), price_kobo: v.price_kobo, active: v.active ?? true })
      }
    }
  }

  // Manage main image if provided
  if (input.image !== undefined) {
    const imgPath = input.image?.trim() || ''
    const { data: existingImg } = await db.from('product_images').select('id').eq('product_id', id).order('sort_order').limit(1).maybeSingle()
    if (existingImg) {
      await db.from('product_images').update({ storage_path: imgPath }).eq('id', existingImg.id)
    } else if (imgPath) {
      await db.from('product_images').insert({ product_id: id, storage_path: imgPath, alt: input.name || '', sort_order: 0 })
    }
  }

  // Existing customizations on the customizations table are completely preserved!
  return getAdminProductById(id) as Promise<AdminProductRecord>
}

export async function toggleProductActive(id: string, active: boolean): Promise<AdminProductRecord> {
  return updateProduct(id, { active })
}

// ---------------------------------------------------------------------------
// Storefront Query: getPublicProducts
// Returns active cakes with active variants for /cakes and /cakes/[slug]
// ---------------------------------------------------------------------------
export async function getPublicProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const store = getLocalStore()
    return store.products
      .filter(p => p.active)
      .map(p => {
        const activeVariants = p.variants.filter(v => v.active)
        const prices = activeVariants.map(v => v.price_kobo)
        const minPrice = prices.length ? Math.min(...prices) : 0
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category_name,
          price_kobo: minPrice,
          image: p.image,
          badge: p.featured ? 'Featured' : undefined,
          lead_days: p.lead_days,
          sizes: activeVariants.map(v => ({ id: v.id, name: v.name, price_kobo: v.price_kobo })),
          customizations: (p.customizations || []).filter(c => c.active).map(c => ({
            id: c.id,
            kind: c.kind,
            label: c.label,
            required: false,
            options: c.options.map((o: any) => ({
              value: typeof o === 'string' ? o : String(o?.value ?? o?.name ?? o?.label ?? ''),
              label: String(o?.label ?? o?.name ?? o?.value ?? ''),
              fee_kobo: Math.max(0, Number(o?.fee_kobo ?? c.fee_kobo) || 0),
            })),
          })),
        }
      })
      .filter(p => p.sizes.length > 0)
  }

  const db = supabaseAdmin()
  try {
    const { data, error } = await db
      .from('products')
      .select('id, name, slug, description, lead_days, featured, categories(name), product_images(storage_path, alt, sort_order), product_variants(id, name, price_kobo, active), customizations(id, kind, label, options, fee_kobo, active)')
      .eq('active', true)

    if (error) throw error

    return (data || []).map((p: any) => {
      const images = [...(p.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
      let imageUrl = ''
      if (images[0]?.storage_path) {
        if (images[0].storage_path.startsWith('http')) {
          imageUrl = images[0].storage_path
        } else {
          imageUrl = db.storage.from('product-images').getPublicUrl(images[0].storage_path).data.publicUrl
        }
      }

      const activeVariants = (p.product_variants || []).filter((v: any) => v.active)
      const prices = activeVariants.map((v: any) => Number(v.price_kobo))
      const minPrice = prices.length ? Math.min(...prices) : 0

      const customizations = (p.customizations || []).filter((c: any) => c.active).map((c: any) => ({
        id: c.id,
        kind: c.kind,
        label: c.label,
        required: false,
        options: Array.isArray(c.options)
          ? c.options.map((o: any) => {
              const value = typeof o === 'string' ? o : String(o?.value ?? o?.name ?? o?.label ?? '')
              return {
                value,
                label: String(o?.label ?? o?.name ?? value),
                fee_kobo: Math.max(0, Number(o?.fee_kobo ?? c.fee_kobo) || 0),
              }
            }).filter((o: any) => o.value)
          : [],
      }))

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: (Array.isArray(p.categories) ? (p.categories[0] as any)?.name : (p.categories as any)?.name) || 'Cakes',
        description: p.description,
        price_kobo: minPrice,
        image: imageUrl,
        badge: p.featured ? 'Featured' : undefined,
        lead_days: p.lead_days,
        sizes: activeVariants.map((v: any) => ({ id: v.id, name: v.name, price_kobo: Number(v.price_kobo) })),
        customizations,
      } as Product
    }).filter((p: Product) => p.sizes.length > 0)
  } catch (err) {
    console.error('Error fetching public products:', err)
    return []
  }
}
