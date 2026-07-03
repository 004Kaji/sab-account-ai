import { describe, it, expect } from 'vitest'
import { calculateSuper, getSuperRate, calculatePayslip } from '@/lib/ato'
import { buildSuperInstructionSheet } from '@/lib/super-instructions'
import { deriveSuperStatus, wasPaidOnTime, paydaySuperDeadline } from '@/lib/super-compliance'

// ── SG calculation edge cases ─────────────────────────────────────────
describe('super guarantee calculation', () => {
  it('uses 12% from 1 July 2025 and 11.5% before', () => {
    expect(getSuperRate(new Date('2025-07-01'))).toBe(0.12)
    expect(getSuperRate(new Date('2025-06-30'))).toBe(0.115)
    expect(calculateSuper(1000, new Date('2025-07-02'))).toBe(120)
    expect(calculateSuper(1000, new Date('2024-12-01'))).toBe(115)
  })

  it('calculates super on ORDINARY earnings only, excluding overtime', () => {
    // $52,000/yr weekly = $1000 ordinary/week; 5 hrs OT at $50 = $250 overtime.
    const p = calculatePayslip({
      annualSalary: 52000, salarySacrifice: 0, overtimeHours: 5, overtimeRate: 50,
      payCycle: 'weekly', claimingThreshold: true, hasHELP: false,
      medicareLevyExemption: false, paymentDate: new Date('2025-07-02'),
    })
    expect(p.grossPay).toBe(1250)          // ordinary + overtime
    expect(p.ordinaryEarnings).toBe(1000)
    expect(p.superSG).toBe(120)            // 12% of ordinary ONLY, not of 1250
  })

  it('adds salary-sacrifice super on top of SG', () => {
    const p = calculatePayslip({
      annualSalary: 52000, salarySacrifice: 5200, overtimeHours: 0, overtimeRate: 0,
      payCycle: 'weekly', claimingThreshold: true, hasHELP: false,
      medicareLevyExemption: false, paymentDate: new Date('2025-07-02'),
    })
    expect(p.superSG).toBe(120)            // SG still on full ordinary earnings
    expect(p.superSalSac).toBe(100)        // 5200/52
    expect(p.totalSuper).toBe(220)
  })
})

// ── End-to-end compliance flow (pure libs, mirrors the handlers) ──────
describe('payrun → instructions → mark paid → status', () => {
  const payday = '2026-07-03' // Friday
  const items = [
    { employeeName: 'Ava',   fundName: 'AustralianSuper', usi: 'STA0100AU', memberNumber: '1', amount: 120 },
    { employeeName: 'Ben',   fundName: 'AustralianSuper', usi: 'STA0100AU', memberNumber: '2', amount: 90 },
    { employeeName: 'Cara',  fundName: 'Hostplus',        usi: 'HOS0100AU', memberNumber: '3', amount: 60 },
    { employeeName: 'Dev',   fundName: 'REST',            usi: 'RES0103AU', memberNumber: '4', amount: 45 },
  ]

  it('groups a 4-employee / 3-fund payrun and sets the deadline', () => {
    const sheet = buildSuperInstructionSheet({ businessName: 'Mindil Beach Café', payday, items })
    expect(sheet.funds).toHaveLength(3)
    expect(sheet.totalAmount).toBe(315)
    expect(sheet.deadline).toBe('2026-07-14') // payday + 7 business days
    const aus = sheet.funds.find(f => f.usi === 'STA0100AU')!
    expect(aus.total).toBe(210)
  })

  it('is DUE_SOON near the deadline, PAID/on-time once recorded', () => {
    const deadline = paydaySuperDeadline(payday)
    // 2 business days before the deadline, unpaid → DUE_SOON
    expect(deriveSuperStatus({ deadlineISO: deadline, todayISO: '2026-07-10' })).toBe('DUE_SOON')
    // Paid on the deadline day → PAID and on time (mirrors mark_super_paid audit)
    const paidDate = '2026-07-14'
    expect(deriveSuperStatus({ deadlineISO: deadline, paidDateISO: paidDate })).toBe('PAID')
    expect(wasPaidOnTime(deadline, paidDate)).toBe(true)
  })

  it('flags a late payment as OVERDUE-then-PAID-late', () => {
    const deadline = paydaySuperDeadline(payday)
    expect(deriveSuperStatus({ deadlineISO: deadline, todayISO: '2026-07-20' })).toBe('OVERDUE')
    const paidLate = '2026-07-20'
    expect(deriveSuperStatus({ deadlineISO: deadline, paidDateISO: paidLate })).toBe('PAID')
    expect(wasPaidOnTime(deadline, paidLate)).toBe(false)
  })
})
