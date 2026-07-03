export const PAGE_SIZE = 20

export function getPageRange(page: number, pageSize: number = PAGE_SIZE): { from: number; to: number } {
  return { from: page * pageSize, to: (page + 1) * pageSize - 1 }
}

export function calcOverdueDays(dueDate: string, todayStr: string): number | null {
  if (!dueDate || !todayStr) return null
  const diffDays = Math.floor(
    (new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
  )
  return diffDays > 0 ? diffDays : null
}

export function isInvoiceNumberDuplicate(invoiceNumber: string, existingNumbers: string[]): boolean {
  return existingNumbers.includes(invoiceNumber)
}

export function eligibleForMarkPaid(
  invoices: Array<{ id: string; status: string }>,
  selectedIds: string[],
): string[] {
  const selected = new Set(selectedIds)
  return invoices
    .filter(inv => selected.has(inv.id) && inv.status !== 'paid')
    .map(inv => inv.id)
}

export function eligibleForReminder(
  invoices: Array<{ id: string; status: string; client_email?: string | null }>,
  selectedIds: string[],
): string[] {
  const selected = new Set(selectedIds)
  return invoices
    .filter(inv => selected.has(inv.id) && ['pending', 'overdue'].includes(inv.status) && !!inv.client_email)
    .map(inv => inv.id)
}
