// ATO PAYG withholding — NAT 1004 (Schedule 1) weekly coefficients
// FY2025-26 — same coefficients as FY2024-25 (Stage 3 rates, confirmed no change per ATO May 2025)
//
// Source: Schedule 1 – Statement of formulas for calculating amounts to be withheld (NAT 1004)
//         Schedule 15 – Tax table for working holiday makers (NAT 75331)
//         ATO tax rates ato.gov.au/rates (Stage 3: 16%/30%, thresholds $18,200/$45,000/$135,000/$190,000)
//
// ⚠️  NEVER CHANGE THE NUMBERS IN THIS FILE without checking ato.gov.au first.
//     These coefficients come directly from the ATO's published formula tables.
//     One wrong digit means every payslip in the app becomes wrong.

// ── Residency status ──────────────────────────────────────────────────
export type ResidencyStatus =
  | 'citizen_pr'  // Australian citizen or permanent resident
  | 'student'     // International student (student visa)
  | 'temp_work'   // Temporary work visa (482, 457, etc)
  | 'whm'         // Working holiday maker (417 or 462)
  | 'partner'     // Partner or dependent visa (temporary)
  | 'other_temp'  // Other temporary resident

// Temporary residents do not pay the Medicare levy (2%).
export function isMedicareExemptByResidency(status: ResidencyStatus): boolean {
  return status !== 'citizen_pr'
}

export type PaygInput = {
  annualSalary: number
  claimingThreshold: boolean
  hasHELP: boolean
  medicareLevyExemption: boolean
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
  residencyStatus?: ResidencyStatus
}

export type PaygResult = {
  annualTax: number
  annualMedicare: number
  annualHELP: number
  annualTotal: number
  periodTax: number
  periodMedicare: number
  periodHELP: number
  periodTotal: number
}

type PayCycle = 'weekly' | 'fortnightly' | 'monthly'

const PERIODS_PER_YEAR: Record<PayCycle, number> = {
  weekly:      52,
  fortnightly: 26,
  monthly:     12,
}

// ── NAT 1004 coefficient tables ───────────────────────────────────────
// Format: { limit, a, b } where limit is the UPPER BOUND of the bracket.
// Find the first bracket where x < limit; apply y = a*x - b.
// x = Math.floor(weeklyEarnings) + 0.99 (per NAT 1004 Section 3)

type Bracket = { limit: number; a: number; b: number }

// Scale 1 — employee has NOT claimed the tax-free threshold on their TFN declaration.
// Includes Medicare levy. No LITO. Used for second jobs or employees who don't claim.
const SCALE_1: Bracket[] = [
  { limit: 150,      a: 0.1600, b: 0.1600 },
  { limit: 371,      a: 0.2117, b: 7.7550 },
  { limit: 515,      a: 0.1890, b: -0.6702 },
  { limit: 932,      a: 0.3227, b: 68.2367 },
  { limit: 2246,     a: 0.3200, b: 65.7202 },
  { limit: 3303,     a: 0.3900, b: 222.9510 },
  { limit: Infinity, a: 0.4700, b: 487.2587 },
]

// Scale 2 — employee HAS claimed the tax-free threshold.
// Includes Medicare levy and LITO phaseout. Primary scale for Australian residents.
const SCALE_2: Bracket[] = [
  { limit: 361,      a: 0,      b: 0 },         // nil — below effective withholding threshold
  { limit: 500,      a: 0.1600, b: 57.8462 },
  { limit: 625,      a: 0.2600, b: 107.8462 },
  { limit: 721,      a: 0.1800, b: 57.8462 },
  { limit: 865,      a: 0.1890, b: 64.3365 },
  { limit: 1282,     a: 0.3227, b: 180.0385 },
  { limit: 2596,     a: 0.3200, b: 176.5769 },
  { limit: 3653,     a: 0.3900, b: 358.3077 },
  { limit: Infinity, a: 0.4700, b: 650.6154 },
]

// Scale 3 — foreign residents.
// No Medicare, no LITO, no tax-free threshold. Higher withholding from first dollar.
const SCALE_3: Bracket[] = [
  { limit: 2596,     a: 0.3000, b: 0.3000 },
  { limit: 3653,     a: 0.3700, b: 181.7308 },
  { limit: Infinity, a: 0.4500, b: 474.0385 },
]

// Scale 5 — claiming threshold + FULL Medicare levy exemption.
// No Medicare levy withheld. Includes LITO. Used for temp residents / international students.
const SCALE_5: Bracket[] = [
  { limit: 361,      a: 0,      b: 0 },
  { limit: 721,      a: 0.1600, b: 57.8462 },
  { limit: 865,      a: 0.1690, b: 64.3365 },
  { limit: 1282,     a: 0.3027, b: 180.0385 },
  { limit: 2596,     a: 0.3000, b: 176.5769 },
  { limit: 3653,     a: 0.3700, b: 358.3077 },
  { limit: Infinity, a: 0.4500, b: 650.6154 },
]

