import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const result = await verifyAdminSession(req)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({
    ok: true,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.profile.full_name || 'Admin',
      role: 'admin',
    },
  })
}
