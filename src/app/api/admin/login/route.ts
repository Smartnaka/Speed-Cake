import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Authentication service not configured' }, { status: 503 })
    }

    const client = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !authData.session || !authData.user) {
      return NextResponse.json({ error: 'Invalid administrator email or password' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ok: true,
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.full_name || 'Admin',
        role: 'admin',
      },
    })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
