// ATO PAYG withholding calculation for SAB Account AI
// FY2024-25 — Scale 1 (claiming threshold), Scale 2, Scale 15 (WHM)
//
// ⚠️  NEVER CHANGE THE NUMBERS IN THIS FILE without checking ato.gov.au first.
//     These brackets and percentages come directly from ATO tax tables.
//     If you change a number, every payslip in the app becomes wrong.

// ── Residency status ──────────────────────────────────────────────────
// The different visa/residency types we support.
// Each one may get different tax treatment — e.g. working holiday makers
// pay 15% on their first $45,000 instead of the normal scale.
export type ResidencyStatus =
  | 'citizen_pr'  // Australian citizen or permanent resident
  | 'student'     // International student (student visa)
  | 'temp_work'   // Temporary work visa (482, 457, etc)
  | 'whm'         // Working holiday maker (417 or 462)
  | 'partner'     // Partner or dependent visa (temporary)
  | 'other_temp'  // Other temporary resident

// ── Should this person pay the Medicare Levy? ─────────────────────────
// Medicare Levy (2% of income) is only paid by Australian citizens and
// permanent residents. Everyone else is exempt.
// Returns true (exempt) for anyone who is NOT a citizen/PR.
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

// How many pay periods in a year for each pay cycle.
// Weekly: 52 pays per year. Fortnightly: 26. Monthly: 12.
// Used to convert annual tax into a per-payslip amount.
const PERIODS_PER_YEAR: Record<string, number> = {
  weekly:      52,
  fortnightly: 26,
  monthly:     12,
}

// ── STEP 1 — Scale 1 income tax brackets ─────────────────────────────
// This is the standard tax table for Australian residents who ARE claiming
// the tax-free threshold (i.e. this is their main job).
//
// ⚠️  NEVER CHANGE THESE NUMBERS. They come from the ATO.
//     Source: ato.gov.au → Tax rates → Resident tax rates
//
// Real example for $75,000 annual salary:
//   Income is between $45,001 and $120,000 → third bracket applies
//   Base amount: $5,092 (pre-calculated by ATO for the lower brackets)
//   Plus: ($75,000 - $45,000) × 32.5%
//       = $30,000 × 0.325
//       = $9,750
//   Total: $5,092 + $9,750 = $14,842 annual income tax (before offsets)
function taxScale1(income: number): number {
  if (income <= 18200)  return 0                                    // Tax-free threshold — pay nothing
  if (income <= 45000)  return (income - 18200) * 0.19             // 19% on income above $18,200
  if (income <= 120000) return 5092 + (income - 45000) * 0.325     // 32.5% on income above $45,000
  if (income <= 180000) return 29467 + (income - 120000) * 0.37    // 37% on income above $120,000
  return 51667 + (income - 180000) * 0.45                          // 45% on income above $180,000
}

// ── STEP 2 — LITO (Low Income Tax Offset) ────────────────────────────
// LITO is a tax discount the government gives to low and middle income earners.
// It reduces the tax calculated in Step 1. It phases out as income rises.
//
// Real example for $75,000:
//   Income is above $66,667 → LITO = $0 (fully phased out)
//   So for $75,000 there is no LITO benefit.
//
// Real example for $35,000:
//   Income is between $0 and $37,500 → LITO = $700
//   So the $35,000 earner saves $700 off their tax bill.
//
// ⚠️  NEVER CHANGE THESE NUMBERS. They come from the ATO.
function lito(income: number): number {
  if (income <= 37500) return 700                                   // Full $700 offset
  if (income <= 45000) return 700 - (income - 37500) * 0.05        // Phases out 5c per dollar
  if (income <= 66667) return 325 - (income - 45000) * 0.015       // Phases out 1.5c per dollar
  return 0                                                          // No offset above $66,667
}

// ── STEP 3 — Medicare levy (3 bands) ─────────────────────────────────
// The Medicare Levy funds Australia's public health system.
// It's 2% of income for most people. Low income earners pay less or nothing.
// Non-residents are fully exempt (handled by isMedicareExemptByResidency above).
//
// Real example for $75,000:
//   Income is above $33,044 → full 2% applies
//   $75,000 × 2% = $1,500 Medicare levy
//
// ⚠️  NEVER CHANGE THESE NUMBERS.
function medicareLevy(income: number, exempt: boolean): number {
  if (exempt) return 0                                              // Non-residents pay nothing
  if (income <= 26000) return 0                                     // Very low income — no levy
  if (income <= 33044) return (income - 26000) * 0.10              // Phases in at 10% of excess
  return income * 0.02                                             // Full 2% for everyone else
}

// ── STEP 4a — Scale 15: Working holiday maker (no threshold, no LITO) ─
// Working holiday makers (visa 417 or 462) get no tax-free threshold
// and no LITO. They pay 15% flat on their first $45,000 earned in Australia.
//
// Real example for $40,000:
//   $40,000 × 15% = $6,000 annual tax (much higher than a resident earning the same)
//
// ⚠️  NEVER CHANGE THESE NUMBERS.
function taxScaleWHM(income: number): number {
  if (income <= 45000)  return income * 0.15                        // 15% flat on first $45,000
  if (income <= 120000) return 6750 + (income - 45000) * 0.325     // 32.5% above $45,000
  if (income <= 180000) return 31125 + (income - 120000) * 0.37    // 37% above $120,000
  return 53325 + (income - 180000) * 0.45                          // 45% above $180,000
}