// ── NAT 1004 formula engine ───────────────────────────────────────────
// Convert period earnings to weekly equivalent (NAT 1004 Section 3 method).
// Monthly: ATO requires adding 0.01 if the amount ends in exactly 33 cents.
function toWeeklyEquivalent(periodEarnings: number, payCycle: PayCycle): number {
  if (payCycle === 'weekly') {
    return Math.floor(periodEarnings) + 0.99
  }
  if (payCycle === 'fortnightly') {
    return Math.floor(periodEarnings / 2) + 0.99
  }
  // Monthly: (amount × 3) ÷ 13 — add 0.01 first if ends in 33 cents
  const adjusted = Math.round(periodEarnings * 100) % 100 === 33
    ? periodEarnings + 0.01
    : periodEarnings
  return Math.floor(adjusted * 3 / 13) + 0.99
}

function applyScale(periodEarnings: number, payCycle: PayCycle, scale: Bracket[]): number {
  const x = toWeeklyEquivalent(periodEarnings, payCycle)
  const bracket = scale.find(b => x < b.limit) ?? scale[scale.length - 1]
  // Per NAT 1004: round the weekly amount FIRST, then convert to period
  const weeklyRounded = Math.round(Math.max(0, bracket.a * x - bracket.b))
  if (payCycle === 'weekly')      return weeklyRounded
  if (payCycle === 'fortnightly') return weeklyRounded * 2
  return Math.round(weeklyRounded * 13 / 3)
}

// ── Schedule 15 — Working Holiday Maker ──────────────────────────────
// Stage 3 rates (from 1 July 2024): 15% → 30% → 37% → 45%
// No Medicare. No LITO. No tax-free threshold.
function whmAnnualTax(annual: number): number {
  if (annual <= 45000)   return annual * 0.15
  if (annual <= 135000)  return 6750 + (annual - 45000) * 0.30
  if (annual <= 190000)  return 33750 + (annual - 135000) * 0.37
  return 54100 + (annual - 190000) * 0.45
}

// ── Medicare levy (informational breakdown only) ──────────────────────
// Scale 1 and Scale 2 embed Medicare in their coefficients.
// This function is used only to split the combined withholding into
// "income tax" and "Medicare levy" line items on the payslip.
// 2024-25 / 2025-26 thresholds: lower $27,222, shade-in upper $34,028.
function medicareLevyEstimate(annual: number, exempt: boolean): number {
  if (exempt)            return 0
  if (annual <= 27222)   return 0
  if (annual <= 34028)   return (annual - 27222) * 0.10
  return annual * 0.02
}

// ── HELP / HECS repayment ─────────────────────────────────────────────
// Calculated separately from the main scale. 2024-25 thresholds.
// Note: Schedule 8 was updated 24 September 2025; these are the pre-update rates.
// ⚠️  These thresholds are indexed annually. Check ATO Schedule 8 each July.
function helpRepayment(annual: number): number {
  if (annual < 54435)    return 0
  if (annual <= 62738)   return annual * 0.010
  if (annual <= 70000)   return annual * 0.020
  if (annual <= 80000)   return annual * 0.025
  if (annual <= 92000)   return annual * 0.030
  if (annual <= 106000)  return annual * 0.035
  if (annual <= 125000)  return annual * 0.040
  if (annual <= 151000)  return annual * 0.045
  return annual * 0.050
}

// ── Scale label for UI display ────────────────────────────────────────
export function getPaygScaleLabel(
  claimingThreshold: boolean,
  residencyStatus: ResidencyStatus,
  medicareLevyExemption: boolean,
): string {
  const exempt = medicareLevyExemption || isMedicareExemptByResidency(residencyStatus)
  if (residencyStatus === 'whm') return 'WHM (Schedule 15)'
  if (claimingThreshold && !exempt)  return 'Scale 2 (threshold)'
  if (!claimingThreshold && !exempt) return 'Scale 1 (no threshold)'
  if (claimingThreshold && exempt)   return 'Scale 5 (Medicare exempt)'
  return 'Scale 3 (no threshold, exempt)'
}

