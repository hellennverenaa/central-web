import 'reflect-metadata'
import { DataSource } from 'typeorm'
import type { ApiEnv } from '../config/env.js'
import { databaseEntities } from './entities.js'
import { InitialDomainSchema1792200000000 } from './migrations/1792200000000-InitialDomainSchema.js'

/** Etapa 7.2: entidades registradas; executar migrations apenas pelo comando explícito. */
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
    entities: databaseEntities,
    migrations: [InitialDomainSchema1792200000000],
    migrationsTableName: 'schema_migrations',
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
