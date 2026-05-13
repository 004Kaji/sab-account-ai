// Shared application-level types for SAB Account AI

// ── Plan types ─────────────────────────────────────────────────
export type UserPlan = 'free' | 'starter' | 'pro'

// ── Invoice types ──────────────────────────────────────────────

/** A single line on an invoice */
export type LineItem = {
  id: string
  description: string
  qty: number
  unitPrice: number   // price EXCLUDING GST
  gstAmount: number   // 10% of unitPrice * qty (or 0 if no GST)
  total: number       // unitPrice * qty + gstAmount
}

/** All fields in the invoice builder form */
export type InvoiceFormData = {
  // Input method
  method: 'ai' | 'manual'
  aiDescription: string

  // Your business
  businessName: string
  businessABN: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  businessWebsite: string

  // Client
  clientName: string
  clientABN: string
  clientAddress: string
  clientEmail: string
  clientContact: string

  // Invoice settings
  invoiceNumber: string
  issueDate: string   // ISO date string YYYY-MM-DD
  dueDate: string     // ISO date string YYYY-MM-DD
  hasGST: boolean
  paymentTerms: string
  currency: string

  // Payment instructions
  bankName: string
  accountName: string
  bsb: string
  accountNumber: string
  notes: string

  // Line items
  lineItems: LineItem[]
}

/** Totals derived from line items */
export type InvoiceTotals = {
  subtotalExGST: number
  totalGST: number
  totalIncGST: number
}

// ── Payslip types ──────────────────────────────────────────────

/** All fields in the payslip builder form */
export type PayslipFormData = {
  // Employee details
  employeeName: string
  tfnDeclared: boolean
  employmentType: 'full-time' | 'part-time' | 'casual'
  payCycle: 'weekly' | 'fortnightly' | 'monthly'
  annualSalary: number
  salarySacrifice: number   // pre-tax sacrifice to super
  overtimeHours: number
  overtimeRate: number      // $ per hour
  superFundName: string
  memberNumber: string

  // ATO flags
  claimingThreshold: boolean  // tax-free threshold ($18,200)
  hasHELP: boolean            // HECS/HELP/VSL debt
  useNewSuperRate: boolean    // 12% from 1 Jul 2025
  medicareLevyExemption: boolean

  // Employer / pay period
  employerName: string
  employerABN: string
  payPeriodStart: string  // YYYY-MM-DD
  payPeriodEnd: string    // YYYY-MM-DD
  paymentDate: string     // YYYY-MM-DD
  payslipNumber: string
}

/** Calculated payslip figures (all per-period amounts) */
export type PayslipCalculation = {
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
  superSG: number        // employer super guarantee
  superSalSac: number    // salary sacrifice to super
  totalSuper: number
  // Year-to-date (estimated, based on periods completed)
  ytdGross: number
  ytdTax: number
  ytdSuper: number
}

// ── Records types ──────────────────────────────────────────────

/** An income or expense record */
export type ExpenseRecord = {
  id: string
  type: 'income' | 'expense'
  date: string
  description: string
  category: string
  amount: number      // amount INCLUDING GST (if applicable)
  gstAmount: number   // 0 if not GST-registered or not applicable
  supplierABN: string
}

// ── UI types ───────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export type ToastMessage = {
  id: string
  variant: ToastVariant
  message: string
}

// ── AI response type ───────────────────────────────────────────

/** JSON shape returned by Claude when generating invoice data */
export type AIInvoiceResponse = {
  client: string
  items: Array<{
    desc: string
    qty: number
    price: number  // excluding GST
  }>
  terms: string
  notes: string
}
