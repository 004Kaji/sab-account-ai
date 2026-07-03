export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const number = new URL(req.url).searchParams.get('number')
  if (!number?.trim()) return NextResponse.json({ error: 'number param required' }, { status: 400 })

  const { data } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', user.id)
    .eq('invoice_number', number)
    .is('deleted_at', null)
    .maybeSingle()

  if (data) {
    return NextResponse.json({ exists: true, error: 'Invoice number already exists' }, { status: 409 })
  }
  return NextResponse.json({ exists: false })
}
