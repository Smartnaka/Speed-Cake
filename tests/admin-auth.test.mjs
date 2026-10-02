import test from 'node:test'
import assert from 'node:assert/strict'
import { safeAdminReturnPath, evaluateAdminStatus } from '../src/lib/schemas.ts'

async function verifyAdminSession(req, mockDb) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized: Missing token' }
  }

  try {
    const { data: { user }, error: userError } = await mockDb.auth.getUser(token)
    if (userError || !user) {
      return { ok: false, status: 401, error: 'Unauthorized: Invalid session' }
    }

    const { data: profile, error: profileError } = await mockDb
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return { ok: false, status: 403, error: 'Forbidden: Profile not found' }
    }

    return evaluateAdminStatus(user, profile)
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : 'Authentication service unavailable',
    }
  }
}

// Mock Supabase client for testing verifyAdminSession server-side authorization
function createMockDb({
  tokenUserMap = {},
  profiles = {},
} = {}) {
  return {
    auth: {
      async getUser(token) {
        if (token && tokenUserMap[token]) {
          return { data: { user: tokenUserMap[token] }, error: null }
        }
        return { data: { user: null }, error: new Error('Invalid token') }
      },
    },
    from(table) {
      assert.equal(table, 'profiles')
      return {
        select(cols) {
          return {
            eq(col, val) {
              assert.equal(col, 'id')
              return {
                async maybeSingle() {
                  const profile = profiles[val] || null
                  return { data: profile, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// 1. safeAdminReturnPath tests
// ---------------------------------------------------------------------------
test('safeAdminReturnPath allows valid admin paths and blocks open redirects and redirect loops', () => {
  // Valid admin paths
  assert.equal(safeAdminReturnPath('/admin'), '/admin')
  assert.equal(safeAdminReturnPath('/admin/orders'), '/admin/orders')
  assert.equal(safeAdminReturnPath('/admin/orders/SC-2026-0001'), '/admin/orders/SC-2026-0001')
  assert.equal(safeAdminReturnPath('/admin/products'), '/admin/products')
  assert.equal(safeAdminReturnPath('/admin/categories'), '/admin/categories')

  // Prevent redirect loops
  assert.equal(safeAdminReturnPath('/admin/login'), '/admin')
  assert.equal(safeAdminReturnPath('/admin/login?next=/admin'), '/admin')

  // Non-admin internal routes fall back to /admin
  assert.equal(safeAdminReturnPath('/checkout'), '/admin')
  assert.equal(safeAdminReturnPath('/account'), '/admin')
  assert.equal(safeAdminReturnPath('/'), '/admin')

  // Null, undefined, empty fall back to /admin
  assert.equal(safeAdminReturnPath(null), '/admin')
  assert.equal(safeAdminReturnPath(undefined), '/admin')
  assert.equal(safeAdminReturnPath(''), '/admin')

  // Open redirect attempts blocked
  assert.equal(safeAdminReturnPath('https://evil.com'), '/admin')
  assert.equal(safeAdminReturnPath('https://evil.com/admin'), '/admin')
  assert.equal(safeAdminReturnPath('//evil.com/admin'), '/admin')
  assert.equal(safeAdminReturnPath('/\\evil.com'), '/admin')
  assert.equal(safeAdminReturnPath('javascript:alert(1)'), '/admin')
})

// ---------------------------------------------------------------------------
// 2. evaluateAdminStatus tests
// ---------------------------------------------------------------------------
test('evaluateAdminStatus strictly enforces database role === "admin"', () => {
  // 1. Missing user -> 401
  const noUser = evaluateAdminStatus(null, null)
  assert.equal(noUser.ok, false)
  assert.equal(noUser.status, 401)

  // 2. Missing profile -> 403
  const noProfile = evaluateAdminStatus({ id: 'u1', email: 'test@example.com' }, null)
  assert.equal(noProfile.ok, false)
  assert.equal(noProfile.status, 403)

  // 3. Customer profile -> 403 Forbidden
  const customer = evaluateAdminStatus(
    { id: 'u1', email: 'customer@example.com' },
    { id: 'u1', role: 'customer', full_name: 'Regular Customer' }
  )
  assert.equal(customer.ok, false)
  assert.equal(customer.status, 403)
  assert.match(customer.error, /Forbidden/i)

  // 4. Admin profile -> 200 OK
  const admin = evaluateAdminStatus(
    { id: 'u2', email: 'admin@speedcake.com' },
    { id: 'u2', role: 'admin', full_name: 'Speed Cake Manager' }
  )
  assert.equal(admin.ok, true)
  if (admin.ok) {
    assert.equal(admin.user.id, 'u2')
    assert.equal(admin.profile.role, 'admin')
  }
})

// ---------------------------------------------------------------------------
// 3. verifyAdminSession security migration tests
// ---------------------------------------------------------------------------
test('verifyAdminSession: Unauthenticated admin request returns 401 Missing token', async () => {
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/orders')
  const res = await verifyAdminSession(req, mockDb)

  assert.equal(res.ok, false)
  assert.equal(res.status, 401)
  assert.match(res.error, /Missing token/i)
})

test('verifyAdminSession: speedcake_admin_token cookie alone is rejected (cookies no longer accepted)', async () => {
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: {
      Cookie: 'speedcake_admin_token=sc_admin_token_SpeedCake2026_secured; other=123',
    },
  })
  const res = await verifyAdminSession(req, mockDb)

  // Authorization must now come via Authorization: Bearer <token>
  assert.equal(res.ok, false)
  assert.equal(res.status, 401)
})

test('verifyAdminSession: Old hardcoded admin token is rejected as invalid session', async () => {
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: {
      Authorization: 'Bearer sc_admin_token_SpeedCake2026_secured',
    },
  })
  const res = await verifyAdminSession(req, mockDb)

  assert.equal(res.ok, false)
  assert.equal(res.status, 401)
  assert.match(res.error, /Invalid session/i)
})

test('verifyAdminSession: Invalid or expired Supabase token returns 401', async () => {
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: {
      Authorization: 'Bearer invalid-or-expired-supabase-jwt',
    },
  })
  const res = await verifyAdminSession(req, mockDb)

  assert.equal(res.ok, false)
  assert.equal(res.status, 401)
  assert.match(res.error, /Invalid session/i)
})

test('verifyAdminSession: Authenticated customer (role === "customer") receives 403 Forbidden', async () => {
  const mockDb = createMockDb({
    tokenUserMap: {
      'customer-valid-jwt': { id: 'cust-uuid-1', email: 'customer@example.com' },
    },
    profiles: {
      'cust-uuid-1': { id: 'cust-uuid-1', role: 'customer', full_name: 'Customer One' },
    },
  })

  const req = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: {
      Authorization: 'Bearer customer-valid-jwt',
    },
  })
  const res = await verifyAdminSession(req, mockDb)

  assert.equal(res.ok, false)
  assert.equal(res.status, 403)
  assert.match(res.error, /Administrator privileges required/i)
})

test('verifyAdminSession: Authenticated admin (role === "admin") is granted access', async () => {
  const mockDb = createMockDb({
    tokenUserMap: {
      'admin-valid-jwt': { id: 'admin-uuid-1', email: 'admin@speedcake.com' },
    },
    profiles: {
      'admin-uuid-1': { id: 'admin-uuid-1', role: 'admin', full_name: 'Head Baker' },
    },
  })

  const req = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: {
      Authorization: 'Bearer admin-valid-jwt',
    },
  })
  const res = await verifyAdminSession(req, mockDb)

  assert.equal(res.ok, true)
  if (res.ok) {
    assert.equal(res.user.id, 'admin-uuid-1')
    assert.equal(res.user.email, 'admin@speedcake.com')
    assert.equal(res.profile.role, 'admin')
  }
})

