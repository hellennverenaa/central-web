import test from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'

async function exercise(ready: () => Promise<boolean>, run: (url: string) => Promise<void>) {
  const server = createApp({ webOrigin: 'http://localhost:5173', isDatabaseReady: ready }).listen(0, '127.0.0.1')
  try {
    await new Promise<void>((resolve, reject) => {
      if (server.listening) return resolve()
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const port = (server.address() as AddressInfo).port
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

test('liveness responde sem banco e não revela tecnologia do servidor', async () => {
  await exercise(async () => false, async url => {
    const res = await fetch(url + '/health')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: 'ok' })
    assert.equal(res.headers.get('x-powered-by'), null)
    assert.equal(res.headers.get('cache-control'), 'no-store')
  })
})

test('readiness só responde 200 quando o banco está acessível', async () => {
  await exercise(async () => false, async url => {
    const res = await fetch(url + '/health/ready')
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { status: 'unavailable' })
  })
  await exercise(async () => true, async url => {
    const res = await fetch(url + '/health/ready')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: 'ready' })
  })
})

test('falhas da verificação são ocultadas e endpoints de clientes não existem ainda', async () => {
  await exercise(async () => { throw new Error('secret password') }, async url => {
    const res = await fetch(url + '/health/ready')
    assert.equal(res.status, 503)
    assert.doesNotMatch(await res.text(), /secret password/)
    const missing = await fetch(url + '/api/clients')
    assert.equal(missing.status, 404)
    assert.deepEqual(await missing.json(), { error: 'not_found' })
  })
})

test('CORS permite apenas a origem explicitamente configurada', async () => {
  await exercise(async () => true, async url => {
    const allowed = await fetch(url + '/health', { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })
})
