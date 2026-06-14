import Anthropic from '@anthropic-ai/sdk'

export const SAB_CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_client',
    description: 'Add a new client to the system. Call this when the user wants to create an invoice for someone who is NOT already in the CLIENTS list. After creating the client, proceed to create_invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        business_name: { type: 'string', description: 'Business name or full name of the client' },
        contact_name:  { type: 'string', description: 'Contact person name (optional)' },
        email:         { type: 'string', description: 'Client email address' },
        phone:         { type: 'string', description: 'Client phone number (optional)' },
        abn:           { type: 'string', description: 'Client ABN (optional)' },
        address:       { type: 'string', description: 'Client address (optional)' },
      },
      required: ['business_name'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a client. Use when the user asks to create, write, or make an invoice. Always call this first — never send without confirming. Returns the full invoice data including ID for use in send_invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description:  { type: 'string', description: 'Plain-English description of what was done, used as the invoice notes' },
        client_name:  { type: 'string', description: 'Full name or business name of the client' },
        client_email: { type: 'string', description: 'Client email address' },
        items: {
          type: 'array',
          description: 'Line items on the invoice',
          items: {
            type: 'object',
            properties: {
              label:  { type: 'string', description: 'Description of this line item' },
              amount: { type: 'number', description: 'Amount in AUD excluding GST' },
            },
            required: ['label', 'amount'],
          },
        },
        include_gst: { type: 'boolean', description: 'Whether to add 10% GST on top of all items' },
      },
      required: ['client_name', 'items', 'include_gst'],
    },
  },
  {
    name: 'send_invoice',
    description: 'Send a previously created invoice to the client via email. ONLY call this after the user has explicitly confirmed a confirm_card. Never send without approval. Requires the invoice_id from create_invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoice_id:   { type: 'string', description: 'UUID of the invoice from create_invoice' },
        client_email: { type: 'string', description: 'Email address to send the invoice PDF to' },
      },
      required: ['invoice_id', 'client_email'],
    },
  },
  {
    name: 'create_payslip',
    description: 'Create an ATO-compliant payslip for an employee using NAT 1004 PAYG calculations. Use when the user asks to pay, process payroll, or make a payslip. Always call this first — never send without confirming. Returns the full breakdown with tax, Medicare, super. gross_pay and dates are optional — if omitted, the handler computes them from the employee\'s stored rate and pay cycle.',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id:      { type: 'string', description: 'UUID of the employee from the EMPLOYEES list' },
        gross_pay:        { type: 'number', description: 'Override gross pay in AUD. Omit to auto-calculate from stored hourly_rate × ordinary_hours or annual_salary ÷ pay periods.' },
        pay_period_start: { type: 'string', description: 'Start date YYYY-MM-DD. Omit to use the most recent completed pay period based on pay cycle.' },
        pay_period_end:   { type: 'string', description: 'End date YYYY-MM-DD. Omit to use today.' },
      },
      required: ['employee_id'],
    },
  },
  {
    name: 'send_payslip',
    description: 'Send a previously created payslip to the employee via email. ONLY call this after the user has explicitly confirmed a confirm_card. Never send without approval. Requires the payslip_id from create_payslip.',
    input_schema: {
      type: 'object' as const,
      properties: {
        payslip_id:     { type: 'string', description: 'UUID of the payslip from create_payslip' },
        employee_email: { type: 'string', description: 'Email address to send the payslip PDF to' },
      },
      required: ['payslip_id', 'employee_email'],
    },
  },
  {
    name: 'get_bas_position',
    description: 'Calculate the user\'s current BAS (Business Activity Statement) position for a given quarter. Returns GST collected from sales, GST credits from expenses, and the net amount owing or refundable.',
    input_schema: {
      type: 'object' as const,
      properties: {
        financial_year: { type: 'string', description: 'Financial year in format "2025-26"' },
        quarter: {
          type: 'integer',
          enum: [1, 2, 3, 4],
          description: 'BAS quarter: 1 = Jul-Sep, 2 = Oct-Dec, 3 = Jan-Mar, 4 = Apr-Jun',
        },
      },
      required: ['financial_year', 'quarter'],
    },
  },
  {
    name: 'get_super_due',
    description: 'Calculate superannuation owing for all employees for a given pay period at the current SG rate (12%). Returns a per-employee breakdown and the total super due. Use when user asks about super, superannuation, or Payday Super.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pay_period_start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        pay_period_end:   { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
      required: ['pay_period_start', 'pay_period_end'],
    },
  },
  {
    name: 'get_business_summary',
    description: 'Get a financial summary for the business over a date range: total income, GST collected, total expenses, GST credits, net profit, and invoice count. Use when the user asks about their business performance, income, revenue, or profit.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        date_to:   { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'get_ato_rules',
    description: 'Return accurate ATO rule summaries for a specific tax topic. Use when the user asks about tax rules, deadlines, rates, or compliance obligations. Do NOT use for calculations — use create_payslip or get_super_due for that.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          enum: ['super', 'medicare', 'payg', 'bas', 'abn', 'whm', 'payday_super'],
          description: 'The ATO topic to look up',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'send_bas_to_accountant',
    description: 'Calculate the BAS position for a quarter and send a summary email to the accountant. Use when the user asks to send, email, or share the BAS with their accountant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        financial_year:    { type: 'string', description: 'Financial year in format "2025-26"' },
        quarter:           { type: 'integer', enum: [1, 2, 3, 4], description: 'BAS quarter: 1=Jul-Sep, 2=Oct-Dec, 3=Jan-Mar, 4=Apr-Jun' },
        accountant_email:  { type: 'string', description: 'Email address of the accountant to send the BAS summary to' },
        accountant_name:   { type: 'string', description: 'Name of the accountant (optional, for the email greeting)' },
      },
      required: ['financial_year', 'quarter', 'accountant_email'],
    },
  },
]