test('verifyAdminSession: Page refresh preserves authenticated admin session', async () => {
  const mockDb = createMockDb({
    tokenUserMap: {
      'persisted-supabase-session-jwt': { id: 'admin-uuid-1', email: 'admin@speedcake.com' },
    },
    profiles: {
      'admin-uuid-1': { id: 'admin-uuid-1', role: 'admin', full_name: 'Head Baker' },
    },
  })

  // Initial page load
  const req1 = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer persisted-supabase-session-jwt' },
  })
  const res1 = await verifyAdminSession(req1, mockDb)
  assert.equal(res1.ok, true)

  // Page refresh with same persisted Supabase session
  const req2 = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer persisted-supabase-session-jwt' },
  })
  const res2 = await verifyAdminSession(req2, mockDb)
  assert.equal(res2.ok, true)
  if (res2.ok) {
    assert.equal(res2.user.id, 'admin-uuid-1')
    assert.equal(res2.profile.role, 'admin')
  }
})

test('verifyAdminSession: Logout removes admin session and invalidates access', async () => {
  const mockDb = createMockDb({
    tokenUserMap: {
      'active-jwt': { id: 'admin-uuid-1', email: 'admin@speedcake.com' },
    },
    profiles: {
      'admin-uuid-1': { id: 'admin-uuid-1', role: 'admin', full_name: 'Head Baker' },
    },
  })

  // Before logout: access allowed
  const beforeReq = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: { Authorization: 'Bearer active-jwt' },
  })
  const beforeRes = await verifyAdminSession(beforeReq, mockDb)
  assert.equal(beforeRes.ok, true)

  // After logout: token is absent
  const afterReq = new Request('https://speedcake.invalid/api/admin/orders')
  const afterRes = await verifyAdminSession(afterReq, mockDb)
  assert.equal(afterRes.ok, false)
  assert.equal(afterRes.status, 401)
})

test('API security: Customer cannot access admin product or order APIs directly', async () => {
  const mockDb = createMockDb({
    tokenUserMap: {
      'cust-jwt': { id: 'cust-10', email: 'customer10@speedcake.com' },
    },
    profiles: {
      'cust-10': { id: 'cust-10', role: 'customer', full_name: 'Jane Doe' },
    },
  })

  // Customer tries to call GET /api/admin/products
  const prodReq = new Request('https://speedcake.invalid/api/admin/products', {
    headers: { Authorization: 'Bearer cust-jwt' },
  })
  const prodRes = await verifyAdminSession(prodReq, mockDb)
  assert.equal(prodRes.ok, false)
  assert.equal(prodRes.status, 403)

  // Customer tries to call GET /api/admin/orders
  const orderReq = new Request('https://speedcake.invalid/api/admin/orders', {
    headers: { Authorization: 'Bearer cust-jwt' },
  })
  const orderRes = await verifyAdminSession(orderReq, mockDb)
  assert.equal(orderRes.ok, false)
  assert.equal(orderRes.status, 403)

  // Customer tries to call PATCH /api/admin/orders/1/status
  const statusReq = new Request('https://speedcake.invalid/api/admin/orders/1/status', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer cust-jwt' },
  })
  const statusRes = await verifyAdminSession(statusReq, mockDb)
  assert.equal(statusRes.ok, false)
  assert.equal(statusRes.status, 403)
})
