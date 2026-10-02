import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { categoryInputSchema } from '@/lib/schemas'
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/catalogue-db'

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
    const category = await getCategoryById(params.id)
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, category })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch category' },
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
    const parsed = categoryInputSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateCategory(params.id, parsed.data)
    return NextResponse.json({ ok: true, category: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update category'
    const status = message.includes('already exists') ? 409 : message.includes('not found') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(extractRequestWithAuth(req))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const result = await deleteCategory(params.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete category'
    // If referenced by products, returns 400 with explanation
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
