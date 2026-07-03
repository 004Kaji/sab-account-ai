import { Client } from '@upstash/qstash'

let _client: Client | undefined

export function getQStashClient(): Client {
  if (!process.env.QSTASH_TOKEN) throw new Error('QSTASH_TOKEN not configured')
  if (!_client) _client = new Client({ token: process.env.QSTASH_TOKEN })
  return _client
}

export async function enqueueEmail(type: string, payload: Record<string, unknown>): Promise<void> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sabaccountai.com'
  await getQStashClient().publishJSON({
    url: `${base}/api/queue/email`,
    body: { type, ...payload },
    retries: 3,
  })
}
