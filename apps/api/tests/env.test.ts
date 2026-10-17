import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from '../src/config/env.js'

const minimal = { DB_PASSWORD: 'senha-local-de-teste' }

test('API usa localhost por padrão e exige senha explícita do banco', () => {
  const env = parseEnv(minimal)
  assert.equal(env.API_HOST, '127.0.0.1')
  assert.equal(env.API_PORT, 3333)
  assert.equal(env.DB_HOST, '127.0.0.1')
  assert.equal(env.DB_PORT, 5433)
  assert.equal(env.DB_PASSWORD, minimal.DB_PASSWORD)
})

test('variáveis inválidas são rejeitadas sem exibir o valor da senha', () => {
  assert.throws(() => parseEnv({}), /DB_PASSWORD/)
  assert.throws(() => parseEnv({ ...minimal, API_PORT: '0' }), /API_PORT/)
  assert.throws(() => parseEnv({ ...minimal, API_HOST: '0.0.0.0' }), /API_HOST/)
  assert.throws(() => parseEnv({ ...minimal, WEB_ORIGIN: 'não é uma URL' }), /WEB_ORIGIN/)
  assert.throws(() => parseEnv({ ...minimal, DB_PORT: 'abc' }), /DB_PORT/)
})

test('configurações explícitas são interpretadas corretamente', () => {
  const env = parseEnv({ ...minimal, API_PORT: '4444', DB_PORT: '5434',
    DB_NAME: 'dev_central', WEB_ORIGIN: 'http://localhost:5174' })
  assert.equal(env.API_PORT, 4444)
  assert.equal(env.DB_PORT, 5434)
  assert.equal(env.DB_NAME, 'dev_central')
})
