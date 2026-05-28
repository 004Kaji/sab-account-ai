export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export type AbnVerifyResult =
  | { status: 'active';         name: string; abn: string; entityType: string }
  | { status: 'cancelled';      name: string; abn: string }
  | { status: 'not_found' }
  | { status: 'not_configured' }
  | { status: 'error';          message: string }

export async function GET(req: NextRequest) {
  const guid = process.env.ABR_API_GUID
  if (!guid || guid === 'your-guid-here') {
    return NextResponse.json({ status: 'not_configured' } satisfies AbnVerifyResult)
  }

  const abn = (req.nextUrl.searchParams.get('abn') ?? '').replace(/\s/g, '')
  if (!/^\d{11}$/.test(abn)) {
    return NextResponse.json({ status: 'not_found' } satisfies AbnVerifyResult)
  }

  try {
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}&callback=c`
    const res  = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hr
    const text = await res.text()

    // Strip JSONP wrapper: c({...})
    const jsonStr = text.replace(/^[^(]+\(/, '').replace(/\)[^)]*$/, '')
    const data = JSON.parse(jsonStr) as {
      Abn?: string
      AbnStatus?: string
      EntityName?: string
      BusinessName?: Array<{ OrganisationName?: string }>
      EntityTypeName?: string
      Message?: string
    }

    if (data.Message && data.Message.toLowerCase().includes('no record')) {
      return NextResponse.json({ status: 'not_found' } satisfies AbnVerifyResult)
    }

    if (!data.Abn) {
      return NextResponse.json({ status: 'not_found' } satisfies AbnVerifyResult)
    }

    const name = data.EntityName
      || data.BusinessName?.[0]?.OrganisationName
      || ''

    const formattedAbn = data.Abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')

    if (data.AbnStatus === 'Active') {
      return NextResponse.json({
        status: 'active',
        name,
        abn: formattedAbn,
        entityType: data.EntityTypeName ?? '',
      } satisfies AbnVerifyResult)
    }

    return NextResponse.json({
      status: 'cancelled',
      name,
      abn: formattedAbn,
    } satisfies AbnVerifyResult)

  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'abn_verify' } })
    console.error('ABR lookup error:', err)
    return NextResponse.json({ status: 'error', message: 'ABR lookup failed' } satisfies AbnVerifyResult)
  }
}
