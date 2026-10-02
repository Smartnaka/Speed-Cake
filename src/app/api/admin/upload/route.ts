import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/catalogue-db'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request) {
  const auth = await verifyAdminSession(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are permitted.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit. Please upload an image under 5MB.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    if (isSupabaseConfigured()) {
      const db = supabaseAdmin()
      const { error: uploadError } = await db.storage
        .from('product-images')
        .upload(fileName, buffer, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = db.storage.from('product-images').getPublicUrl(fileName)
      return NextResponse.json({
        ok: true,
        url: urlData.publicUrl,
        storage_path: fileName,
      })
    }

    // In local demo mode, create an inline Data URL for immediate display & persistence
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    return NextResponse.json({
      ok: true,
      url: dataUrl,
      storage_path: dataUrl,
    })
  } catch (err) {
    console.error('Image upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Image upload failed' },
      { status: 500 }
    )
  }
}
