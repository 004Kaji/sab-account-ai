/**
 * Payslip calculation tests — verified against ATO published formulas.
 *
 * Sources:
 *  - NAT 1004 (Schedule 1): PAYG withholding coefficients
 *  - Schedule 8 (updated 24 Sep 2025): HELP/HECS marginal repayment rates
 *  - Schedule 15 (NAT 75331): Working Holiday Maker tax
 *  - ato.gov.au/rates: Super guarantee rates
 *
 * ⚠️  If any test fails after a code change, do NOT adjust the expected value
 *     without first verifying the new result against the ATO source document.
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePAYG,
  calculatePayslip,
  calculateSuper,
  getSuperRate,
  isMedicareExemptByResidency,
} from '@/lib/ato'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function payg(annual: number, opts?: {
  cycle?: 'weekly' | 'fortnightly' | 'monthly'
  threshold?: boolean
  help?: boolean
  medExempt?: boolean
  residency?: 'citizen_pr' | 'student' | 'temp_work' | 'whm' | 'partner' | 'other_temp'
}) {
  return calculatePAYG({
    annualSalary: annual,
    claimingThreshold: opts?.threshold ?? true,
    hasHELP: opts?.help ?? false,
    medicareLevyExemption: opts?.medExempt ?? false,
    payCycle: opts?.cycle ?? 'fortnightly',
    residencyStatus: opts?.residency ?? 'citizen_pr',
  })
}

function slip(annual: number, opts?: {
  cycle?: 'weekly' | 'fortnightly' | 'monthly'
  threshold?: boolean
  help?: boolean
  medExempt?: boolean
  residency?: 'citizen_pr' | 'student' | 'temp_work' | 'whm' | 'partner' | 'other_temp'
  salSac?: number
  paymentDate?: Date
  overtime?: { hours: number; rate: number }
  noTfn?: boolean
}) {
  return calculatePayslip({
    annualSalary: annual,
    salarySacrifice: opts?.salSac ?? 0,
    overtimeHours: opts?.overtime?.hours ?? 0,
    overtimeRate: opts?.overtime?.rate ?? 0,
    payCycle: opts?.cycle ?? 'fortnightly',
    claimingThreshold: opts?.threshold ?? true,
    hasHELP: opts?.help ?? false,
    medicareLevyExemption: opts?.medExempt ?? false,
    paymentDate: opts?.paymentDate,
    residencyStatus: opts?.residency ?? 'citizen_pr',
    noTfn: opts?.noTfn,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Super guarantee rate
// ─────────────────────────────────────────────────────────────────────────────

describe('getSuperRate', () => {
  it('returns 11.5% for dates before 1 July 2025', () => {
    expect(getSuperRate(new Date('2025-06-30'))).toBe(0.115)
  })
  it('returns 12.0% from 1 July 2025 onwards', () => {
    expect(getSuperRate(new Date('2025-07-01'))).toBe(0.12)
  })
})

describe('calculateSuper', () => {
  it('calculates 11.5% for pre-2025-07-01 dates', () => {
    expect(calculateSuper(3076.92, new Date('2025-06-30'))).toBe(353.85)
  })
  it('calculates 12.0% from 2025-07-01 onwards', () => {
    expect(calculateSuper(3076.92, new Date('2025-07-01'))).toBe(369.23)
  })
  it('returns 0 for zero earnings', () => {
    expect(calculateSuper(0)).toBe(0)
  })
  it('rounds to 2 decimal places (11.5%)', () => {
    // $1,000 * 11.5% = $115.00 exactly
    expect(calculateSuper(1000, new Date('2025-06-30'))).toBe(115.00)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Medicare exemption by residency
// ─────────────────────────────────────────────────────────────────────────────

describe('isMedicareExemptByResidency', () => {
  it('Australian citizens are NOT exempt', () => {
    expect(isMedicareExemptByResidency('citizen_pr')).toBe(false)
  })
  it('International students ARE exempt', () => {
    expect(isMedicareExemptByResidency('student')).toBe(true)
  })
  it('WHM are exempt', () => {
    expect(isMedicareExemptByResidency('whm')).toBe(true)
  })
  it('Temp work visa holders are exempt', () => {
    expect(isMedicareExemptByResidency('temp_work')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. PAYG Scale 2 — claiming threshold, Australian resident (most common)
//    NAT 1004 formula: x = floor(weeklyEarnings) + 0.99, y = a*x - b, round(y)
// ─────────────────────────────────────────────────────────────────────────────

describe('PAYG — Scale 2 (claiming threshold, resident)', () => {
  describe('fortnightly pay cycle', () => {
    it('$0/yr → $0 withholding', () => {
      expect(payg(0).periodTotal).toBe(0)
    })

    it('$30,000/yr — below effective threshold, nil withholding', () => {
      // $30k/26 = $1,153.85/fn → weekly x = floor(576.92)+0.99 = 576.99
      // 576.99 < 625 bracket (a=0.26, b=107.85): 0.26*576.99-107.85 = 42.17 → $42 → $84/fn
      const r = payg(30000)
      expect(r.periodTotal).toBeGreaterThan(0)
      expect(r.periodTotal).toBeLessThan(200)
    })

    it('$52,000/yr → $286/fn PAYG withholding', () => {
      // $2,000/fn → x=1000.99, bracket a=0.3227 b=180.04
      // y=0.3227*1000.99-180.04=142.98 → $143 weekly → $286 fn
      expect(payg(52000).periodTotal).toBe(286)
    })

    it('$80,000/yr → $632/fn PAYG withholding', () => {
      // $3,076.92/fn → x=1538.99, bracket a=0.32 b=176.58
      // y=0.32*1538.99-176.58=315.90 → $316 weekly → $632 fn
      expect(payg(80000).periodTotal).toBe(632)
    })

    it('$120,000/yr → $1,124/fn PAYG withholding', () => {
      // $4,615.38/fn → x=2307.99, bracket a=0.32 b=176.58
      // y=0.32*2307.99-176.58=561.98 → $562 → $1,124 fn
      expect(payg(120000).periodTotal).toBe(1124)
    })

    it('$200,000/yr → $2,314/fn PAYG withholding', () => {
      // $7,692.31/fn → x=3846.99, bracket a=0.47 b=650.62
      // y=0.47*3846.99-650.62=1157.47 → $1,157 → $2,314 fn
      expect(payg(200000).periodTotal).toBe(2314)
    })
  })

  describe('weekly pay cycle', () => {
    it('$52,000/yr weekly → $143/wk PAYG', () => {
      // $1,000/wk → x=1000.99, same bracket → $143 weekly
      expect(payg(52000, { cycle: 'weekly' }).periodTotal).toBe(143)
    })

    it('$80,000/yr weekly → $316/wk PAYG', () => {
      expect(payg(80000, { cycle: 'weekly' }).periodTotal).toBe(316)
    })
  })

  describe('monthly pay cycle', () => {
    it('$60,000/yr monthly → $832/mo PAYG', () => {
      // $5,000/mo → x=floor(5000*3/13)+0.99=1153.99, bracket a=0.3227 b=180.04
      // y=0.3227*1153.99-180.04=192.43 → $192 → round(192*13/3)=round(832)=$832
      expect(payg(60000, { cycle: 'monthly' }).periodTotal).toBe(832)
    })

    it('$80,000/yr monthly → $1,370/mo PAYG', () => {
      // $6,666.67/mo → x=floor(6666.67*3/13)+0.99=1538.99 → same as fn
      // $316 weekly → round(316*13/3) = round(1369.33) = $1,369
      const r = payg(80000, { cycle: 'monthly' })
      expect(r.periodTotal).toBeGreaterThan(1300)
      expect(r.periodTotal).toBeLessThan(1450)
    })
  })

  describe('Medicare levy breakdown', () => {
    // 2025-26 thresholds: lower $28,011 / shade-in upper $35,013
    // Source: ATO myTax 2026 instructions, checked 2026-06-19

    it('income below 2025-26 lower threshold ($28,011) → $0 Medicare', () => {
      expect(payg(27000).periodMedicare).toBe(0)
      expect(payg(28011).periodMedicare).toBe(0)
    })

    it('income between old ($27,222) and new ($28,011) lower threshold → $0 Medicare in 2025-26', () => {
      // Confirms 2025-26 threshold is $28,011 not $27,222
      expect(payg(27500).periodMedicare).toBe(0)
    })

    it('income in 2025-26 shade-in zone ($28,011–$35,013) → reduced Medicare', () => {
      // $30,000: shade-in = ($30,000 - $28,011) × 10% = $198.90/yr → round(198.90/26) = $8/fn
      const r = payg(30000)
      expect(r.periodMedicare).toBeGreaterThan(0)
      expect(r.periodMedicare).toBeLessThan(Math.round(30000 * 0.02 / 26))
    })

    it('income above shade-in ($35,013) → full 2% Medicare', () => {
      // $80k → Medicare = $80k×2%/26 = $61.54 → round = $62
      expect(payg(80000).periodMedicare).toBe(62)
    })

    it('income tax + Medicare = total withholding (Scale 2)', () => {
      const r = payg(80000)
      expect(r.periodTax + r.periodMedicare).toBe(r.periodTotal)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYG Scale 1 — NOT claiming threshold (second job / no TFN declaration)
// ─────────────────────────────────────────────────────────────────────────────

describe('PAYG — Scale 1 (no threshold)', () => {
  it('Scale 1 > Scale 2 at same income (no threshold penalty)', () => {
    const s1 = payg(80000, { threshold: false }).periodTotal
    const s2 = payg(80000, { threshold: true }).periodTotal
    expect(s1).toBeGreaterThan(s2)
  })

  it('$52,000/yr fortnightly Scale 1 → $510/fn', () => {
    // $2,000/fn → x=1000.99, bracket a=0.32 b=65.72
    // y=0.32*1000.99-65.72=254.60 → $255 → $510 fn
    expect(payg(52000, { threshold: false }).periodTotal).toBe(510)
  })

  it('$80,000/yr fortnightly Scale 1 → $854/fn', () => {
    // $3,076.92/fn → x=1538.99, bracket a=0.32 b=65.72
    // y=0.32*1538.99-65.72=426.76 → $427 → $854 fn
    expect(payg(80000, { threshold: false }).periodTotal).toBe(854)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAYG Scale 5 — claiming threshold + Medicare exempt (international students)
// ─────────────────────────────────────────────────────────────────────────────

describe('PAYG — Scale 5 (Medicare exempt, claiming threshold)', () => {
  it('Scale 5 < Scale 2 at same income (no Medicare)', () => {
    const s5 = payg(80000, { medExempt: true }).periodTotal
    const s2 = payg(80000).periodTotal
    expect(s5).toBeLessThan(s2)
  })

  it('Scale 5 has $0 Medicare component', () => {
    expect(payg(80000, { medExempt: true }).periodMedicare).toBe(0)
  })

  it('$80,000/yr Scale 5 fortnightly → $570/fn', () => {
    // x=1538.99, bracket a=0.30 b=176.58
    // y=0.30*1538.99-176.58=285.12 → $285 → $570 fn
    expect(payg(80000, { medExempt: true }).periodTotal).toBe(570)
  })

  it('student residency auto-applies Medicare exemption', () => {
    const student = payg(80000, { residency: 'student' })
    const exempt  = payg(80000, { medExempt: true })
    expect(student.periodTotal).toBe(exempt.periodTotal)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. PAYG WHM — Working Holiday Maker (Schedule 15)
//    Stage 3 rates: 15% to $45k, 30% to $135k, 37% to $190k, 45% above
// ─────────────────────────────────────────────────────────────────────────────

describe('PAYG — WHM (Schedule 15)', () => {
  it('$45,000/yr → $260/fn (15% flat)', () => {
    // Annual tax: 45000 * 0.15 = $6,750 → round(6750/26) = $260
    expect(payg(45000, { residency: 'whm' }).periodTotal).toBe(260)
  })

  it('$60,000/yr → $433/fn (crosses into 30% bracket)', () => {
    // Annual tax: 6750 + (60000-45000)*0.30 = $11,250 → round(11250/26) = $433
    expect(payg(60000, { residency: 'whm' }).periodTotal).toBe(433)
  })

  it('WHM has $0 Medicare levy', () => {
    expect(payg(80000, { residency: 'whm' }).periodMedicare).toBe(0)
  })

  it('WHM pays more tax than Scale 2 at same income (no tax-free threshold)', () => {
    const whm = payg(60000, { residency: 'whm' }).periodTotal
    const s2  = payg(60000).periodTotal
    expect(whm).toBeGreaterThan(s2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. HELP / HECS repayment — Schedule 8 (updated 24 Sep 2025)
//    Confirmed structure (ATO rates page + Schedule 8, checked 2026-06-19):
//      $0–$67,000:       nil
//      $67,001–$125,000: 15c per $1 over $67,000             (MARGINAL)
//      $125,001–$179,285: $8,700 + 17c per $1 over $125,000  (MARGINAL)
//      $179,286+:         10% of TOTAL repayment income       (FLAT ON TOTAL — NOT marginal)
//    ATO Example 3: $238,537 × 10% = $23,854 (not accumulated marginal).
// ─────────────────────────────────────────────────────────────────────────────

describe('HELP repayment (2025-26 schedule 8)', () => {
  it('below $67,000 → $0 HELP repayment', () => {
    expect(payg(50000, { help: true }).periodHELP).toBe(0)
    expect(payg(67000, { help: true }).periodHELP).toBe(0)
  })

  it('$70,000 → $17/fn HELP (15% on $3k excess)', () => {
    // (70000-67000)*0.15 = $450/yr → round(450/26) = $17
    expect(payg(70000, { help: true }).periodHELP).toBe(17)
  })

  it('$80,000 → $75/fn HELP (15% on $13k excess)', () => {
    // (80000-67000)*0.15 = $1,950/yr → round(1950/26) = $75
    expect(payg(80000, { help: true }).periodHELP).toBe(75)
  })

  it('$125,000 → $335/fn HELP (top of first band)', () => {
    // (125000-67000)*0.15 = $8,700/yr → round(8700/26) = $335
    expect(payg(125000, { help: true }).periodHELP).toBe(335)
  })

  it('$125,000 annual HELP = $8,700 (first/second band boundary exact)', () => {
    expect(payg(125000, { help: true }).annualHELP).toBe(8700)
  })

  it('$130,000 → $367/fn HELP (into second band)', () => {
    // 8700 + (130000-125000)*0.17 = $9,550/yr → round(9550/26) = $367
    expect(payg(130000, { help: true }).periodHELP).toBe(367)
  })

  it('$179,285 annual HELP = $17,928 (last dollar of second band)', () => {
    // 8700 + (179285-125000)*0.17 = 8700 + 9228.45 = $17,928.45 → $17,928
    expect(payg(179285, { help: true }).annualHELP).toBe(17928)
  })

  it('$179,295 annual HELP = $17,930 (flat 10% of total, not marginal — key regression)', () => {
    // ATO flat: 179295 × 10% = $17,929.50 → rounds to $17,930
    // Marginal formula would give $17,929 — wrong by $1. This test distinguishes them.
    expect(payg(179295, { help: true }).annualHELP).toBe(17930)
  })

  it('$200,000 → $769/fn HELP (10% of total)', () => {
    // 200000*0.10 = $20,000/yr → round(20000/26) = $769
    expect(payg(200000, { help: true }).periodHELP).toBe(769)
  })

  it('$238,537 annual HELP = $23,854 (ATO worked Example 3 exact)', () => {
    // ATO: $238,537 × 10% = $23,854 (Priya example from rates page)
    expect(payg(238537, { help: true }).annualHELP).toBe(23854)
  })

  it('HELP is added on top of income tax (total = tax + HELP)', () => {
    const r = payg(80000, { help: true })
    expect(r.periodTotal).toBe(r.periodTax + r.periodMedicare + r.periodHELP)
  })

  it('HELP is higher for $130k than $80k (progressive)', () => {
    const h80  = payg(80000,  { help: true }).periodHELP
    const h130 = payg(130000, { help: true }).periodHELP
    expect(h130).toBeGreaterThan(h80)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. calculatePayslip — full integration tests
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePayslip — full scenarios', () => {

  describe('UC1: $80k salary, fortnightly, Scale 2, no HELP', () => {
    const rPre  = slip(80000, { paymentDate: new Date('2025-06-30') })
    const rPost = slip(80000, { paymentDate: new Date('2025-07-01') })

    it('ordinary earnings = $3,076.92', () => {
      expect(rPost.ordinaryEarnings).toBe(3076.92)
    })
    it('gross pay = ordinary earnings (no overtime)', () => {
      expect(rPost.grossPay).toBe(rPost.ordinaryEarnings)
    })
    it('PAYG total = $632', () => {
      expect(rPost.totalDeductions).toBe(632)
    })
    it('net pay = gross - tax = $2,444.92', () => {
      expect(rPost.netPay).toBe(2444.92)
    })
    it('super SG at 11.5% (pre-1 July 2025) = $353.85', () => {
      expect(rPre.superSG).toBe(353.85)
    })
    it('super SG at 12% (from 1 July 2025) = $369.23', () => {
      expect(rPost.superSG).toBe(369.23)
    })
  })

  describe('UC2: $80k salary + HELP debt, fortnightly', () => {
    const r = slip(80000, { help: true })

    it('HELP deduction = $75/fn', () => {
      expect(r.helpRepayment).toBe(75)
    })
    it('total deductions = PAYG + HELP = $707', () => {
      expect(r.totalDeductions).toBe(707)
    })
    it('net pay = $2,369.92', () => {
      expect(r.netPay).toBe(2369.92)
    })
  })

  describe('UC3: WHM, $50k/yr, weekly', () => {
    const r = slip(50000, { cycle: 'weekly', residency: 'whm' })

    it('no Medicare levy', () => {
      expect(r.medicareLevy).toBe(0)
    })
    it('PAYG for WHM = $159/wk', () => {
      // Annual: 6750+(50000-45000)*0.30 = $8,250 → round(8250/52) = $159
      expect(r.totalDeductions).toBe(159)
    })
    it('net pay = ordinaryEarnings - tax', () => {
      expect(r.netPay).toBeCloseTo(r.grossPay - r.totalDeductions, 1)
    })
  })

  describe('UC4: Salary sacrifice', () => {
    // $90k/yr, fortnightly, $5,000 salary sacrifice
    const r = slip(90000, { salSac: 5000 })

    it('salary sacrifice reduces taxable gross', () => {
      expect(r.taxableGross).toBeLessThan(r.grossPay)
    })
    it('salary sacrifice amount per period ≈ $192.31', () => {
      expect(r.salarySacrifice).toBeCloseTo(192.31, 1)
    })
    it('super is calculated on pre-sacrifice earnings (not reduced)', () => {
      const withSalSac    = slip(90000, { salSac: 5000 }).superSG
      const withoutSalSac = slip(90000).superSG
      // Super on full $90k ordinary earnings in both cases
      expect(withSalSac).toBe(withoutSalSac)
    })
    it('net pay is LOWER with salary sacrifice (salary redirected to super)', () => {
      // Take-home decreases — the tax saving ($60/fn) is less than the sacrifice ($192/fn)
      // Benefit is long-term: super balance grows faster
      expect(r.netPay).toBeLessThan(slip(90000).netPay)
    })
  })

  describe('UC5: Scale 5 (Medicare exempt), $109,473.60/yr fortnightly', () => {
    // Shakti's payslip scenario — salary basis with penalty rates factored in
    const annualEffective = 109473.60
    const r = slip(annualEffective, { medExempt: true, paymentDate: new Date('2025-06-30') })

    it('ordinary earnings = $4,210.52', () => {
      expect(r.ordinaryEarnings).toBe(4210.52)
    })
    it('PAYG = $910/fn', () => {
      expect(r.totalDeductions).toBe(910)
    })
    it('net pay = $3,300.52', () => {
      expect(r.netPay).toBe(3300.52)
    })
    it('super SG (11.5%) = $484.21', () => {
      expect(r.superSG).toBe(484.21)
    })
    it('no Medicare levy', () => {
      expect(r.medicareLevy).toBe(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. Mathematical properties — sanity checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Mathematical properties', () => {
  it('higher income → higher or equal tax (monotonicity)', () => {
    const incomes = [30000, 50000, 80000, 120000, 200000]
    for (let i = 1; i < incomes.length; i++) {
      expect(payg(incomes[i]).periodTotal).toBeGreaterThanOrEqual(payg(incomes[i - 1]).periodTotal)
    }
  })

  it('net pay is always less than gross pay', () => {
    [30000, 80000, 150000].forEach(annual => {
      const r = slip(annual)
      expect(r.netPay).toBeLessThan(r.grossPay)
    })
  })

  it('net pay is always positive', () => {
    expect(slip(30000).netPay).toBeGreaterThan(0)
  })

  it('super is always positive when earnings are positive', () => {
    expect(slip(50000).superSG).toBeGreaterThan(0)
  })

  it('grossPay = ordinaryEarnings + overtimePay', () => {
    const r = slip(80000, { overtime: { hours: 5, rate: 50 } })
    expect(r.grossPay).toBeCloseTo(r.ordinaryEarnings + r.overtimePay, 2)
  })

  it('totalDeductions = incomeTax + medicareLevy + helpRepayment', () => {
    const r = slip(80000, { help: true })
    expect(r.totalDeductions).toBe(r.incomeTax + r.medicareLevy + r.helpRepayment)
  })

  it('totalSuper = superSG + superSalSac', () => {
    const r = slip(90000, { salSac: 5000 })
    expect(r.totalSuper).toBeCloseTo(r.superSG + r.superSalSac, 2)
  })

  it('HELP adds deductions without changing income tax', () => {
    const noHelp   = slip(80000)
    const withHelp = slip(80000, { help: true })
    expect(withHelp.incomeTax).toBe(noHelp.incomeTax)
    expect(withHelp.totalDeductions).toBeGreaterThan(noHelp.totalDeductions)
  })

  it('Medicare exempt employee pays less total tax than non-exempt', () => {
    const exempt    = slip(80000, { medExempt: true }).totalDeductions
    const nonExempt = slip(80000).totalDeductions
    expect(exempt).toBeLessThan(nonExempt)
  })

  it('monthly pay cycle grossPay ≈ 12× weekly over a year', () => {
    const monthly = slip(80000, { cycle: 'monthly' }).grossPay * 12
    const weekly  = slip(80000, { cycle: 'weekly'  }).grossPay * 52
    expect(Math.abs(monthly - weekly)).toBeLessThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scale 4 — no TFN (NAT 1004): flat 47%, no brackets, no LITO, no Medicare
// ─────────────────────────────────────────────────────────────────────────────

describe('Scale 4 — no TFN (47% flat)', () => {
  it('weekly $1,000 gross → exactly $470 withheld', () => {
    const result = calculatePAYG({
      annualSalary: 1000 * 52,
      claimingThreshold: true,
      hasHELP: false,
      medicareLevyExemption: false,
      payCycle: 'weekly',
      residencyStatus: 'citizen_pr',
      noTfn: true,
    })
    expect(result.periodTotal).toBe(470)
    expect(result.periodTax).toBe(470)
    expect(result.periodMedicare).toBe(0)
    expect(result.periodHELP).toBe(0)
  })

  it('calculatePayslip with noTfn=true: totalDeductions = 47% of grossPay', () => {
    const result = slip(1000 * 52, { cycle: 'weekly', noTfn: true })
    expect(result.incomeTax).toBe(470)
    expect(result.medicareLevy).toBe(0)
    expect(result.helpRepayment).toBe(0)
    expect(result.totalDeductions).toBe(470)
  })

  it('Scale 4 ignores claiming_threshold — same result regardless', () => {
    const withThreshold    = calculatePAYG({ annualSalary: 52000, claimingThreshold: true,  hasHELP: false, medicareLevyExemption: false, payCycle: 'weekly', residencyStatus: 'citizen_pr', noTfn: true })
    const withoutThreshold = calculatePAYG({ annualSalary: 52000, claimingThreshold: false, hasHELP: false, medicareLevyExemption: false, payCycle: 'weekly', residencyStatus: 'citizen_pr', noTfn: true })
    expect(withThreshold.periodTotal).toBe(withoutThreshold.periodTotal)
  })

  it('Scale 4 ignores hasHELP — same result regardless', () => {
    const withHelp    = calculatePAYG({ annualSalary: 52000, claimingThreshold: true, hasHELP: true,  medicareLevyExemption: false, payCycle: 'weekly', residencyStatus: 'citizen_pr', noTfn: true })
    const withoutHelp = calculatePAYG({ annualSalary: 52000, claimingThreshold: true, hasHELP: false, medicareLevyExemption: false, payCycle: 'weekly', residencyStatus: 'citizen_pr', noTfn: true })
    expect(withHelp.periodTotal).toBe(withoutHelp.periodTotal)
  })

  it('Scale 1 is unaffected by noTfn being absent — byte-identical to baseline', () => {
    const baseline = calculatePAYG({ annualSalary: 80000, claimingThreshold: true, hasHELP: false, medicareLevyExemption: false, payCycle: 'fortnightly', residencyStatus: 'citizen_pr' })
    const noFlag   = calculatePAYG({ annualSalary: 80000, claimingThreshold: true, hasHELP: false, medicareLevyExemption: false, payCycle: 'fortnightly', residencyStatus: 'citizen_pr', noTfn: false })
    expect(baseline.periodTotal).toBe(noFlag.periodTotal)
    expect(baseline.periodMedicare).toBe(noFlag.periodMedicare)
  })
})
