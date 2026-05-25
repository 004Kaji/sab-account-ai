export interface ParsedTransaction {
  date: string           // ISO YYYY-MM-DD
  description: string
  amount: number         // always positive
  type: 'income' | 'expense'
  bankDescription: string
}

export interface ParseResult {
  bank: 'CBA' | 'ANZ' | 'Westpac' | 'NAB' | 'unknown'
  transactions: ParsedTransaction[]
  error?: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

function parseAUDate(dateStr: string): string {
  const s = dateStr.trim()
  const parts = s.split('/')
  if (parts.length !== 3) return ''
  const [d, m, y] = parts
  if (!d || !m || !y) return ''
  return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseNABDate(dateStr: string): string {
  const MONTHS: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  }
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return ''
  const [d, mon, y] = parts
  const month = MONTHS[mon]
  if (!month) return ''
  const year = parseInt(y) < 50 ? `20${y.padStart(2, '0')}` : `19${y.padStart(2, '0')}`
  return `${year}-${month}-${d.padStart(2, '0')}`
}

export function parseBankCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) {
    return { bank: 'unknown', transactions: [], error: 'This file appears to be empty' }
  }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(h => h.toLowerCase().trim())

  const hasDate            = headers.includes('date')
  const hasAmount          = headers.includes('amount')
  const hasDescription     = headers.includes('description')
  const hasNarration       = headers.includes('narration')
  const hasDebit           = headers.includes('debit')
  const hasCredit          = headers.includes('credit')
  const hasType            = headers.includes('type')
  const hasTransactionDate = headers.includes('transaction date')
  const hasCredits         = headers.includes('credits')
  const hasDebits          = headers.includes('debits')

  let bank: 'CBA' | 'ANZ' | 'Westpac' | 'NAB' | 'unknown' = 'unknown'

  if (hasNarration && hasDebit && hasCredit && hasTransactionDate) {
    bank = 'Westpac'
  } else if (hasDate && hasAmount && hasCredits && hasDebits) {
    bank = 'NAB'
  } else if (hasDate && hasAmount && hasType && hasDescription) {
    bank = 'ANZ'
  } else if (hasDate && hasAmount && hasDescription) {
    bank = 'CBA'
  } else {
    return {
      bank: 'unknown',
      transactions: [],
      error: "We couldn't recognise this bank format. Currently supported: CBA, ANZ, Westpac, NAB. Contact support to add your bank.",
    }
  }

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseCSVLine(line)

    try {
      if (bank === 'CBA') {
        const dateStr = parseAUDate(fields[headers.indexOf('date')] ?? '')
        const amount  = parseFloat(fields[headers.indexOf('amount')] ?? '')
        const desc    = (fields[headers.indexOf('description')] ?? '').trim()
        if (!dateStr || isNaN(amount) || amount === 0) continue
        transactions.push({ date: dateStr, description: desc, amount: Math.abs(amount), type: amount > 0 ? 'income' : 'expense', bankDescription: desc })

      } else if (bank === 'ANZ') {
        const dateStr = parseAUDate(fields[headers.indexOf('date')] ?? '')
        const amount  = parseFloat(fields[headers.indexOf('amount')] ?? '')
        const desc    = (fields[headers.indexOf('description')] ?? '').trim()
        if (!dateStr || isNaN(amount) || amount === 0) continue
        transactions.push({ date: dateStr, description: desc, amount: Math.abs(amount), type: amount > 0 ? 'income' : 'expense', bankDescription: desc })

      } else if (bank === 'Westpac') {
        const dateStr = parseAUDate(fields[headers.indexOf('transaction date')] ?? '')
        const debit   = parseFloat(fields[headers.indexOf('debit')]  ?? '') || 0
        const credit  = parseFloat(fields[headers.indexOf('credit')] ?? '') || 0
        const desc    = (fields[headers.indexOf('narration')] ?? '').trim()
        if (!dateStr || (debit === 0 && credit === 0)) continue
        const isIncome = credit > 0
        transactions.push({ date: dateStr, description: desc, amount: isIncome ? credit : debit, type: isIncome ? 'income' : 'expense', bankDescription: desc })

      } else if (bank === 'NAB') {
        const dateStr = parseNABDate(fields[headers.indexOf('date')] ?? '')
        const amount  = parseFloat(fields[headers.indexOf('amount')] ?? '')
        const desc    = (fields[headers.indexOf('description')] ?? '').trim()
        if (!dateStr || isNaN(amount) || amount === 0) continue
        transactions.push({ date: dateStr, description: desc, amount: Math.abs(amount), type: amount > 0 ? 'income' : 'expense', bankDescription: desc })
      }
    } catch {
      // skip malformed rows silently
    }
  }

  if (transactions.length === 0) {
    return { bank, transactions: [], error: 'No valid transactions found in this file' }
  }

  return { bank, transactions }
}
