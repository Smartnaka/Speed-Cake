import { NextResponse } from 'next/server'
import {
  DEFAULT_ADMIN_EMAIL,
  HARDCODED_ADMIN_TOKEN,
  isHardcodedAdminCredential,
} from '@/lib/schemas'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // 1. Check hardcoded admin credentials
    if (isHardcodedAdminCredential(email, password)) {
      const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
      const response = NextResponse.json({
        ok: true,
        token: HARDCODED_ADMIN_TOKEN,
        user: {
          id: 'admin-hardcoded',
          email: adminEmail,
          name: 'Speed Cake Administrator',
          role: 'admin',
        },
      })

      // Also set HTTP-only cookie for server-side persistence
      response.cookies.set('speedcake_admin_token', HARDCODED_ADMIN_TOKEN, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return response
    }

    // 2. Fall back to Supabase Auth if credentials match a database admin user
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anonKey) {
        const client = createClient(url, anonKey, { auth: { persistSession: false } })
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (!authError && authData.session && authData.user) {
          const db = supabaseAdmin()
          const { data: profile } = await db
            .from('profiles')
            .select('role,full_name')
            .eq('id', authData.user.id)
            .maybeSingle()

          if (profile?.role === 'admin') {
            const response = NextResponse.json({
              ok: true,
              token: authData.session.access_token,
              user: {
                id: authData.user.id,
                email: authData.user.email,
                name: profile.full_name || 'Admin',
                role: 'admin',
              },
            })
            response.cookies.set('speedcake_admin_token', authData.session.access_token, {
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 24 * 7,
            })
            return response
          } else {
            return NextResponse.json(
              { error: 'Forbidden: Administrator privileges required' },
              { status: 403 }
            )
          }
        }
      }
    } catch {}

    return NextResponse.json({ error: 'Invalid administrator email or password' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
