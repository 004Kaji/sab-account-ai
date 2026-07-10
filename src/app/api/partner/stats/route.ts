import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { FREE_MODE } from '@/lib/free-mode'

export async function GET(req: NextRequest) {
  if (FREE_MODE) {
    return NextResponse.json({ error: 'The partner program is closed while SAB Account AI is free.' }, { status: 404 })
  }
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: partner } = await supabase
    .from('partner_applications')
    .select('name, firm, ref_code, conversions_count, status, created_at')
    .eq('email', user.email!.toLowerCase())
    .neq('status', 'rejected')
    .maybeSingle()

  if (!partner) return NextResponse.json({ partner: null })

  return NextResponse.json({ partner })
}
