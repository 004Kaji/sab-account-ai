// Beam SuperStream clearing house — SaaS partner integration
//
// SAB Account AI registers as a SOFTWARE PARTNER (not an employer).
// One partner API key covers all SAB customers. Each customer has their
// own beam_employer_id stored in business_profiles.
//
// Partner registration: https://beamconnect.com.au/become-a-partner/
// Dev portal:           https://beamconnect.com.au/developing-with-beam/
//
// Vercel env vars needed (SAB-level, set once):
//   BEAM_CLIENT_ID       — partner client ID from Beam
//   BEAM_CLIENT_SECRET   — partner client secret from Beam
//
// Per-user: beam_employer_id stored in business_profiles table

export interface BeamContribution {
  employeeName: string
  superFundName: string
  memberNumber: string
  usi: string
  amount: number       // dollars
  paymentDate: string  // YYYY-MM-DD
}

export interface BeamResult {
  ok: boolean
  reference?: string
  error?: string
}

// ⚠️ PARKED — the direct-pay (clearing house) model is disabled by default.
// SAB Account AI's product direction is the "compliance brain": it calculates,
// prepares and TRACKS super, and the employer pays it themselves. This Beam
// path is retained but gated behind BOTH partner credentials AND an explicit
// SUPER_ENABLE_BEAM=true flag, so no money-movement path is ever active
// unless deliberately switched on.
export function isBeamConfigured(): boolean {
  if (process.env.SUPER_ENABLE_BEAM !== 'true') return false
  return !!(process.env.BEAM_CLIENT_ID && process.env.BEAM_CLIENT_SECRET)
}

// Submit contributions on behalf of one of SAB's customers (employers)
// beamEmployerId — the customer's employer ID in Beam (stored in business_profiles.beam_employer_id)
// TODO: update endpoint + payload once you receive API docs from Beam dev portal
export async function submitToBeam(
  beamEmployerId: string,
  contributions: BeamContribution[],
): Promise<BeamResult> {
  // Step 1 — get partner access token
  const tokenRes = await fetch('https://api.beamconnect.com.au/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'client_credentials',
      client_id:     process.env.BEAM_CLIENT_ID!,
      client_secret: process.env.BEAM_CLIENT_SECRET!,
    }),
  })
  if (!tokenRes.ok) return { ok: false, error: 'Beam auth failed' }
  const { access_token } = await tokenRes.json()

  // Step 2 — submit on behalf of the employer
  // TODO: confirm exact endpoint + payload shape from Beam dev portal docs
  const submitRes = await fetch(
    `https://api.beamconnect.com.au/v1/employers/${beamEmployerId}/contributions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contributions: contributions.map(c => ({
          member_number: c.memberNumber,
          usi:           c.usi,
          fund_name:     c.superFundName,
          amount:        c.amount,
          employee_name: c.employeeName,
          payment_date:  c.paymentDate,
        })),
      }),
    }
  )

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}))
    return { ok: false, error: err.message ?? 'Beam submission failed' }
  }

  const data = await submitRes.json()
  return { ok: true, reference: data.reference ?? data.id }
}
