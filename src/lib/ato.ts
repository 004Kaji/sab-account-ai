// ATO tax calculation logic for SAB Account AI
// Based on ATO Scale 1 (claiming threshold) and Scale 2 (not claiming).
// All figures are for the 2024-25 financial year unless noted.

export type PaygInput = {
  annualSalary: number
  claimingThreshold: boolean  // true = Scale 1, false = Scale 2
  hasHELP: boolean
  medicareLevyExemption: boolean
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
}

export type PaygResult = {
  // Annual figures
  annualTax: number
  annualMedicare: number
  annualHELP: number
  annualTotal: number
  // Per-pay-period figures
  periodTax: number
  periodMedicare: number
  periodHELP: number
  periodTotal: number   // rounded to nearest dollar
}

// Pay periods per year for each cycle
const PERIODS_PER_YEAR: Record<string, number> = {
  weekly:      52,
  fortnightly: 26,
  monthly:     12,
}

// ── Scale 1: claiming tax-free threshold (2024-25, Stage 3 cuts) ──
// Brackets: 0-18,200 / 18,201-45,000 / 45,001-135,000 / 135,001-190,000 / 190,001+

function taxScale1(income: number): number {
  if (income <= 18200)  return 0
  if (income <= 45000)  return (income - 18200) * 0.19
  if (income <= 135000) return 5092 + (income - 45000) * 0.325
  if (income <= 190000) return 34342 + (income - 135000) * 0.37
  return 54692 + (income - 190000) * 0.45
}

// LITO (Low Income Tax Offset) — 2024-25 ATO rates
// Phase 1: reduces by 5c per $1 from $37,500 to $45,000 ($700 → $325)
// Phase 2: reduces by 1.5c per $1 from $45,000 to $66,667 ($325 → $0)
function lito(income: number): number {
  if (income <= 37500) return 700
  if (income <= 45000) return 700 - (income - 37500) * 0.05
  if (income <= 66667) return 325 - (income - 45000) * 0.015
  return 0
}

// ── Scale 2: NOT claiming tax-free threshold (2024-25, Stage 3 cuts)
// Same brackets but taxed from $0 at 19% (no free threshold, no LITO).

function taxScale2(income: number): number {
  if (income <= 45000)  return income * 0.19
  if (income <= 135000) return 8550 + (income - 45000) * 0.325
  if (income <= 190000) return 37800 + (income - 135000) * 0.37
  return 58150 + (income - 190000) * 0.45
}

// ── Medicare levy (2%, applies when income > $26,000) ────────────

function medicareLevy(income: number, exempt: boolean): number {
  if (exempt) return 0
  if (income <= 26000) return 0
  return income * 0.02
}

// ── HELP / HECS repayment thresholds (2024-25) ───────────────────

function helpRepayment(income: number): number {
  if (income < 54435)  return 0
  if (income < 62738)  return income * 0.010
  if (income < 66529)  return income * 0.020
  if (income < 70539)  return income * 0.025
  if (income < 74783)  return income * 0.030
  if (income < 79212)  return income * 0.035
  if (income < 83965)  return income * 0.040
  if (income < 89003)  return income * 0.045
  if (income < 94370)  return income * 0.050
  if (income < 100022) return income * 0.055
  if (income < 106090) return income * 0.060
  if (income < 112355) return income * 0.065
  if (income < 119063) return income * 0.070
  if (income < 126272) return income * 0.075
  if (income < 134048) return income * 0.080
  if (income < 142170) return income * 0.085
  if (income < 150751) return income * 0.090
  if (income < 159907) return income * 0.095
  return income * 0.10
}

// ── Main PAYG calculation ─────────────────────────────────────────

/**
 * Calculate PAYG withholding for an employee.
 * The process: annualise salary → calculate annual tax → de-annualise to period.
 * All returned figures rounded to nearest dollar.
 */
export function calculatePAYG(input: PaygInput): PaygResult {
  const { annualSalary, claimingThreshold, hasHELP, medicareLevyExemption, payCycle } = input
  const periods = PERIODS_PER_YEAR[payCycle]

  // Calculate annual income tax
  let annualTax: number
  if (claimingThreshold) {
    annualTax = Math.max(0, taxScale1(annualSalary) - lito(annualSalary))
  } else {
    annualTax = taxScale2(annualSalary)
  }

  const annualMedicare = medicareLevy(annualSalary, medicareLevyExemption)
  const annualHELP = hasHELP ? helpRepayment(annualSalary) : 0
  const annualTotal = annualTax + annualMedicare + annualHELP

  // De-annualise to pay period and round to nearest dollar
  return {
    annualTax:     Math.round(annualTax),
    annualMedicare: Math.round(annualMedicare),
    annualHELP:    Math.round(annualHELP),
    annualTotal:   Math.round(annualTotal),
    periodTax:     Math.round(annualTax / periods),
    periodMedicare: Math.round(annualMedicare / periods),
    periodHELP:    Math.round(annualHELP / periods),
    periodTotal:   Math.round(annualTotal / periods),
  }
}

