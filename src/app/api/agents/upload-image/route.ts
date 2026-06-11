export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const supabase = createServiceClient()

    // Auto-create bucket if it doesn't exist
    await supabase.storage.createBucket('social-images', { public: true }).catch(() => {})

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `posts/${Date.now()}.${ext}`

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error } = await supabase.storage
      .from('social-images')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = supabase.storage.from('social-images').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
