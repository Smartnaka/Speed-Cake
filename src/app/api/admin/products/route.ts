import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { productInputSchema } from '@/lib/schemas'
import { getAdminProducts, createProduct } from '@/lib/catalogue-db'

export async function GET(req: Request) {
  const auth = await verifyAdminSession(req)
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
  const auth = await verifyAdminSession(req)
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
