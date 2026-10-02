import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { categoryInputSchema } from '@/lib/schemas'
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/catalogue-db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req)
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
  const auth = await verifyAdminSession(req)
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
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    await deleteCategory(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete category'
    const status = message.includes('currently assigned') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
