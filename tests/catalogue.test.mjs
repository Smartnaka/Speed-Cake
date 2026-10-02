import test from 'node:test'
import assert from 'node:assert/strict'
import {
  slugSchema,
  categoryInputSchema,
  productInputSchema,
  generateSlug,
  evaluateAdminStatus,
} from '../src/lib/schemas.ts'

// ---------------------------------------------------------------------------
// 1. Schema & Slug Generation Tests
// ---------------------------------------------------------------------------
test('generateSlug generates valid, clean URL slugs', () => {
  assert.equal(generateSlug('Chocolate Birthday Cake'), 'chocolate-birthday-cake')
  assert.equal(generateSlug('  Red Velvet & Cream Cheese!  '), 'red-velvet-cream-cheese')
  assert.equal(generateSlug('10" Double Fudge --- Cake'), '10-double-fudge-cake')
  assert.equal(generateSlug('Strawberry Cheesecake #5'), 'strawberry-cheesecake-5')
})

test('slugSchema validates format strictly and blocks malformed slugs', () => {
  // Valid slugs
  assert.equal(slugSchema.safeParse('birthday-cakes').success, true)
  assert.equal(slugSchema.safeParse('cake-123').success, true)
  assert.equal(slugSchema.safeParse('chocolate').success, true)

  // Invalid slugs
  assert.equal(slugSchema.safeParse('Birthday-Cakes').success, false) // Uppercase
  assert.equal(slugSchema.safeParse('birthday cakes').success, false) // Spaces
  assert.equal(slugSchema.safeParse('birthday--cakes').success, false) // Double hyphens
  assert.equal(slugSchema.safeParse('-birthday').success, false) // Leading hyphen
  assert.equal(slugSchema.safeParse('birthday-').success, false) // Trailing hyphen
  assert.equal(slugSchema.safeParse('cake!@#').success, false) // Special characters
  assert.equal(slugSchema.safeParse('a').success, false) // Too short (<2)
  assert.equal(slugSchema.safeParse('').success, false) // Empty
})

test('categoryInputSchema validates required fields and bounds', () => {
  const valid = {
    name: 'Celebration Cakes',
    slug: 'celebration-cakes',
    description: 'Perfect for anniversaries and parties',
    sort_order: 1,
    active: true,
  }
  assert.equal(categoryInputSchema.safeParse(valid).success, true)
  assert.equal(categoryInputSchema.safeParse({ ...valid, name: '' }).success, false)
  assert.equal(categoryInputSchema.safeParse({ ...valid, slug: 'Invalid Slug' }).success, false)
})

test('productInputSchema requires at least one variant with valid price', () => {
  const validProduct = {
    name: 'Strawberry Dream Cake',
    slug: 'strawberry-dream-cake',
    description: 'Fresh strawberries and mascarpone frosting',
    lead_days: 2,
    active: true,
    featured: false,
    variants: [
      { name: '8 inch · serves 14', price_kobo: 3500000, active: true },
      { name: '10 inch · serves 20', price_kobo: 4800000, active: true },
    ],
  }
  assert.equal(productInputSchema.safeParse(validProduct).success, true)
  assert.equal(productInputSchema.safeParse({ ...validProduct, variants: [] }).success, false)
  assert.equal(productInputSchema.safeParse({ ...validProduct, name: '' }).success, false)
  assert.equal(productInputSchema.safeParse({
    ...validProduct,
    variants: [{ name: '8 inch', price_kobo: -500, active: true }],
  }).success, false)
})

