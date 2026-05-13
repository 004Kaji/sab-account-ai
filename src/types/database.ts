// Supabase database row types for SAB Account AI
// These match the table schemas defined in supabase/migrations/

// ── profiles table ─────────────────────────────────────────────
export type DbProfile = {
  id: string
  email: string | null
  plan: 'free' | 'starter' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive' | null
  trial_ends_at: string | null      // ISO timestamptz
  billing_cycle_end: string | null  // ISO timestamptz
  created_at: string
  updated_at: string
}

// ── stripe_events table ────────────────────────────────────────
export type DbStripeEvent = {
  id: string
  type: string
  data: Record<string, unknown>
  processed: boolean
  created_at: string
}

// ── invoices table (added in a future migration) ───────────────
export type DbInvoice = {
  id: string
  user_id: string
  invoice_number: string
  status: 'draft' | 'pending' | 'paid' | 'overdue'
  client_name: string
  client_abn: string | null
  client_address: string | null
  client_email: string | null
  client_contact: string | null
  business_name: string
  business_abn: string | null
  business_email: string | null
  business_phone: string | null
  business_address: string | null
  line_items: DbLineItem[]
  has_gst: boolean
  subtotal_ex_gst: number
  total_gst: number
  total_inc_gst: number
  issue_date: string
  due_date: string
  payment_terms: string | null
  bank_name: string | null
  account_name: string | null
  bsb: string | null
  account_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DbLineItem = {
  description: string
  qty: number
  unit_price: number
  gst_amount: number
  total: number
}

// ── payslips table (added in a future migration) ───────────────
export type DbPayslip = {
  id: string
  user_id: string
  payslip_number: string
  employee_name: string
  employer_name: string
  employer_abn: string | null
  employment_type: string
  pay_cycle: string
  pay_period_start: string
  pay_period_end: string
  payment_date: string
  gross_pay: number
  salary_sacrifice: number
  taxable_gross: number
  income_tax: number
  medicare_levy: number
  help_repayment: number
  net_pay: number
  super_sg: number
  super_sal_sac: number
  super_fund_name: string | null
  member_number: string | null
  created_at: string
}

// ── records table (income + expenses, added in a future migration)
export type DbRecord = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  date: string
  description: string
  category: string
  amount: number
  gst_amount: number
  supplier_abn: string | null
  created_at: string
}
