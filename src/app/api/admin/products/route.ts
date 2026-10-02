import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { productInputSchema } from '@/lib/schemas'
import { getAdminProducts, createProduct } from '@/lib/catalogue-db'

function extractRequestWithAuth(req: Request): Request {
  const authHeader = req.headers.get('authorization')
  if (authHeader) return req

  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/speedcake_admin_token=([^;]+)/)
  if (match && match[1]) {
    const headers = new Headers(req.headers)
    headers.set('authorization', `Bearer ${decodeURIComponent(match[1])}`)
    return new Request(req.url, { headers, method: req.method, body: req.body })
  }
  return req
}

export async function GET(req: Request) {
  const auth = await verifyAdminSession(extractRequestWithAuth(req))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('q') || url.searchParams.get('search') || undefined
    const categoryId = url.searchParams.get('category') || undefined
    const statusParam = url.searchParams.get('status')
    const status = statusParam === 'active' || statusParam === 'inactive' ? statusParam : 'all'

    const products = await getAdminProducts({ search, categoryId, status })
    return NextResponse.json({ ok: true, products })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession(extractRequestWithAuth(req))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = productInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const product = await createProduct(parsed.data)
    return NextResponse.json({ ok: true, product }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create product'
    const status = message.includes('already exists') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