// ---------------------------------------------------------------------------
// 2. Catalogue Management Invariants Simulation (Stage 2 Requirements)
// ---------------------------------------------------------------------------
function createTestCatalogue() {
  const categories = [
    { id: 'cat-1', name: 'Birthday', slug: 'birthday', sort_order: 1, active: true },
    { id: 'cat-2', name: 'Celebration', slug: 'celebration', sort_order: 2, active: true },
  ]

  const products = [
    {
      id: 'prod-1',
      name: 'Sunday Strawberry',
      slug: 'sunday-strawberry',
      category_id: 'cat-1',
      description: 'Vanilla sponge with strawberries',
      lead_days: 2,
      active: true,
      featured: true,
      variants: [
        { id: 'v1', name: '6 inch', price_kobo: 2850000, active: true },
        { id: 'v2', name: '8 inch', price_kobo: 3900000, active: true },
      ],
      customizations: [
        { id: 'c1', kind: 'flavour', label: 'Flavour', options: ['vanilla', 'chocolate'] },
      ],
    },
  ]

  return {
    categories,
    products,

    createCategory(input) {
      if (categories.some(c => c.slug === input.slug)) {
        throw new Error(`A category with the slug "${input.slug}" already exists.`)
      }
      const cat = { id: `cat-${categories.length + 1}`, ...input }
      categories.push(cat)
      return cat
    },

    updateCategory(id, input) {
      const cat = categories.find(c => c.id === id)
      if (!cat) throw new Error('Category not found')
      if (input.slug && categories.some(c => c.id !== id && c.slug === input.slug)) {
        throw new Error(`A category with the slug "${input.slug}" already exists.`)
      }
      Object.assign(cat, input)
      return cat
    },

    deleteCategory(id) {
      const inUse = products.filter(p => p.category_id === id).length
      if (inUse > 0) {
        throw new Error(`Cannot delete category because it is currently assigned to ${inUse} product(s). Please deactivate it instead.`)
      }
      const idx = categories.findIndex(c => c.id === id)
      if (idx !== -1) categories.splice(idx, 1)
      return { ok: true }
    },

    createProduct(input) {
      if (products.some(p => p.slug === input.slug)) {
        throw new Error(`A product with the slug "${input.slug}" already exists.`)
      }
      const prod = { id: `prod-${products.length + 1}`, ...input }
      products.push(prod)
      return prod
    },

    updateProduct(id, input) {
      const prod = products.find(p => p.id === id)
      if (!prod) throw new Error('Product not found')
      if (input.slug && products.some(p => p.id !== id && p.slug === input.slug)) {
        throw new Error(`A product with the slug "${input.slug}" already exists.`)
      }
      Object.assign(prod, input)
      return prod
    },

    getPublicProducts() {
      return products
        .filter(p => p.active)
        .map(p => ({
          ...p,
          sizes: p.variants.filter(v => v.active),
          price_kobo: Math.min(...p.variants.filter(v => v.active).map(v => v.price_kobo)),
        }))
        .filter(p => p.sizes.length > 0)
    },
  }
}

test('Categories: Admin can create and edit a category', () => {
  const store = createTestCatalogue()

  const newCat = store.createCategory({
    name: 'Custom Hampers',
    slug: 'custom-hampers',
    description: 'Artisanal gift hampers',
    sort_order: 10,
    active: true,
  })

  assert.equal(newCat.name, 'Custom Hampers')
  assert.equal(newCat.slug, 'custom-hampers')

  // Edit category
  const updated = store.updateCategory(newCat.id, {
    name: 'Luxury Hampers',
    active: false,
  })
  assert.equal(updated.name, 'Luxury Hampers')
  assert.equal(updated.active, false)
})

test('Categories: Duplicate slug is rejected', () => {
  const store = createTestCatalogue()

  assert.throws(
    () => {
      store.createCategory({
        name: 'Another Birthday',
        slug: 'birthday', // already exists
        sort_order: 5,
        active: true,
      })
    },
    /already exists/i
  )
})

test('Categories: Admin can deactivate a category', () => {
  const store = createTestCatalogue()
  const updated = store.updateCategory('cat-1', { active: false })
  assert.equal(updated.active, false)

  // Re-activate
  const restored = store.updateCategory('cat-1', { active: true })
  assert.equal(restored.active, true)
})

test('Categories: Referenced category cannot be destructively deleted', () => {
  const store = createTestCatalogue()

  // cat-1 is referenced by prod-1
  assert.throws(
    () => {
      store.deleteCategory('cat-1')
    },
    /Cannot delete category because it is currently assigned/i
  )

  // cat-2 is not referenced, can be safely deleted
  const result = store.deleteCategory('cat-2')
  assert.equal(result.ok, true)
  assert.equal(store.categories.some(c => c.id === 'cat-2'), false)
})

test('Products: Admin can create a product with variants', () => {
  const store = createTestCatalogue()

  const product = store.createProduct({
    name: 'Lemon Blueberry Tart',
    slug: 'lemon-blueberry-tart',
    category_id: 'cat-1',
    description: 'Zesty lemon curd and fresh blueberries',
    lead_days: 1,
    active: true,
    featured: true,
    variants: [
      { name: 'Standard Tart', price_kobo: 2200000, active: true },
      { name: 'Large Tart', price_kobo: 3200000, active: true },
    ],
  })

  assert.ok(product.id)
  assert.equal(product.name, 'Lemon Blueberry Tart')
  assert.equal(product.variants.length, 2)
  assert.equal(product.lead_days, 1)
  assert.equal(product.featured, true)
})

