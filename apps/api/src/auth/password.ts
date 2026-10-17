import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const COST = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const
const KEY_BYTES = 64
const SALT_BYTES = 16
const PREFIX = 'scrypt-v1'

export function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 &&
    Buffer.byteLength(password, 'utf8') <= 256 && password.length <= 128
}

async function derive(password: string, salt: Buffer): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, KEY_BYTES, COST, (error, digest) => {
      if (error) reject(error)
      else resolve(digest)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  if (!validPassword(password)) throw new Error('Senha inválida. Use pelo menos 12 caracteres.')
  const salt = randomBytes(SALT_BYTES)
  const digest = await derive(password, salt)
  return `${PREFIX}$${salt.toString('hex')}$${digest.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Mesmo custo computacional para conta inexistente, reduzindo diferenças de tempo.
  const parts = stored?.split('$')
  const valid = parts?.length === 3 && parts[0] === PREFIX &&
    /^[a-f0-9]{32}$/.test(parts[1]!) && /^[a-f0-9]{128}$/.test(parts[2]!)
  const salt = valid ? Buffer.from(parts![1]!, 'hex') : Buffer.alloc(SALT_BYTES)
  const expected = valid ? Buffer.from(parts![2]!, 'hex') : Buffer.alloc(KEY_BYTES)
  const actual = await derive(password, salt)
  return Boolean(valid) && timingSafeEqual(actual, expected)
}
