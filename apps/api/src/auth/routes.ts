import type { Express, Request, Response } from 'express'
import { z } from 'zod'
import type { AuthService } from './service.js'
import { createLoginLimiter } from './rateLimit.js'
import { SESSION_COOKIE, SESSION_TTL_MS, sessionTokenFromCookie } from './session.js'

export type AuthBackend = Pick<AuthService, 'login' | 'getUser' | 'logout'>

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
}).strict()

interface AuthRoutesOptions {
  webOrigin: string
  auth: AuthBackend
  isDatabaseReady: () => Promise<boolean>
  secureCookies: boolean
}
function rejectCache(res: Response) { res.setHeader('Cache-Control', 'no-store') }
function cookies(secure: boolean) {
  return {
    httpOnly: true, secure, sameSite: 'strict' as const, path: '/',
  }
}
export function registerAuthRoutes(app: Express, { auth, webOrigin, isDatabaseReady, secureCookies }: AuthRoutesOptions) {
  const limiter = createLoginLimiter()

  function checkOrigin(req: Request, res: Response, next: () => void) {
    // Exigido até em localhost. CORS sozinho não previne CSRF.
    if (req.get('Origin') !== webOrigin) {
      res.status(403).json({ error: 'forbidden_origin' })
      return
    }
    next()
  }
  async function ready(res: Response): Promise<boolean> {
    if (await isDatabaseReady().catch(() => false)) return true
    res.status(503).json({ error: 'service_unavailable' })
    return false
  }

  app.post('/auth/login', checkOrigin, async (req: Request, res: Response) => {
    rejectCache(res)
    // Não confiar em X-Forwarded-For: app.trustProxy permanece false.
    if (!limiter.attempt(req.ip ?? 'local')) {
      res.setHeader('Retry-After', '900')
      res.status(429).json({ error: 'too_many_attempts' })
      return
    }
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request' })
      return
    }
    if (!(await ready(res))) return
    try {
      const result = await auth.login(parsed.data.email, parsed.data.password)
      if (!result) {
        res.status(401).json({ error: 'invalid_credentials' })
        return
      }
      res.cookie(SESSION_COOKIE, result.token, { ...cookies(secureCookies), maxAge: SESSION_TTL_MS })
      res.json({ user: result.user })
    } catch {
      res.status(503).json({ error: 'service_unavailable' })
    }
  })

  app.get('/auth/me', async (req: Request, res: Response) => {
    rejectCache(res)
    const token = sessionTokenFromCookie(req.get('Cookie'))
    if (!token) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    if (!(await ready(res))) return
    try {
      const user = await auth.getUser(token)
      if (!user) {
        res.status(401).json({ error: 'unauthorized' })
        return
      }
      res.json({ user })
    } catch {
      res.status(503).json({ error: 'service_unavailable' })
    }
  })

  app.post('/auth/logout', checkOrigin, async (req: Request, res: Response) => {
    rejectCache(res)
    const token = sessionTokenFromCookie(req.get('Cookie'))
    // Logout sem cookie é idempotente.
    if (token && !(await ready(res))) return
    try {
      if (token) await auth.logout(token)
      res.clearCookie(SESSION_COOKIE, cookies(secureCookies))
      res.status(204).end()
    } catch {
      res.status(503).json({ error: 'service_unavailable' })
    }
  })
}
