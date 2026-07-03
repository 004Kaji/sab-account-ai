// Super payment instruction sheet — data shaping (pure, no I/O)
//
// Turns a payrun's per-employee super into a "pay your super now" instruction:
// grouped per fund (so the employer makes one payment per fund), with totals,
// the Payday Super deadline and a suggested reference. This is REFERENCE DATA
// the employer acts on themselves — SAB never initiates the payment.

import { paydaySuperDeadline, suggestedPaymentReference } from '@/lib/super-compliance'

export interface SuperLineItem {
  employeeName: string
  fundName: string
  usi: string
  memberNumber: string
  fundAbn?: string
  isSmsf?: boolean
  smsfEsa?: string
  amount: number // dollars
}

export interface SuperInstructionInput {
  businessName: string
  businessAbn?: string
  payday: string // ISO YYYY-MM-DD
  items: SuperLineItem[]
}

export interface FundGroup {
  fundName: string
  usi: string
  isSmsf: boolean
  smsfEsa?: string
  employees: { name: string; memberNumber: string; amount: number }[]
  total: number
}

export interface SuperInstructionSheet {
  businessName: string
  businessAbn?: string
  payday: string
  deadline: string
  paymentReference: string
  funds: FundGroup[]
  totalAmount: number
  totalEmployees: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Group a payrun's super line items by fund and compute totals + deadline.
 * Employees with a zero/negative super amount are excluded (nothing to pay).
 * Grouping key is USI when present (authoritative), else the fund name.
 */
export function buildSuperInstructionSheet(input: SuperInstructionInput): SuperInstructionSheet {
  const payable = input.items.filter(i => i.amount > 0)

  const groups = new Map<string, FundGroup>()
  for (const item of payable) {
    const key = (item.usi || item.fundName || 'UNSPECIFIED').trim().toUpperCase()
    let group = groups.get(key)
    if (!group) {
      group = {
        fundName: item.fundName || 'Fund not specified',
        usi: item.usi || '',
        isSmsf: !!item.isSmsf,
        smsfEsa: item.smsfEsa,
        employees: [],
        total: 0,
      }
      groups.set(key, group)
    }
    group.employees.push({ name: item.employeeName, memberNumber: item.memberNumber, amount: round2(item.amount) })
    group.total = round2(group.total + item.amount)
  }

  const funds = Array.from(groups.values()).sort((a, b) => a.fundName.localeCompare(b.fundName))
  const totalAmount = round2(funds.reduce((s, f) => s + f.total, 0))

  return {
    businessName: input.businessName,
    businessAbn: input.businessAbn,
    payday: input.payday,
    deadline: paydaySuperDeadline(input.payday),
    paymentReference: suggestedPaymentReference(input.businessName, input.payday),
    funds,
    totalAmount,
    totalEmployees: payable.length,
  }
}

// ── CSV export ────────────────────────────────────────────────────────
// Formatted for upload to a super fund employer portal. Columns follow the
// common SuperStream contribution layout most portals accept.
const CSV_HEADERS = [
  'Employee Name',
  'Super Fund',
  'USI',
  'Member Number',
  'Amount',
  'Payment Date',
  'Reference',
] as const

function csvCell(value: string | number): string {
  const s = String(value)
  // Quote if it contains a comma, quote or newline; escape embedded quotes.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Build a CSV string the employer can upload to their fund's employer portal. */
export function superInstructionCSV(sheet: SuperInstructionSheet): string {
  const rows: string[] = [CSV_HEADERS.join(',')]
  for (const fund of sheet.funds) {
    for (const emp of fund.employees) {
      rows.push([
        csvCell(emp.name),
        csvCell(fund.fundName),
        csvCell(fund.usi),
        csvCell(emp.memberNumber),
        csvCell(emp.amount.toFixed(2)),
        csvCell(sheet.payday),
        csvCell(sheet.paymentReference),
      ].join(','))
    }
  }
  return rows.join('\r\n')
}
