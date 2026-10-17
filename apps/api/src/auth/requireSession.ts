import type { RequestHandler } from 'express'
import type { AuthUser } from './service.js'
import type { AuthBackend } from './routes.js'
import { sessionTokenFromCookie } from './session.js'

/**
 * Deve ser aplicado antes de qualquer rota privada que vier na etapa 7.4.
 * O ID do titular vem da sessão validada no servidor, nunca do body/query.
 */
export function requireSession(auth: Pick<AuthBackend, 'getUser'>, ready: () => Promise<boolean>): RequestHandler {
  return async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    const token = sessionTokenFromCookie(req.get('Cookie'))
    if (!token) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    if (!(await ready().catch(() => false))) {
      res.status(503).json({ error: 'service_unavailable' })
      return
    }
    try {
      const user: AuthUser | null = await auth.getUser(token)
      if (!user) {
        res.status(401).json({ error: 'unauthorized' })
        return
      }
      res.locals.authUser = user
      next()
    } catch {
      res.status(503).json({ error: 'service_unavailable' })
    }
  }
}
