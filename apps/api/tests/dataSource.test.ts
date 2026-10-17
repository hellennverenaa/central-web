import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from '../src/config/env.js'
import { createDataSource, createReadinessProbe } from '../src/db/dataSource.js'

const env = parseEnv({ DB_PASSWORD: 'senha-apenas-para-teste' })

test('TypeORM nunca gera tabelas automaticamente na etapa de estrutura', () => {
  const dataSource = createDataSource(env)
  assert.equal(dataSource.options.type, 'postgres')
  assert.equal(dataSource.options.synchronize, false)
  assert.equal(dataSource.options.migrationsRun, false)
  assert.deepEqual(dataSource.options.entities, [])
  assert.deepEqual(dataSource.options.migrations, [])
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
