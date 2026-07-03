// SBSCH migration import — parse an employee + super-fund register exported
// from the ATO Small Business Super Clearing House (closed 1 July 2026) so
// orphaned SBSCH users can onboard in minutes.
//
// The SBSCH did not have one fixed export layout, so we match headers
// flexibly (case-insensitive, common aliases) and map to SAB employee fields.
// Pure parsing only — no I/O.

import { validateUSI, validateESA } from '@/lib/super-compliance'
import { validateABN } from '@/lib/utils'

export interface SbschEmployeeRow {
  name: string
  email?: string
  super_fund_name?: string
  usi?: string
  fund_abn?: string
  member_number?: string
  is_smsf: boolean
  smsf_esa?: string
  smsf_bank_bsb?: string
  smsf_bank_acct?: string
  warnings: string[]
}

export interface SbschParseResult {
  rows: SbschEmployeeRow[]
  errors: string[] // fatal, per-file (e.g. missing name column)
}

// Header aliases → canonical field. Compared after lower-casing + stripping
// non-alphanumerics, so "Fund ABN", "fund_abn" and "FundABN" all match.
const HEADER_ALIASES: Record<string, string[]> = {
  name:          ['name', 'employeename', 'fullname', 'membername'],
  givenName:     ['givenname', 'firstname', 'given'],
  familyName:    ['familyname', 'surname', 'lastname'],
  email:         ['email', 'emailaddress'],
  fundName:      ['superfundname', 'fundname', 'fund', 'superfund'],
  usi:           ['usi', 'uniquesuperannuationidentifier'],
  fundAbn:       ['fundabn', 'superfundabn', 'abn'],
  memberNumber:  ['membernumber', 'memberno', 'memberid', 'membershipnumber'],
  fundType:      ['fundtype', 'type'],
  esa:           ['esa', 'electronicserviceaddress', 'smsfesa'],
  bankBsb:       ['bsb', 'smsfbsb', 'bankbsb'],
  bankAcct:      ['accountnumber', 'bankaccount', 'smsfaccountnumber', 'accountno'],
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Minimal RFC-4180-ish CSV line splitter (handles quoted fields + escaped quotes).
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(c => c.trim())
}

/** Parse an SBSCH-style employee/fund register CSV into SAB employee rows. */
export function parseSbschCsv(csv: string): SbschParseResult {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 2) return { rows: [], errors: ['CSV has no data rows.'] }

  const headerCells = splitCsvLine(lines[0]).map(normKey)

  // Build a column index for each canonical field.
  const colOf: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = headerCells.findIndex(h => aliases.includes(h))
    if (idx >= 0) colOf[field] = idx
  }

  const hasName = colOf.name != null || (colOf.givenName != null || colOf.familyName != null)
  if (!hasName) return { rows: [], errors: ['Could not find a name column (expected "Name" or "Given Name"/"Family Name").'] }

  const rows: SbschEmployeeRow[] = []
  const cell = (cells: string[], field: string): string | undefined => {
    const i = colOf[field]
    if (i == null) return undefined
    const v = cells[i]
    return v && v.length > 0 ? v : undefined
  }

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const name = cell(cells, 'name')
      ?? [cell(cells, 'givenName'), cell(cells, 'familyName')].filter(Boolean).join(' ').trim()
    if (!name) continue // skip blank rows

    const warnings: string[] = []
    const fundType = (cell(cells, 'fundType') || '').toLowerCase()
    const esa = cell(cells, 'esa')
    const isSmsf = fundType.includes('smsf') || fundType.includes('self') || !!esa

    const usi = cell(cells, 'usi')
    if (usi && !validateUSI(usi)) warnings.push(`USI "${usi}" doesn't look valid`)

    const fundAbn = cell(cells, 'fundAbn')
    if (fundAbn && !validateABN(fundAbn)) warnings.push(`Fund ABN "${fundAbn}" failed the checksum`)

    if (isSmsf) {
      if (esa && !validateESA(esa)) warnings.push(`ESA "${esa}" doesn't look valid`)
      if (!esa) warnings.push('SMSF is missing an ESA')
    } else if (!usi) {
      warnings.push('No USI — needed to pay super to an APRA fund')
    }

    rows.push({
      name,
      email:           cell(cells, 'email'),
      super_fund_name: cell(cells, 'fundName'),
      usi:             isSmsf ? undefined : usi,
      fund_abn:        fundAbn,
      member_number:   cell(cells, 'memberNumber'),
      is_smsf:         isSmsf,
      smsf_esa:        isSmsf ? esa : undefined,
      smsf_bank_bsb:   isSmsf ? cell(cells, 'bankBsb') : undefined,
      smsf_bank_acct:  isSmsf ? cell(cells, 'bankAcct') : undefined,
      warnings,
    })
  }

  if (rows.length === 0) return { rows: [], errors: ['No employee rows found in the file.'] }
  return { rows, errors: [] }
}
