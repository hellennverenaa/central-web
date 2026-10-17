import 'reflect-metadata'
import { createApp } from './app.js'
import { parseEnv } from './config/env.js'
import { createDataSource, createReadinessProbe } from './db/dataSource.js'

async function main() {
  const env = parseEnv(process.env)
  if (env.NODE_ENV === 'production' && env.API_HOST !== '127.0.0.1') {
    throw new Error('Etapa 7.1 é apenas local. Não exponha esta API publicamente sem autenticação.')
  }

  const dataSource = createDataSource(env)
  const app = createApp({
    webOrigin: env.WEB_ORIGIN,
    isDatabaseReady: createReadinessProbe(dataSource),
  })

  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    process.stdout.write(`API de desenvolvimento: http://${env.API_HOST}:${env.API_PORT}/health\n`)
  })

  async function shutdown() {
    server.close()
    if (dataSource.isInitialized) await dataSource.destroy()
  }

  process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)) })
  process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)) })
}

void main().catch(error => {
  // Mensagens de validação não incluem os valores de credenciais.
  process.stderr.write((error instanceof Error ? error.message : 'Não foi possível iniciar a API.') + '\n')
  process.exitCode = 1
})