// ── STEP 4b — Scale 2 (not claiming threshold, no LITO) ──────────────
// Used when an employee is NOT claiming the tax-free threshold — meaning
// they have another job where they already claimed it, or they're a foreign
// resident. No $18,200 tax-free band. Tax starts immediately from $0.
//
// Real example for $75,000 (not claiming threshold):
//   $14,625 + ($75,000 - $45,000) × 32.5%
//   = $14,625 + $9,750
//   = $24,375 annual tax (much higher than Scale 1 because no tax-free threshold)
//
// ⚠️  NEVER CHANGE THESE NUMBERS.
function taxScale2(income: number): number {
  if (income <= 45000)  return income * 0.325                       // 32.5% from dollar one
  if (income <= 120000) return 14625 + (income - 45000) * 0.325    // 32.5% continues
  if (income <= 180000) return 39000 + (income - 120000) * 0.37    // 37% above $120,000
  return 61200 + (income - 180000) * 0.45                          // 45% above $180,000
}

// ── STEP 5 — HELP / HECS repayment ───────────────────────────────────
// If an employee has a university HELP debt (formerly called HECS),
// extra money is withheld from their pay to repay it. The amount depends
// on their income — higher earners repay a larger percentage.
//
// Real example for $75,000 with HELP debt:
//   Income is between $70,001 and $80,000 → 2.5% rate
//   $75,000 × 2.5% = $1,875 per year withheld for HELP repayment
//
// ⚠️  NEVER CHANGE THESE NUMBERS. Check ato.gov.au for annual updates.
//     The $54,435 threshold changes slightly each financial year.
function helpRepayment(income: number): number {
  if (income < 54435)   return 0            // Below threshold — no repayment required
  if (income <= 62738)  return income * 0.010
  if (income <= 70000)  return income * 0.020
  if (income <= 80000)  return income * 0.025
  if (income <= 92000)  return income * 0.030
  if (income <= 106000) return income * 0.035
  if (income <= 125000) return income * 0.040
  if (income <= 151000) return income * 0.045
  return income * 0.050
}

// ── STEP 6 — Main PAYG calculation ───────────────────────────────────
// This is the function everything calls. It takes the employee's details
// and runs them through Steps 1–5 above, then divides the annual total
// by the number of pay periods to get the per-payslip withholding amount.
export function calculatePAYG(input: PaygInput): PaygResult {
  const { annualSalary, claimingThreshold, hasHELP, medicareLevyExemption, payCycle, residencyStatus = 'citizen_pr' } = input
  const periods = PERIODS_PER_YEAR[payCycle]

  const isWHM = residencyStatus === 'whm'
  const effectiveMedicareExempt = medicareLevyExemption || isMedicareExemptByResidency(residencyStatus)

  let annualTax: number
  if (isWHM) {
    annualTax = taxScaleWHM(annualSalary)
  } else if (claimingThreshold) {
    annualTax = Math.max(0, taxScale1(annualSalary) - lito(annualSalary))
  } else {
    annualTax = taxScale2(annualSalary)
  }

  const annualMedicare = medicareLevy(annualSalary, effectiveMedicareExempt)
  const annualHELP     = hasHELP ? helpRepayment(annualSalary) : 0
  const annualTotal    = annualTax + annualMedicare + annualHELP

  // Single round on the combined annual total — breakdown figures are informational only
  const periodTotal    = Math.round(annualTotal / periods)
  const periodTax      = Math.round(annualTax / periods)
  const periodMedicare = Math.round(annualMedicare / periods)
  const periodHELP     = Math.round(annualHELP / periods)

  return {
    annualTax:      Math.round(annualTax),
    annualMedicare: Math.round(annualMedicare),
    annualHELP:     Math.round(annualHELP),
    annualTotal:    Math.round(annualTotal),
    periodTax,
    periodMedicare,
    periodHELP,
    periodTotal,
  }
}

// ── Super guarantee ───────────────────────────────────────────────────
// Returns the correct superannuation rate for the selected financial year.
//
// ✅ THIS IS THE ONE NUMBER YOU MAY NEED TO UPDATE EACH YEAR.
//    The government increases the super rate every July 1.
//    FY2024-25: 11.5% (useNewRate = false)
//    FY2025-26: 12.0% (useNewRate = true)
//
//    When the rate changes again, update 0.12 to the new rate.
//    Always verify at ato.gov.au/super before changing.
export function getSuperRate(useNewRate: boolean): number {
  return useNewRate ? 0.12 : 0.115
}

// Calculates the employer super contribution for one pay period.
//
// Real example: Employee earns $3,000 ordinary earnings this fortnight.
//   Super = $3,000 x 11.5% = $345 (FY2024-25 rate)
//   Super = $3,000 x 12.0% = $360 (FY2025-26 rate)
//
// Note: Super is calculated on ORDINARY earnings only, not overtime.
export function calculateSuper(ordinaryEarnings: number, useNewRate: boolean): number {
  return Math.round(ordinaryEarnings * getSuperRate(useNewRate) * 100) / 100
}

// ── Full payslip calculation ──────────────────────────────────────────
// The master function that generates all the numbers shown on a payslip.
// It calls calculatePAYG and calculateSuper internally and assembles
// everything: gross pay, deductions, net pay, YTD (year-to-date) figures.
//
// Called live every time the user changes a field on the payslip page.
// Do not edit this function directly — change the sub-functions above instead.
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
