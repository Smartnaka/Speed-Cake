import {NextResponse} from 'next/server'
import {verifyAdminSession} from '@/lib/admin-auth'

export async function GET(req: Request) {
  let requestToVerify = req
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    const cookieHeader = req.headers.get('cookie') || ''
    const match = cookieHeader.match(/speedcake_admin_token=([^;]+)/)
    if (match && match[1]) {
      const headers = new Headers(req.headers)
      headers.set('authorization', `Bearer ${decodeURIComponent(match[1])}`)
      requestToVerify = new Request(req.url, { headers })
    }
  }

  const result = await verifyAdminSession(requestToVerify)
  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: result.status})
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
