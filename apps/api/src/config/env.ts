import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.literal('127.0.0.1').default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5433),
  DB_NAME: z.string().min(1).default('central_dev'),
  DB_USER: z.string().min(1).default('central_dev'),
  DB_PASSWORD: z.string().min(1),
})

export type ApiEnv = z.infer<typeof envSchema>

/** Falha cedo se faltar configuração crítica, sem registrar segredos em logs. */
export function parseEnv(source: NodeJS.ProcessEnv): ApiEnv {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const names = result.error.issues.map(issue => issue.path.join('.')).join(', ')
    throw new Error('Configuração da API inválida. Confira as variáveis: ' + names)
  }
  return result.data
}
