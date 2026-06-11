export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

interface PexelsPhoto {
  id: number
  src: { large: string; medium: string }
  photographer: string
  alt: string
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? 'small business australia'
  const key = process.env.PEXELS_API_KEY
  if (!key) return NextResponse.json({ images: [] })

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
      { headers: { Authorization: key } }
    )
    if (!res.ok) return NextResponse.json({ images: [] })
    const data = await res.json() as { photos: PexelsPhoto[] }
    return NextResponse.json({
      images: (data.photos ?? []).map(p => ({
        id: p.id,
        url: p.src.large,
        thumb: p.src.medium,
        photographer: p.photographer,
        alt: p.alt ?? query,
      }))
    })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
