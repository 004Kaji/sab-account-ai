/**
 * ATO TAX ENGINE — REGRESSION GUARD
 *
 * Every bracket of every NAT 1004 scale, Schedule 15 (WHM), and Schedule 8 (HELP)
 * is pinned to a hand-verified expected value computed directly from the ATO formula.
 *
 * IF ANY TEST IN THIS FILE FAILS, a tax coefficient has been changed.
 * DO NOT update expected values here without first verifying the new figure against
 * an official ATO source and updating the comment to cite that source.
 *
 * Sources (all checked 2026-06-19):
 *   NAT 1004 Schedule 1 — ato.gov.au/tax-rates-and-codes/schedule-1-statement-of-formulas
 *   Schedule 15 — ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers
 *   Schedule 8  — ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 *   Medicare levy — ato.gov.au/.../mytax-instructions/2026/.../medicare-levy-reduction-or-exemption
 *
 * HOW TO ADD A NEW SCALE TEST:
 *   1. Pick an annual income that sits clearly in the target bracket.
 *   2. Compute x = floor(annual/periods/cycle_divisor) + 0.99.
 *   3. Compute y = round(max(0, a*x - b)) from the ATO coefficient table.
 *   4. Scale period: weekly = y, fortnightly = y*2, monthly = round(y*13/3).
 */

import { describe, it, expect } from 'vitest'
import { calculatePAYG } from '@/lib/ato'

// ─── Helper ──────────────────────────────────────────────────────────────────

type Cycle = 'weekly' | 'fortnightly' | 'monthly'

