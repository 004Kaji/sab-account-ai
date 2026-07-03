import { describe, it, expect } from 'vitest'
import { buildSuperInstructionSheet, superInstructionCSV } from '@/lib/super-instructions'

const input = {
  businessName: 'Mindil Beach Café',
  businessAbn: '49541449108',
  payday: '2026-07-03',
  items: [
    { employeeName: 'Alice',  fundName: 'AustralianSuper', usi: 'STA0100AU', memberNumber: 'A1', amount: 120 },
    { employeeName: 'Bob',    fundName: 'AustralianSuper', usi: 'STA0100AU', memberNumber: 'B2', amount: 80.5 },
    { employeeName: 'Carol',  fundName: 'Hostplus',        usi: 'HOS0100AU', memberNumber: 'C3', amount: 60 },
    { employeeName: 'Dave',   fundName: 'SMSF Dave',       usi: '',          memberNumber: 'D4', amount: 40, isSmsf: true, smsfEsa: 'SMSFDATAFLOW' },
    { employeeName: 'Zero',   fundName: 'AustralianSuper', usi: 'STA0100AU', memberNumber: 'Z9', amount: 0 },
  ],
}

describe('buildSuperInstructionSheet', () => {
  const sheet = buildSuperInstructionSheet(input)

  it('groups employees by fund and sums per fund', () => {
    const aus = sheet.funds.find(f => f.usi === 'STA0100AU')!
    expect(aus.employees).toHaveLength(2) // Zero excluded (amount 0)
    expect(aus.total).toBe(200.5)
  })

  it('excludes zero-amount employees from the total count', () => {
    expect(sheet.totalEmployees).toBe(4)
  })

  it('computes the overall total across funds', () => {
    expect(sheet.totalAmount).toBe(300.5)
  })

  it('sets the Payday Super deadline (payday + 7 business days)', () => {
    expect(sheet.deadline).toBe('2026-07-14')
  })

  it('carries SMSF ESA through', () => {
    const smsf = sheet.funds.find(f => f.isSmsf)!
    expect(smsf.smsfEsa).toBe('SMSFDATAFLOW')
  })

  it('generates a payment reference', () => {
    expect(sheet.paymentReference).toBe('SG-MINDILBE-20260703')
  })
})

describe('superInstructionCSV', () => {
  const csv = superInstructionCSV(buildSuperInstructionSheet(input))
  const lines = csv.split('\r\n')

  it('has a header row and one row per payable employee', () => {
    expect(lines[0]).toBe('Employee Name,Super Fund,USI,Member Number,Amount,Payment Date,Reference')
    expect(lines).toHaveLength(1 + 4) // header + 4 payable employees
  })

  it('formats amounts to 2dp and includes the payday + reference', () => {
    expect(csv).toContain('Alice,AustralianSuper,STA0100AU,A1,120.00,2026-07-03,SG-MINDILBE-20260703')
  })
})
