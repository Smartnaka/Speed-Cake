import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { storeSettingsSchema } from '@/lib/schemas'
import { getStoreSettings, updateStoreSettings } from '@/lib/store-settings-db'

function serverError() {
  return NextResponse.json({ error: 'Unable to process store settings.' }, { status: 500 })
}

export async function GET(req: Request) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const settings = await getStoreSettings()
    if (!settings) return NextResponse.json({ error: 'Store settings not found.' }, { status: 404 })
    return NextResponse.json({ ok: true, settings })
  } catch {
    return serverError()
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const parsed = storeSettingsSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 })
    }
    const settings = await updateStoreSettings(parsed.data)
    if (!settings) return serverError()
    return NextResponse.json({ ok: true, settings })
  } catch {
    return serverError()
  }
}
