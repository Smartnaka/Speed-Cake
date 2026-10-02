import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { categoryInputSchema } from '@/lib/schemas'
import { getCategories, createCategory } from '@/lib/catalogue-db'

export async function GET(req: Request) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const categories = await getCategories()
    return NextResponse.json({ ok: true, categories })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch categories' },
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
    const parsed = categoryInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const category = await createCategory(parsed.data)
    return NextResponse.json({ ok: true, category }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create category'
    const status = message.includes('already exists') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
