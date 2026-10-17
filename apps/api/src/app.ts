import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { Express, NextFunction, Request, Response } from 'express'
import { registerAuthRoutes, type AuthBackend } from './auth/routes.js'

export interface AppDependencies {
  webOrigin: string
  isDatabaseReady: () => Promise<boolean>
  auth?: AuthBackend
  secureCookies?: boolean
}

/**
 * Etapa 7.3: verificações e acesso autenticado ao próprio perfil.
 * NÃO adicionar endpoints com informações de clientes sem autorização por titular.
 */
export function createApp({ webOrigin, isDatabaseReady, auth, secureCookies = false }: AppDependencies): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: webOrigin, credentials: true, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }))
  app.use(express.json({ limit: '16kb' }))

  app.get('/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ status: 'ok' })
  })

  app.get('/health/ready', async (_req: Request, res: Response) => {
    const ready = await isDatabaseReady().catch(() => false)
    res.setHeader('Cache-Control', 'no-store')
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' })
  })

  if (auth) registerAuthRoutes(app, { webOrigin, isDatabaseReady, auth, secureCookies })

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found' })
  })

  app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'internal_error' })
  })

  return app
}
