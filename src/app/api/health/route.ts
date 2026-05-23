import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', app: 'SAB Account AI', timestamp: new Date().toISOString() },
    { status: 200 },
  )
}
