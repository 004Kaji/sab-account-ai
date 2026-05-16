// ATO PAYG withholding calculation for SAB Account AI
// FY2024-25 — Scale 1 (claiming threshold), Scale 2, Scale 15 (WHM)

// ── Residency status ──────────────────────────────────────────────────
export type ResidencyStatus =
  | 'citizen_pr'  // Australian citizen or permanent resident
  | 'student'     // International student (student visa)
  | 'temp_work'   // Temporary work visa (482, 457, etc)
  | 'whm'         // Working holiday maker (417 or 462)
  | 'partner'     // Partner or dependent visa (temporary)
  | 'other_temp'  // Other temporary resident

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

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly:      52,
  fortnightly: 26,
  monthly:     12,
}

// ── STEP 1 — Scale 1 income tax brackets ─────────────────────────────
function taxScale1(income: number): number {
  if (income <= 18200)  return 0
  if (income <= 45000)  return (income - 18200) * 0.19
  if (income <= 120000) return 5092 + (income - 45000) * 0.325
  if (income <= 180000) return 29467 + (income - 120000) * 0.37
  return 51667 + (income - 180000) * 0.45
}

// ── STEP 2 — LITO (Low Income Tax Offset) ────────────────────────────
function lito(income: number): number {
  if (income <= 37500) return 700
  if (income <= 45000) return 700 - (income - 37500) * 0.05
  if (income <= 66667) return 325 - (income - 45000) * 0.015
  return 0
}

// ── STEP 3 — Medicare levy (3 bands) ─────────────────────────────────
function medicareLevy(income: number, exempt: boolean): number {
  if (exempt) return 0
  if (income <= 26000) return 0
  if (income <= 33044) return (income - 26000) * 0.10
  return income * 0.02
}

// ── STEP 4a — Scale 15: Working holiday maker (no threshold, no LITO) ─
function taxScaleWHM(income: number): number {
  if (income <= 45000)  return income * 0.15
  if (income <= 120000) return 6750 + (income - 45000) * 0.325
  if (income <= 180000) return 31125 + (income - 120000) * 0.37
  return 53325 + (income - 180000) * 0.45
}

// ── STEP 4b — Scale 2 (not claiming threshold, no LITO) ──────────────
function taxScale2(income: number): number {
  if (income <= 45000)  return income * 0.325
  if (income <= 120000) return 14625 + (income - 45000) * 0.325
  if (income <= 180000) return 39000 + (income - 120000) * 0.37
  return 61200 + (income - 180000) * 0.45
}

// ── STEP 5 — HELP / HECS repayment ───────────────────────────────────
function helpRepayment(income: number): number {
  if (income < 54435)   return 0
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
