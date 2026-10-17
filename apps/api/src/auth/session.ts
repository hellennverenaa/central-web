import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'central_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function newSessionToken(): string { return randomBytes(32).toString('hex') }
export function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
export function sessionTokenFromCookie(cookie: string | undefined): string | null {
  if (!cookie) return null
  const value = cookie.split(';').map(chunk => chunk.trim())
    .find(chunk => chunk.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null
}
