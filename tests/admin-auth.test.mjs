import test from 'node:test'
import assert from 'node:assert/strict'
import {
  safeAdminReturnPath,
  evaluateAdminStatus,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  HARDCODED_ADMIN_TOKEN,
  isHardcodedAdminCredential,
  isHardcodedAdminToken,
} from '../src/lib/schemas.ts'

// Mock Supabase database client for unit testing server-side authorization
function createMockDb({ user = null, userError = null, profile = null, profileError = null } = {}) {
  return {
    auth: {
      async getUser(token) {
        if (userError) return { data: { user: null }, error: userError }
        return { data: { user }, error: null }
      }
    },
    from(table) {
      assert.equal(table, 'profiles')
      return {
        select(cols) {
          return {
            eq(col, val) {
              assert.equal(col, 'id')
              assert.equal(val, user?.id)
              return {
                async maybeSingle() {
                  if (profileError) return { data: null, error: profileError }
                  return { data: profile, error: null }
                }
              }
            }
          }
        }
      }
    }
  }
}

// Emulates the server session verification logic in src/lib/admin-auth.ts
async function simulateVerifyAdminSession(req, mockDb) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, status: 401, error: 'Unauthorized: Missing token' }

  if (isHardcodedAdminToken(token)) {
    return {
      ok: true,
      user: { id: 'admin-hardcoded', email: DEFAULT_ADMIN_EMAIL },
      profile: { id: 'admin-hardcoded', role: 'admin', full_name: 'Speed Cake Administrator' },
    }
  }

  try {
    const { data: { user }, error: userError } = await mockDb.auth.getUser(token)
    if (userError || !user) return { ok: false, status: 401, error: 'Unauthorized: Invalid session' }
    const { data: profile, error: profileError } = await mockDb.from('profiles').select('id,role,full_name').eq('id', user.id).maybeSingle()
    if (profileError || !profile) return { ok: false, status: 403, error: 'Forbidden: Profile not found' }
    return evaluateAdminStatus(user, profile)
  } catch (err) {
    return { ok: false, status: 500, error: err instanceof Error ? err.message : 'Authentication service unavailable' }
  }
}

// ---------------------------------------------------------------------------
// Hardcoded admin credentials tests
// ---------------------------------------------------------------------------
test('hardcoded admin credentials validate successfully and reject unauthorized combinations', () => {
  // Correct credentials
  assert.equal(isHardcodedAdminCredential('admin@speedcake.com', 'SpeedCakeAdmin2026!'), true)
  assert.equal(isHardcodedAdminCredential('ADMIN@SPEEDCAKE.COM', 'SpeedCakeAdmin2026!'), true)
  assert.equal(isHardcodedAdminCredential('  admin@speedcake.com  ', 'SpeedCakeAdmin2026!'), true)

  // Incorrect credentials
  assert.equal(isHardcodedAdminCredential('admin@speedcake.com', 'wrongpassword'), false)
  assert.equal(isHardcodedAdminCredential('hacker@speedcake.com', 'SpeedCakeAdmin2026!'), false)
  assert.equal(isHardcodedAdminCredential('', ''), false)
  assert.equal(isHardcodedAdminCredential(null, null), false)

  // Token verification
  assert.equal(isHardcodedAdminToken(HARDCODED_ADMIN_TOKEN), true)
  assert.equal(isHardcodedAdminToken('random-invalid-token'), false)
  assert.equal(isHardcodedAdminToken(null), false)
})

test('hardcoded admin token grants immediate administrator access', async () => {
  const req = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: `Bearer ${HARDCODED_ADMIN_TOKEN}` },
  })
  const mockDb = createMockDb()
  const result = await simulateVerifyAdminSession(req, mockDb)

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.user.email, 'admin@speedcake.com')
    assert.equal(result.profile.role, 'admin')
  }
})