// ── Super guarantee ──────────────────────────────────────────────

/** Return the current super guarantee rate (11.5% or 12% from 1 Jul 2025) */
export function getSuperRate(useNewRate: boolean): number {
  return useNewRate ? 0.12 : 0.115
}

/**
 * Calculate the employer SG contribution for the pay period.
 * Super is calculated on Ordinary Time Earnings (not overtime).
 */
export function calculateSuper(
  ordinaryEarnings: number,
  useNewRate: boolean,
): number {
  return Math.round(ordinaryEarnings * getSuperRate(useNewRate) * 100) / 100
}

// ── Full payslip calculation ──────────────────────────────────────

export type PayslipInput = {
  annualSalary: number
  salarySacrifice: number    // pre-tax salary sacrifice to super per year
  overtimeHours: number
  overtimeRate: number       // hourly overtime rate
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
  claimingThreshold: boolean
  hasHELP: boolean
  medicareLevyExemption: boolean
  useNewSuperRate: boolean
}

export type PayslipNumbers = {
  ordinaryEarnings: number    // per period
  overtimePay: number         // per period
  grossPay: number            // ordinary + overtime
  salarySacrifice: number     // per period (pre-tax super)
  taxableGross: number        // grossPay - salarySacrifice
  incomeTax: number           // PAYG withholding per period
  medicareLevy: number        // per period
  helpRepayment: number       // per period
  totalDeductions: number     // tax + medicare + help
  netPay: number              // taxableGross - totalDeductions
  superSG: number             // employer SG per period
  superSalSac: number         // salary sacrifice per period
  totalSuper: number          // SG + salary sacrifice
  // Estimated year-to-date (full FY annualised)
  ytdGross: number
  ytdTax: number
  ytdSuper: number
}

/** Calculate all payslip numbers from the input fields */
export function calculatePayslip(input: PayslipInput): PayslipNumbers {
  const {
    annualSalary,
    salarySacrifice,
    overtimeHours,
    overtimeRate,
    payCycle,
    claimingThreshold,
    hasHELP,
    medicareLevyExemption,
    useNewSuperRate,
  } = input

  const periods = PERIODS_PER_YEAR[payCycle]

  // Per-period ordinary earnings and overtime
  const ordinaryEarnings = Math.round((annualSalary / periods) * 100) / 100
  const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100
  const grossPay = Math.round((ordinaryEarnings + overtimePay) * 100) / 100

  // Salary sacrifice reduces taxable income
  const salSacPeriod = Math.round((salarySacrifice / periods) * 100) / 100
  const taxableGross = Math.max(0, Math.round((grossPay - salSacPeriod) * 100) / 100)

  // PAYG uses the taxable annual income (annualised taxable gross)
  const taxableAnnual = taxableGross * periods
  const payg = calculatePAYG({
    annualSalary: taxableAnnual,
    claimingThreshold,
    hasHELP,
    medicareLevyExemption,
    payCycle,
  })

  const totalDeductions = payg.periodTotal
  const netPay = Math.round((taxableGross - totalDeductions) * 100) / 100

  // Super is on ordinary time earnings only (not overtime)
  const superSG = calculateSuper(ordinaryEarnings, useNewSuperRate)
  const superSalSac = salSacPeriod
  const totalSuper = Math.round((superSG + superSalSac) * 100) / 100

  // Estimated YTD (annualised)
  const ytdGross = Math.round(grossPay * periods * 100) / 100
  const ytdTax = payg.annualTotal
  const ytdSuper = Math.round(totalSuper * periods * 100) / 100

  return {
    ordinaryEarnings,
    overtimePay,
    grossPay,
    salarySacrifice: salSacPeriod,
    taxableGross,
    incomeTax: payg.periodTax,
    medicareLevy: payg.periodMedicare,
    helpRepayment: payg.periodHELP,
    totalDeductions,
    netPay,
    superSG,
    superSalSac,
    totalSuper,
    ytdGross,
    ytdTax,
    ytdSuper,
  }
}