// ── Main PAYG calculation ─────────────────────────────────────────────
export function calculatePAYG(input: PaygInput): PaygResult {
  const {
    annualSalary, claimingThreshold, hasHELP, medicareLevyExemption,
    payCycle, residencyStatus = 'citizen_pr',
  } = input
  const periods = PERIODS_PER_YEAR[payCycle]
  const periodEarnings = annualSalary / periods

  const isWHM = residencyStatus === 'whm'
  const effectiveMedExempt = medicareLevyExemption || isMedicareExemptByResidency(residencyStatus)

  // 1. Calculate period tax+Medicare withholding using the correct scale
  let periodTaxPlusMedicare: number
  let scaleIncludesMedicare: boolean

  if (isWHM) {
    // Schedule 15: WHM — annual formula divided by periods (no weekly coefficient method)
    periodTaxPlusMedicare = Math.round(whmAnnualTax(annualSalary) / periods)
    scaleIncludesMedicare = false
  } else if (claimingThreshold && !effectiveMedExempt) {
    periodTaxPlusMedicare = applyScale(periodEarnings, payCycle, SCALE_2)
    scaleIncludesMedicare = true
  } else if (!claimingThreshold && !effectiveMedExempt) {
    periodTaxPlusMedicare = applyScale(periodEarnings, payCycle, SCALE_1)
    scaleIncludesMedicare = true
  } else if (claimingThreshold && effectiveMedExempt) {
    periodTaxPlusMedicare = applyScale(periodEarnings, payCycle, SCALE_5)
    scaleIncludesMedicare = false
  } else {
    // Not claiming threshold + Medicare exempt (e.g. temp resident second job)
    // No exact ATO scale. Scale 3 (foreign resident) is the closest approximation.
    periodTaxPlusMedicare = applyScale(periodEarnings, payCycle, SCALE_3)
    scaleIncludesMedicare = false
  }

  // 2. Estimate Medicare for the informational breakdown display
  //    Scale 1/2 embed Medicare; we back-calculate it from the annual formula.
  const annualMedicareEstimate = effectiveMedExempt ? 0 : medicareLevyEstimate(annualSalary, false)
  const periodMedicare = scaleIncludesMedicare
    ? Math.round(annualMedicareEstimate / periods)
    : 0

  // 3. HELP repayment — added on top of the scale result
  const annualHELP = hasHELP ? helpRepayment(annualSalary) : 0
  const periodHELP = Math.round(annualHELP / periods)

  // 4. Split income tax from the combined amount (for display only)
  const periodTax = Math.max(0, periodTaxPlusMedicare - periodMedicare)
  const periodTotal = periodTaxPlusMedicare + periodHELP

  return {
    annualTax:      Math.round(periodTax * periods),
    annualMedicare: Math.round(annualMedicareEstimate),
    annualHELP:     Math.round(annualHELP),
    annualTotal:    Math.round(periodTotal * periods),
    periodTax,
    periodMedicare,
    periodHELP,
    periodTotal,
  }
}

// ── Super guarantee ───────────────────────────────────────────────────
// ✅ This is the one number to update each 1 July.
//    FY2024-25: 11.5%  |  FY2025-26: 12.0%
//    Verify at ato.gov.au/super before changing.
export function getSuperRate(useNewRate: boolean): number {
  return useNewRate ? 0.12 : 0.115
}

export function calculateSuper(ordinaryEarnings: number, useNewRate: boolean): number {
  return Math.round(ordinaryEarnings * getSuperRate(useNewRate) * 100) / 100
}

// ── Full payslip calculation ──────────────────────────────────────────
export type PayslipInput = {
  annualSalary: number
  salarySacrifice: number
  overtimeHours: number
  overtimeRate: number
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
  claimingThreshold: boolean
  hasHELP: boolean
  medicareLevyExemption: boolean
  useNewSuperRate: boolean
  residencyStatus?: ResidencyStatus
}

export type PayslipNumbers = {
  ordinaryEarnings: number
  overtimePay: number
  grossPay: number
  salarySacrifice: number
  taxableGross: number
  incomeTax: number
  medicareLevy: number
  helpRepayment: number
  totalDeductions: number
  netPay: number
  superSG: number
  superSalSac: number
  totalSuper: number
  ytdGross: number
  ytdTax: number
  ytdSuper: number
}

export function calculatePayslip(input: PayslipInput): PayslipNumbers {
  const {
    annualSalary, salarySacrifice, overtimeHours, overtimeRate,
    payCycle, claimingThreshold, hasHELP, medicareLevyExemption, useNewSuperRate,
    residencyStatus = 'citizen_pr',
  } = input

  const periods = PERIODS_PER_YEAR[payCycle]

  const ordinaryEarnings = Math.round((annualSalary / periods) * 100) / 100
  const overtimePay      = Math.round(overtimeHours * overtimeRate * 100) / 100
  const grossPay         = Math.round((ordinaryEarnings + overtimePay) * 100) / 100

  const salSacPeriod = Math.round((salarySacrifice / periods) * 100) / 100
  const taxableGross = Math.max(0, Math.round((grossPay - salSacPeriod) * 100) / 100)

  const taxableAnnual = taxableGross * periods
  const payg = calculatePAYG({
    annualSalary: taxableAnnual,
    claimingThreshold,
    hasHELP,
    medicareLevyExemption,
    payCycle,
    residencyStatus,
  })

  const totalDeductions = payg.periodTotal
  const netPay          = Math.round((taxableGross - totalDeductions) * 100) / 100

  const superSG      = calculateSuper(ordinaryEarnings, useNewSuperRate)
  const superSalSac  = salSacPeriod
  const totalSuper   = Math.round((superSG + superSalSac) * 100) / 100

  const ytdGross = Math.round(grossPay * periods * 100) / 100
  const ytdTax   = payg.annualTotal
  const ytdSuper = Math.round(totalSuper * periods * 100) / 100

  return {
    ordinaryEarnings, overtimePay, grossPay,
    salarySacrifice: salSacPeriod, taxableGross,
    incomeTax:       payg.periodTax,
    medicareLevy:    payg.periodMedicare,
    helpRepayment:   payg.periodHELP,
    totalDeductions, netPay,
    superSG, superSalSac, totalSuper,
    ytdGross, ytdTax, ytdSuper,
  }
}
