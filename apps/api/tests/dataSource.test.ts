import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from '../src/config/env.js'
import { createDataSource, createReadinessProbe } from '../src/db/dataSource.js'
import { UserEntity } from '../src/db/entities.js'

const env = parseEnv({ DB_PASSWORD: 'senha-apenas-para-teste' })

test('TypeORM só registra entidades e migrations, sem alterar tabelas automaticamente', () => {
  const dataSource = createDataSource(env)
  assert.equal(dataSource.options.type, 'postgres')
  assert.equal(dataSource.options.synchronize, false)
  assert.equal(dataSource.options.migrationsRun, false)
  assert.equal(dataSource.options.entities?.length, 17)
  assert.equal(dataSource.options.migrations?.length, 3)
  assert.equal(dataSource.options.migrationsTableName, 'schema_migrations')
  assert.equal(UserEntity.options.schema, 'auth')
  assert.equal(dataSource.isInitialized, false)
})

test('readiness não considera banco desconectado como pronto', async () => {
  const fake = {
    isInitialized: false,
    initialize: async () => { throw new Error('banco desligado') },
    query: async () => { throw new Error('não deveria chegar aqui') },
  }
  const probe = createReadinessProbe(fake as unknown as ReturnType<typeof createDataSource>)
  assert.equal(await probe(), false)
})

test('readiness rejeita banco conectado enquanto a autenticação não foi migrada', async () => {
  let queried = false
  const fake = {
    isInitialized: true,
    showMigrations: async () => true,
    query: async () => { queried = true; return [{ '?column?': 1 }] },
  }
  const probe = createReadinessProbe(fake as unknown as ReturnType<typeof createDataSource>)
  assert.equal(await probe(), false)
  assert.equal(queried, false, 'Não pode reportar ready sem migrations completas.')
})

test('readiness aceita banco migrado e conectado', async () => {
  let checks = 0
  const fake = {
    isInitialized: true,
    showMigrations: async () => { checks += 1; return false },
    query: async () => [{ '?column?': 1 }],
  }
  const probe = createReadinessProbe(fake as unknown as ReturnType<typeof createDataSource>)
  assert.equal(await probe(), true)
  assert.equal(checks, 1)
})
