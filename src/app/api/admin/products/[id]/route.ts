import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { productInputSchema } from '@/lib/schemas'
import { getAdminProductById, updateProduct } from '@/lib/catalogue-db'

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(extractRequestWithAuth(req))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const product = await getAdminProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, product })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(extractRequestWithAuth(req))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = productInputSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateProduct(params.id, parsed.data)
    return NextResponse.json({ ok: true, product: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update product'
    const status = message.includes('already exists') ? 409 : message.includes('not found') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
