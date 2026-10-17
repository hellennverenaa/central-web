import type { DataSource } from 'typeorm'
import { hashPassword, verifyPassword } from './password.js'
import { newSessionToken, sessionDigest, SESSION_TTL_MS } from './session.js'

export interface AuthUser {
  id: string
  email: string
}
interface UserRow extends AuthUser { password_hash: string | null }

/**
 * Executa queries parametrizadas. Nunca armazena token puro nem devolve password_hash.
 * Nenhuma tabela de domínio é disponibilizada nesta etapa.
 */
export class AuthService {
  constructor(private readonly db: Pick<DataSource, 'query' | 'transaction'>) {}

  async createFirstOwner(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    const hash = await hashPassword(password)
    // Protege duas execuções paralelas do assistente de criação de titular.
    return this.db.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [7142026])
      const count = await manager.query('SELECT count(*)::integer AS total FROM auth.users') as Array<{ total: number }>
      if (count[0]?.total !== 0) throw new Error('Já existe um titular. O cadastro público está desabilitado.')
      const rows = await manager.query(
        'INSERT INTO auth.users(email,password_hash) VALUES($1,$2) RETURNING id,email',
        [normalized, hash]) as AuthUser[]
      return rows[0]!
    })
  }

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
    const rows = await this.db.query(
      'SELECT id,email,password_hash FROM auth.users WHERE lower(email) = $1 LIMIT 1',
      [email.trim().toLowerCase()]) as UserRow[]
    const row = rows[0]
    if (!(await verifyPassword(password, row?.password_hash ?? null)) || !row) return null
    const token = newSessionToken()
    await this.db.query(
      'INSERT INTO auth.auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',
      [sessionDigest(token), row.id, new Date(Date.now() + SESSION_TTL_MS)],
    )
    return { user: { id: row.id, email: row.email }, token }
  }

  async getUser(token: string): Promise<AuthUser | null> {
    const rows = await this.db.query(`SELECT u.id,u.email FROM auth.auth_sessions s
      INNER JOIN auth.users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.password_hash IS NOT NULL
      LIMIT 1`, [sessionDigest(token)]) as AuthUser[]
    return rows[0] ?? null
  }

  async logout(token: string): Promise<void> {
    await this.db.query('DELETE FROM auth.auth_sessions WHERE token_hash=$1', [sessionDigest(token)])
  }
}
