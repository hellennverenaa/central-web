import 'reflect-metadata'
import { DataSource } from 'typeorm'
import type { ApiEnv } from '../config/env.js'

/** Etapa 7.1: sem entidades, sem migrations e SEM synchronize automático. */
export function createDataSource(env: ApiEnv): DataSource {
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [],
    migrations: [],
    extra: { connectionTimeoutMillis: 3000 },
  })
}

export function createReadinessProbe(dataSource: DataSource): () => Promise<boolean> {
  let connecting: Promise<unknown> | undefined
  return async () => {
    try {
      if (!dataSource.isInitialized) {
        connecting ??= dataSource.initialize().finally(() => { connecting = undefined })
        await connecting
      }
      await dataSource.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
