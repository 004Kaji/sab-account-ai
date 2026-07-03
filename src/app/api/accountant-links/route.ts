export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

async function getUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error || !user ? null : user
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('accountant_links')
    .select('id, token, label, expires_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { label?: string }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('accountant_links')
    .insert({ user_id: user.id, label: body.label?.trim() || null })
    .select('id, token, label, expires_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
  return NextResponse.json({
    link: data,
    url:  `${base}/accountant/${data.token}`,
  })
}