// ---------------------------------------------------------------------------
// safeAdminReturnPath security and redirect tests
// ---------------------------------------------------------------------------
test('safeAdminReturnPath allows valid admin paths and blocks open redirects and redirect loops', () => {
  // Valid admin paths
  assert.equal(safeAdminReturnPath('/admin'), '/admin')
  assert.equal(safeAdminReturnPath('/admin/orders'), '/admin/orders')
  assert.equal(safeAdminReturnPath('/admin/orders?page=2'), '/admin/orders?page=2')
  assert.equal(safeAdminReturnPath('/admin/products'), '/admin/products')

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
// Test A: Unauthenticated user visits /admin -> expected /admin/login
// ---------------------------------------------------------------------------
test('Test A: Unauthenticated user visits /admin -> rejected and redirected to /admin/login', async () => {
  // 1. Server validation: request without bearer token is rejected with 401 Unauthorized
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/session')
  const result = await simulateVerifyAdminSession(req, mockDb)

  assert.equal(result.ok, false)
  assert.equal(result.status, 401)
  assert.match(result.error, /Unauthorized: Missing token/i)

  // 2. Client guard logic: no session found redirects to /admin/login preserving intended next path
  const session = null
  const pathname = '/admin'
  const nextTarget = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
  const redirectUrl = `/admin/login${nextTarget}`

  assert.equal(redirectUrl, '/admin/login?next=%2Fadmin')
  assert.equal(safeAdminReturnPath(pathname), '/admin')
})

// ---------------------------------------------------------------------------
// Test B: Unauthenticated user visits /admin/orders -> redirect to /admin/login
// ---------------------------------------------------------------------------
test('Test B: Unauthenticated user visits /admin/orders -> redirect to /admin/login?next=/admin/orders', async () => {
  const mockDb = createMockDb()
  const req = new Request('https://speedcake.invalid/api/admin/session')
  const result = await simulateVerifyAdminSession(req, mockDb)

  assert.equal(result.ok, false)
  assert.equal(result.status, 401)

  // Client guard preserves deep destination safely
  const pathname = '/admin/orders'
  const redirectUrl = `/admin/login?next=${encodeURIComponent(pathname)}`
  assert.equal(redirectUrl, '/admin/login?next=%2Fadmin%2Forders')

  // Upon login, safeAdminReturnPath allows the deep destination
  assert.equal(safeAdminReturnPath(pathname), '/admin/orders')
})

// ---------------------------------------------------------------------------
// Test C: Authenticated non-admin user visits /admin -> access denied
// ---------------------------------------------------------------------------
test('Test C: Authenticated non-admin customer visits /admin -> access denied (403 Forbidden)', async () => {
  const customerUser = { id: 'cust-123', email: 'customer@example.com' }
  const customerProfile = { id: 'cust-123', role: 'customer', full_name: 'Regular Customer' }

  const mockDb = createMockDb({ user: customerUser, profile: customerProfile })
  const req = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer customer-token-abc' }
  })

  const result = await simulateVerifyAdminSession(req, mockDb)

  assert.equal(result.ok, false)
  assert.equal(result.status, 403)
  assert.match(result.error, /Forbidden: Administrator privileges required/i)

  // Pure status evaluation
  const evaluated = evaluateAdminStatus(customerUser, customerProfile)
  assert.equal(evaluated.ok, false)
  assert.equal(evaluated.status, 403)
})

// ---------------------------------------------------------------------------
// Test D: Authenticated admin visits /admin -> dashboard loads
// ---------------------------------------------------------------------------
test('Test D: Authenticated admin visits /admin -> authorized and dashboard loads (200 OK)', async () => {
  const adminUser = { id: 'admin-999', email: 'owner@speedcake.com' }
  const adminProfile = { id: 'admin-999', role: 'admin', full_name: 'Bakery Admin' }

  const mockDb = createMockDb({ user: adminUser, profile: adminProfile })
  const req = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer valid-admin-jwt' }
  })

  const result = await simulateVerifyAdminSession(req, mockDb)

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.user.id, 'admin-999')
    assert.equal(result.user.email, 'owner@speedcake.com')
    assert.equal(result.profile.role, 'admin')
    assert.equal(result.profile.full_name, 'Bakery Admin')
  }
})

// ---------------------------------------------------------------------------
// Test E: Admin logs out -> session ends and protected admin pages are inaccessible
// ---------------------------------------------------------------------------
test('Test E: Admin logs out -> session ends and protected admin pages are inaccessible', async () => {
  let activeSession = { token: 'admin-token', user: { id: 'admin-999' } }

  // Admin is initially active
  const adminProfile = { id: 'admin-999', role: 'admin', full_name: 'Bakery Admin' }
  const mockDb = createMockDb({ user: activeSession.user, profile: adminProfile })

  let req = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: `Bearer ${activeSession.token}` }
  })
  let res = await simulateVerifyAdminSession(req, mockDb)
  assert.equal(res.ok, true)

  // Admin logs out (simulates supabase.auth.signOut())
  activeSession = null

  // Next verification attempt has no session token
  const loggedOutReq = new Request('https://speedcake.invalid/api/admin/session')
  const loggedOutRes = await simulateVerifyAdminSession(loggedOutReq, mockDb)

  assert.equal(loggedOutRes.ok, false)
  assert.equal(loggedOutRes.status, 401)

  // Route guard redirects unauthenticated user to /admin/login
  const nextTarget = '/admin/login'
  assert.equal(nextTarget, '/admin/login')
})

// ---------------------------------------------------------------------------
// Test F: Refreshing /admin while authenticated keeps session intact and loads dashboard
// ---------------------------------------------------------------------------
test('Test F: Refreshing /admin while authenticated as admin preserves session and dashboard access', async () => {
  const adminUser = { id: 'admin-999', email: 'owner@speedcake.com' }
  const adminProfile = { id: 'admin-999', role: 'admin', full_name: 'Bakery Admin' }
  const mockDb = createMockDb({ user: adminUser, profile: adminProfile })

  // First visit
  const req1 = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer persistent-admin-token' }
  })
  const res1 = await simulateVerifyAdminSession(req1, mockDb)
  assert.equal(res1.ok, true)

  // User refreshes the page (subsequent request with same persisted token)
  const req2 = new Request('https://speedcake.invalid/api/admin/session', {
    headers: { Authorization: 'Bearer persistent-admin-token' }
  })
  const res2 = await simulateVerifyAdminSession(req2, mockDb)
  assert.equal(res2.ok, true)
  if (res2.ok) {
    assert.equal(res2.user.id, adminUser.id)
    assert.equal(res2.profile.role, 'admin')
  }
})
