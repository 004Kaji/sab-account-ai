import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY env var is not set')
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return Buffer.from(hex, 'hex')
}

export function encryptField(value: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(':')
  // Plain text (unencrypted legacy value) — return as-is
  if (parts.length !== 3) return ciphertext
  const [ivHex, tagHex, encHex] = parts
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}

export function encryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null
  return encryptField(value)
}

export function decryptIfPresent(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null
  try {
    return decryptField(ciphertext)
  } catch {
    return null
  }
}
