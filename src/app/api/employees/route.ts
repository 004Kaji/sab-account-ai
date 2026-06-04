import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { encryptIfPresent, decryptIfPresent } from '@/lib/encrypt'

function auth(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
}

async function getUser(token: string | null) {
  if (!token) return null
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/employees — list all employees for the authenticated user, TFN decrypted
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const employees = (data ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      tfn: decryptIfPresent(e.tfn as string | null),
    }))

    return NextResponse.json(employees)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// POST /api/employees — create, TFN encrypted before storing
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const supabase = createServiceClient()

    const { error } = await supabase.from('employees').insert({
      ...body,
      tfn: encryptIfPresent(body.tfn),
      user_id: user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// PUT /api/employees — update by id, TFN encrypted before storing
export async function PUT(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { id, ...payload } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('employees')
      .update({ ...payload, tfn: encryptIfPresent(payload.tfn) })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// DELETE /api/employees?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser(auth(req))
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