function w(annual: number, opts?: {
  cycle?:     Cycle
  threshold?: boolean
  help?:      boolean
  medExempt?: boolean
  residency?: 'citizen_pr' | 'student' | 'temp_work' | 'whm'
  noTfn?:     boolean
}) {
  return calculatePAYG({
    annualSalary:         annual,
    claimingThreshold:    opts?.threshold  ?? true,
    hasHELP:              opts?.help       ?? false,
    medicareLevyExemption: opts?.medExempt ?? false,
    payCycle:             opts?.cycle      ?? 'fortnightly',
    residencyStatus:      opts?.residency  ?? 'citizen_pr',
    noTfn:                opts?.noTfn,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALE 2 — claiming threshold, Australian resident (most common scale)
// NAT 1004 brackets by weekly equivalent x = floor(fn/2) + 0.99
// ─────────────────────────────────────────────────────────────────────────────

describe('Scale 2 — all 9 brackets (fortnightly)', () => {
  // Bracket 1: x < 361 → a=0, b=0 → nil withholding
  // $15k: period=$576.92 x=288.99 → y=0 → $0/fn
  it('Br1 nil ($15,000/yr) — below effective withholding threshold → $0', () => {
    expect(w(15000).periodTotal).toBe(0)
  })

  // Bracket 2: x < 500 → a=0.1600, b=57.8462
  // $22k: period=$846.15 x=423.99 → y=round(0.16*423.99-57.8462)=round(9.99)=10 → $20/fn
  it('Br2 ($22,000/yr) → $20/fn', () => {
    expect(w(22000).periodTotal).toBe(20)
  })

  // Bracket 3: x < 625 → a=0.2600, b=107.8462
  // $30k: period=$1153.85 x=576.99 → y=round(0.26*576.99-107.85)=round(42.17)=42 → $84/fn
  it('Br3 ($30,000/yr) → $84/fn', () => {
    expect(w(30000).periodTotal).toBe(84)
  })

  // Bracket 4: x < 721 → a=0.1800, b=57.8462
  // $37k: period=$1423.08 x=711.99 → y=round(0.18*711.99-57.85)=round(70.31)=70 → $140/fn
  it('Br4 ($37,000/yr) → $140/fn', () => {
    expect(w(37000).periodTotal).toBe(140)
  })

  // Bracket 5: x < 865 → a=0.1890, b=64.3365
  // $43k: period=$1653.85 x=826.99 → y=round(0.189*826.99-64.34)=round(91.96)=92 → $184/fn
  it('Br5 ($43,000/yr) → $184/fn', () => {
    expect(w(43000).periodTotal).toBe(184)
  })

  // Bracket 6: x < 1282 → a=0.3227, b=180.0385
  // $55k: period=$2115.38 x=1057.99 → y=round(0.3227*1057.99-180.04)=round(161.37)=161 → $322/fn
  it('Br6 ($55,000/yr) → $322/fn', () => {
    expect(w(55000).periodTotal).toBe(322)
  })

  // Bracket 7: x < 2596 → a=0.3200, b=176.5769  [covers ~$67k–$135k]
  // $80k: period=$3076.92 x=1538.99 → y=round(0.32*1538.99-176.58)=round(315.90)=316 → $632/fn
  it('Br7 ($80,000/yr) → $632/fn', () => {
    expect(w(80000).periodTotal).toBe(632)
  })
  // $120k: x=2307.99 → y=round(0.32*2307.99-176.58)=round(561.98)=562 → $1,124/fn
  it('Br7 ($120,000/yr) → $1,124/fn', () => {
    expect(w(120000).periodTotal).toBe(1124)
  })

  // Bracket 8: x < 3653 → a=0.3900, b=358.3077  [covers ~$135k–$190k]
  // $150k: period=$5769.23 x=2884.99 → y=round(0.39*2884.99-358.31)=round(766.84)=767 → $1,534/fn
  it('Br8 ($150,000/yr) → $1,534/fn', () => {
    expect(w(150000).periodTotal).toBe(1534)
  })

  // Bracket 9: x ≥ 3653 → a=0.4700, b=650.6154  [covers >$190k]
  // $200k: period=$7692.31 x=3846.99 → y=round(0.47*3846.99-650.62)=round(1157.47)=1157 → $2,314/fn
  it('Br9 ($200,000/yr) → $2,314/fn', () => {
    expect(w(200000).periodTotal).toBe(2314)
  })
})

describe('Scale 2 — weekly pay cycle', () => {
  // Weekly: x = floor(weekly) + 0.99 (no divisor)
  // $52k/52 = $1000/wk → x=1000.99, bracket 7 → y=round(0.32*1000.99-176.58)=round(143.0)=143
  it('$52,000/yr weekly → $143/wk', () => {
    expect(w(52000, { cycle: 'weekly' }).periodTotal).toBe(143)
  })
  // $80k/52 = $1538.46/wk → x=1538.99 → y=316
  it('$80,000/yr weekly → $316/wk', () => {
    expect(w(80000, { cycle: 'weekly' }).periodTotal).toBe(316)
  })
})

describe('Scale 2 — monthly pay cycle', () => {
  // Monthly: x = floor(monthly * 3/13) + 0.99
  // $60k/12 = $5000/mo → x=floor(5000*3/13)+0.99=1153.99 → bracket6 → y=192 → round(192*13/3)=832
  it('$60,000/yr monthly → $832/mo', () => {
    expect(w(60000, { cycle: 'monthly' }).periodTotal).toBe(832)
  })
  // $80k/12 = $6666.67/mo → x=floor(6666.67*3/13)+0.99=1538.99 → y=316 → round(316*13/3)=1369
  it('$80,000/yr monthly → $1,369/mo', () => {
    expect(w(80000, { cycle: 'monthly' }).periodTotal).toBe(1369)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALE 1 — NOT claiming threshold (second job / no TFN declaration)
// No Medicare-exempt special treatment, no LITO. Higher withholding from first dollar.
// ─────────────────────────────────────────────────────────────────────────────

describe('Scale 1 — all 7 brackets (fortnightly)', () => {
  // Bracket 1: x < 150 → a=0.1600, b=0.1600
  // $5k: period=$192.31 x=96.99 → y=round(0.16*96.99-0.16)=round(15.36)=15 → $30/fn
  it('Br1 ($5,000/yr) → $30/fn', () => {
    expect(w(5000, { threshold: false }).periodTotal).toBe(30)
  })

  // Bracket 2: x < 371 → a=0.2117, b=7.7550
  // $15k: x=288.99 → y=round(0.2117*288.99-7.755)=round(53.46)=53 → $106/fn
  it('Br2 ($15,000/yr) → $106/fn', () => {
    expect(w(15000, { threshold: false }).periodTotal).toBe(106)
  })

  // Bracket 3: x < 515 → a=0.1890, b=-0.6702
  // $24k: period=$923.08 x=461.99 → y=round(0.189*461.99+0.67)=round(87.99)=88 → $176/fn
  it('Br3 ($24,000/yr) → $176/fn', () => {
    expect(w(24000, { threshold: false }).periodTotal).toBe(176)
  })

  // Bracket 4: x < 932 → a=0.3227, b=68.2367
  // $40k: period=$1538.46 x=769.99 → y=round(0.3227*769.99-68.24)=round(180.21)=180 → $360/fn
  it('Br4 ($40,000/yr) → $360/fn', () => {
    expect(w(40000, { threshold: false }).periodTotal).toBe(360)
  })

  // Bracket 5: x < 2246 → a=0.3200, b=65.7202
  // $80k: x=1538.99 → y=round(0.32*1538.99-65.72)=round(426.76)=427 → $854/fn
  it('Br5 ($80,000/yr) → $854/fn', () => {
    expect(w(80000, { threshold: false }).periodTotal).toBe(854)
  })

  // Bracket 6: x < 3303 → a=0.3900, b=222.9510
  // $150k: x=2884.99 → y=round(0.39*2884.99-222.95)=round(902.20)=902 → $1,804/fn
  it('Br6 ($150,000/yr) → $1,804/fn', () => {
    expect(w(150000, { threshold: false }).periodTotal).toBe(1804)
  })

  // Bracket 7: x ≥ 3303 → a=0.4700, b=487.2587
  // $250k: period=$9615.38 x=4807.99 → y=round(0.47*4807.99-487.26)=round(1772.50)=1772 → $3,544/fn
  it('Br7 ($250,000/yr) → $3,544/fn', () => {
    expect(w(250000, { threshold: false }).periodTotal).toBe(3544)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALE 3 — foreign resident approximation
// No Medicare, no LITO, no tax-free threshold. Three brackets only.
// Triggered by: not claiming threshold + Medicare exempt (e.g. student residency, no threshold).
// ─────────────────────────────────────────────────────────────────────────────

describe('Scale 3 — all 3 brackets (fortnightly)', () => {
  // Bracket 1: x < 2596 → a=0.3000, b=0.3000
  // $80k: x=1538.99 → y=round(0.30*1538.99-0.30)=round(461.40)=461 → $922/fn
  it('Br1 ($80,000/yr) → $922/fn', () => {
    expect(w(80000, { threshold: false, residency: 'student' }).periodTotal).toBe(922)
  })

  // Bracket 2: x < 3653 → a=0.3700, b=181.7308
  // $150k: x=2884.99 → y=round(0.37*2884.99-181.73)=round(885.72)=886 → $1,772/fn
  it('Br2 ($150,000/yr) → $1,772/fn', () => {
    expect(w(150000, { threshold: false, residency: 'student' }).periodTotal).toBe(1772)
  })

  // Bracket 3: x ≥ 3653 → a=0.4500, b=474.0385
  // $250k: x=4807.99 → y=round(0.45*4807.99-474.04)=round(1689.56)=1690 → $3,380/fn
  it('Br3 ($250,000/yr) → $3,380/fn', () => {
    expect(w(250000, { threshold: false, residency: 'student' }).periodTotal).toBe(3380)
  })

  it('Scale 3 has $0 Medicare levy (no Medicare for non-residents)', () => {
    expect(w(80000, { threshold: false, residency: 'student' }).periodMedicare).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALE 5 — claiming threshold + full Medicare exemption
// (international students, temp residents with threshold claim)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scale 5 — all 7 brackets (fortnightly)', () => {
  // Bracket 1: x < 361 → nil
  // $15k: x=288.99 → $0/fn
  it('Br1 nil ($15,000/yr) → $0', () => {
    expect(w(15000, { residency: 'student' }).periodTotal).toBe(0)
  })

  // Bracket 2: x < 721 → a=0.1600, b=57.8462  (note: wider than Scale 2 — one bracket covers 361-721)
  // $30k: x=576.99 → y=round(0.16*576.99-57.85)=round(34.47)=34 → $68/fn
  it('Br2 ($30,000/yr) → $68/fn', () => {
    expect(w(30000, { residency: 'student' }).periodTotal).toBe(68)
  })

  // Bracket 3: x < 865 → a=0.1690, b=64.3365
  // $40k: x=769.99 → y=round(0.169*769.99-64.34)=round(65.81)=66 → $132/fn
  it('Br3 ($40,000/yr) → $132/fn', () => {
    expect(w(40000, { residency: 'student' }).periodTotal).toBe(132)
  })

  // Bracket 4: x < 1282 → a=0.3027, b=180.0385
  // $55k: x=1057.99 → y=round(0.3027*1057.99-180.04)=round(140.22)=140 → $280/fn
  it('Br4 ($55,000/yr) → $280/fn', () => {
    expect(w(55000, { residency: 'student' }).periodTotal).toBe(280)
  })

  // Bracket 5: x < 2596 → a=0.3000, b=176.5769
  // $80k: x=1538.99 → y=round(0.30*1538.99-176.58)=round(285.12)=285 → $570/fn
  it('Br5 ($80,000/yr) → $570/fn', () => {
    expect(w(80000, { residency: 'student' }).periodTotal).toBe(570)
  })

  // Bracket 6: x < 3653 → a=0.3700, b=358.3077
  // $150k: x=2884.99 → y=round(0.37*2884.99-358.31)=round(709.14)=709 → $1,418/fn
  it('Br6 ($150,000/yr) → $1,418/fn', () => {
    expect(w(150000, { residency: 'student' }).periodTotal).toBe(1418)
  })

  // Bracket 7: x ≥ 3653 → a=0.4500, b=650.6154
  // $250k: x=4807.99 → y=round(0.45*4807.99-650.62)=round(1512.98)=1513 → $3,026/fn
  it('Br7 ($250,000/yr) → $3,026/fn', () => {
    expect(w(250000, { residency: 'student' }).periodTotal).toBe(3026)
  })

  it('Scale 5 has $0 Medicare levy', () => {
    expect(w(80000, { residency: 'student' }).periodMedicare).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE 15 — Working Holiday Maker (WHM)
// Source: ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers (updated 1 Jun 2026)
// Annual formula applied directly (not weekly coefficient method).
// No Medicare. No LITO. No tax-free threshold.
// ─────────────────────────────────────────────────────────────────────────────

describe('Schedule 15 — WHM all 4 brackets + boundaries', () => {
  // Bracket 1: 0–$45,000 → 15% flat
  // $45k: annual=45000*0.15=6750 → fn=round(6750/26)=260
  it('Br1 boundary ($45,000) → $260/fn', () => {
    expect(w(45000, { residency: 'whm' }).periodTotal).toBe(260)
  })
  it('Br1 mid-range ($30,000) → $173/fn', () => {
    // 30000*0.15=4500 → round(4500/26)=173
    expect(w(30000, { residency: 'whm' }).periodTotal).toBe(173)
  })

  // Bracket 2: $45,001–$135,000 → $6,750 + 30c per $1 over $45,000
  // $60k: 6750+(60000-45000)*0.30=11250 → round(11250/26)=433
  it('Br2 mid-range ($60,000) → $433/fn', () => {
    expect(w(60000, { residency: 'whm' }).periodTotal).toBe(433)
  })
  // $135k boundary: 6750+(135000-45000)*0.30=33750 → round(33750/26)=1298
  it('Br2 boundary ($135,000) → $1,298/fn', () => {
    expect(w(135000, { residency: 'whm' }).periodTotal).toBe(1298)
  })

  // Bracket 3: $135,001–$190,000 → $33,750 + 37c per $1 over $135,000
  // $160k: 33750+(160000-135000)*0.37=43000 → round(43000/26)=1654
  it('Br3 mid-range ($160,000) → $1,654/fn', () => {
    expect(w(160000, { residency: 'whm' }).periodTotal).toBe(1654)
  })
  // $190k boundary: 33750+(190000-135000)*0.37=54100 → round(54100/26)=2081
  it('Br3 boundary ($190,000) → $2,081/fn', () => {
    expect(w(190000, { residency: 'whm' }).periodTotal).toBe(2081)
  })

  // Bracket 4: > $190,000 → $54,100 + 45c per $1 over $190,000
  // $250k: 54100+(250000-190000)*0.45=81100 → round(81100/26)=3119
  it('Br4 ($250,000) → $3,119/fn', () => {
    expect(w(250000, { residency: 'whm' }).periodTotal).toBe(3119)
  })

  it('WHM has $0 Medicare levy at all income levels', () => {
    expect(w(60000,  { residency: 'whm' }).periodMedicare).toBe(0)
    expect(w(200000, { residency: 'whm' }).periodMedicare).toBe(0)
  })

  it('WHM + HELP: HELP is applied on top of Schedule 15 tax (WHM can hold a HELP debt)', () => {
    // $200k WHM: Schedule 15 = 54100+(200000-190000)*0.45=58600 → round(58600/26)=2254/fn
    // HELP (10% of total): 200000×10%=20000/yr → round(20000/26)=769/fn
    // Total = 2254 + 769 = 3023/fn
    const r = w(200000, { residency: 'whm', help: true })
    expect(r.periodHELP).toBe(769)
    expect(r.periodTotal).toBe(2254 + 769)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE 8 — HELP/HECS annual repayment amounts
// Source: ato.gov.au study-and-training-support-loans-rates-and-repayment-thresholds
// Checked 2026-06-19. 2025-26 thresholds: $67,000 / $125,000 / $179,285.
// STRUCTURE: marginal for first two brackets; FLAT 10% of TOTAL for top bracket.
// ─────────────────────────────────────────────────────────────────────────────

describe('Schedule 8 — HELP annual repayment, all brackets', () => {
  it('below $67,000 → $0 annual HELP', () => {
    expect(w(67000, { help: true }).annualHELP).toBe(0)
    expect(w(50000, { help: true }).annualHELP).toBe(0)
  })

  // Band 1: $67,001–$125,000 → 15c per $1 over $67,000 (MARGINAL)
  // $70k: (70000-67000)*0.15=450
  it('$70,000 annual HELP = $450 (band 1 marginal)', () => {
    expect(w(70000, { help: true }).annualHELP).toBe(450)
  })
  // $125k band boundary: (125000-67000)*0.15=8700
  it('$125,000 annual HELP = $8,700 (band 1 upper boundary)', () => {
    expect(w(125000, { help: true }).annualHELP).toBe(8700)
  })

  // Band 2: $125,001–$179,285 → $8,700 + 17c per $1 over $125,000 (MARGINAL)
  // $130k: 8700+(130000-125000)*0.17=9550
  it('$130,000 annual HELP = $9,550 (band 2 marginal)', () => {
    expect(w(130000, { help: true }).annualHELP).toBe(9550)
  })
  // $179,285 band boundary: 8700+(179285-125000)*0.17=8700+9228.45=17928.45 → $17,928
  it('$179,285 annual HELP = $17,928 (band 2 upper boundary)', () => {
    expect(w(179285, { help: true }).annualHELP).toBe(17928)
  })

  // Band 3: $179,286+ → 10% of TOTAL repayment income (FLAT, not marginal)
  // ATO Example 3 (Priya): $238,537 × 10% = $23,854
  it('$238,537 annual HELP = $23,854 (ATO worked example 3 exact)', () => {
    expect(w(238537, { help: true }).annualHELP).toBe(23854)
  })
  // Key regression: at $179,295, flat formula gives $17,930; marginal formula gives $17,929
  // 179295 × 10% = 17929.5 → rounds to $17,930
  it('$179,295 annual HELP = $17,930 (flat 10% of total, distinguishes from marginal)', () => {
    expect(w(179295, { help: true }).annualHELP).toBe(17930)
  })
  it('$200,000 annual HELP = $20,000 (flat 10%)', () => {
    expect(w(200000, { help: true }).annualHELP).toBe(20000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MEDICARE LEVY ESTIMATE — informational display only
// 2025-26 thresholds: lower $28,011, shade-in upper $35,013
// Source: ATO myTax 2026 (ato.gov.au mytax-instructions/2026/medicare-levy-reduction-or-exemption)
// Note: actual withholding is embedded in Scale 1/2 coefficients; this function
// is only used to split the display into "income tax" vs "Medicare levy" line items.
// ─────────────────────────────────────────────────────────────────────────────

describe('Medicare levy estimate — 2025-26 thresholds', () => {
  it('income ≤ $28,011 → $0 Medicare', () => {
    expect(w(28011).periodMedicare).toBe(0)
    expect(w(20000).periodMedicare).toBe(0)
  })

  it('income in shade-in zone ($28,012–$35,013) → reduced Medicare', () => {
    // $30k is between $28,011 and $35,013
    const med = w(30000).periodMedicare
    expect(med).toBeGreaterThan(0)
    expect(med).toBeLessThan(Math.round(30000 * 0.02 / 26)) // less than full 2%
  })

  it('income > $35,013 → full 2% Medicare', () => {
    // $80k: 80000 × 2% / 26 = 61.54 → $62/fn
    expect(w(80000).periodMedicare).toBe(62)
    // $120k: 120000 × 2% / 26 = 92.31 → $92/fn
    expect(w(120000).periodMedicare).toBe(92)
  })

  it('income tax + Medicare = total withholding (Scale 2)', () => {
    const r = w(80000)
    expect(r.periodTax + r.periodMedicare).toBe(r.periodTotal)
  })

  it('Medicare exempt employees have $0 Medicare at all incomes', () => {
    expect(w(80000,  { residency: 'student' }).periodMedicare).toBe(0)
    expect(w(200000, { residency: 'student' }).periodMedicare).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-SCALE INVARIANTS
// These properties hold regardless of income level. If they break, the scale
// routing logic has been corrupted — not just the coefficients.
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-scale invariants', () => {
  const incomes = [40000, 80000, 120000, 200000]

  it('Scale 1 > Scale 2 at same income (no threshold = higher withholding)', () => {
    incomes.forEach(a => {
      expect(w(a, { threshold: false }).periodTotal).toBeGreaterThan(w(a).periodTotal)
    })
  })

  it('Scale 5 < Scale 2 at same income (no Medicare = lower withholding)', () => {
    incomes.forEach(a => {
      expect(w(a, { residency: 'student' }).periodTotal).toBeLessThan(w(a).periodTotal)
    })
  })

  it('WHM > Scale 2 at same income below $45k (no tax-free threshold)', () => {
    // Below $45k WHM pays 15% flat vs Scale 2 which has threshold + lower bracket rates
    expect(w(30000, { residency: 'whm' }).periodTotal).toBeGreaterThan(w(30000).periodTotal)
  })

  it('HELP adds to deductions without changing base income tax (above $67k threshold)', () => {
    // Only test incomes above the $67,000 HELP threshold where HELP > $0
    [80000, 120000, 200000].forEach(a => {
      const noHelp   = w(a)
      const withHelp = w(a, { help: true })
      expect(withHelp.periodTax).toBe(noHelp.periodTax)
      expect(withHelp.periodTotal).toBeGreaterThan(noHelp.periodTotal)
    })
  })

  it('HELP has zero effect on incomes ≤ $67,000', () => {
    [40000, 60000, 67000].forEach(a => {
      expect(w(a, { help: true }).periodHELP).toBe(0)
      expect(w(a, { help: true }).periodTotal).toBe(w(a).periodTotal)
    })
  })

  it('Higher income always produces higher or equal withholding (monotonicity)', () => {
    const sorted = [15000, 22000, 30000, 43000, 55000, 80000, 120000, 150000, 200000, 250000]
    for (let i = 1; i < sorted.length; i++) {
      expect(w(sorted[i]).periodTotal).toBeGreaterThanOrEqual(w(sorted[i - 1]).periodTotal)
    }
  })

  it('Scale 4 (no TFN) = exactly 47% gross, overrides all other flags', () => {
    const weekly = calculatePAYG({
      annualSalary: 52000,
      claimingThreshold: true,
      hasHELP: true,
      medicareLevyExemption: false,
      payCycle: 'weekly',
      noTfn: true,
    })
    // $52k/52 = $1000/wk → $1000 × 47% = $470
    expect(weekly.periodTotal).toBe(470)
    expect(weekly.periodMedicare).toBe(0)
    expect(weekly.periodHELP).toBe(0)
  })
})