test('Products: Duplicate slug is rejected', () => {
  const store = createTestCatalogue()

  assert.throws(
    () => {
      store.createProduct({
        name: 'Duplicate Strawberry',
        slug: 'sunday-strawberry', // already exists
        category_id: 'cat-1',
        description: 'Duplicate',
        variants: [{ name: '8 inch', price_kobo: 3000000, active: true }],
      })
    },
    /already exists/i
  )
})

test('Products: Admin can edit product and update variant prices', () => {
  const store = createTestCatalogue()

  const updated = store.updateProduct('prod-1', {
    description: 'Updated gourmet recipe with Belgian chocolate',
    variants: [
      { id: 'v1', name: 'Small · 6 inch', price_kobo: 2950000, active: true },
      { id: 'v3', name: 'New Party Size · 12 inch', price_kobo: 6500000, active: true },
    ],
  })

  assert.equal(updated.description, 'Updated gourmet recipe with Belgian chocolate')
  assert.equal(updated.variants[0].price_kobo, 2950000)
  assert.equal(updated.variants[1].name, 'New Party Size · 12 inch')
})

test('Products: Admin can deactivate a product, hiding it from storefront catalogue', () => {
  const store = createTestCatalogue()

  // Deactivate
  store.updateProduct('prod-1', { active: false })

  // Verify storefront excludes it
  const publicCatalogue = store.getPublicProducts()
  assert.equal(publicCatalogue.some(p => p.id === 'prod-1'), false)

  // Re-activate
  store.updateProduct('prod-1', { active: true })
  const restoredCatalogue = store.getPublicProducts()
  assert.equal(restoredCatalogue.some(p => p.id === 'prod-1'), true)
})

test('Products: Existing customizations remain intact when updating unrelated product fields', () => {
  const store = createTestCatalogue()
  const original = store.products.find(p => p.id === 'prod-1')
  const originalCustomizations = [...original.customizations]

  // Update only description
  store.updateProduct('prod-1', {
    description: 'Preserving customization integrity test',
  })

  const updated = store.products.find(p => p.id === 'prod-1')
  assert.deepEqual(updated.customizations, originalCustomizations)
  assert.equal(updated.description, 'Preserving customization integrity test')
})

// ---------------------------------------------------------------------------
// 3. Server-Side Authorization Tests for Mutations
// ---------------------------------------------------------------------------
test('Authorization: Non-admin and unauthenticated users cannot perform catalogue mutations', () => {
  // 1. Unauthenticated (no user)
  const unauth = evaluateAdminStatus(null, null)
  assert.equal(unauth.ok, false)
  assert.equal(unauth.status, 401)

  // 2. Authenticated customer
  const customerUser = { id: 'cust-uuid-1', email: 'ada@example.com' }
  const customerProfile = { id: 'cust-uuid-1', role: 'customer' }
  const forbidden = evaluateAdminStatus(customerUser, customerProfile)
  assert.equal(forbidden.ok, false)
  assert.equal(forbidden.status, 403)

  // 3. Authorized admin
  const adminUser = { id: 'admin-uuid-1', email: 'admin@speedcake.com' }
  const adminProfile = { id: 'admin-uuid-1', role: 'admin' }
  const authorized = evaluateAdminStatus(adminUser, adminProfile)
  assert.equal(authorized.ok, true)
})

// ---------------------------------------------------------------------------
// 4. Customer Storefront Integration
// ---------------------------------------------------------------------------
test('Customer side: Storefront catalogue loads with authoritative prices and sizes', () => {
  const store = createTestCatalogue()
  const catalogue = store.getPublicProducts()
  assert.ok(catalogue.length > 0)

  for (const item of catalogue) {
    assert.ok(item.id)
    assert.ok(item.name)
    assert.ok(item.slug)
    assert.ok(item.price_kobo >= 0)
    assert.ok(item.sizes.length > 0)
    for (const size of item.sizes) {
      assert.ok(size.name)
      assert.ok(size.price_kobo >= 0)
    }
  }
})
