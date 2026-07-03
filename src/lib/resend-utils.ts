export function resendEventToField(type: string): 'delivered_at' | 'bounced_at' | 'failed_at' | null {
  switch (type) {
    case 'email.delivered':  return 'delivered_at'
    case 'email.bounced':    return 'bounced_at'
    case 'email.complained': return 'failed_at'
    default:                 return null
  }
}
