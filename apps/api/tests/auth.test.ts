import test from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'
import { hashPassword, verifyPassword } from '../src/auth/password.js'
import { createLoginLimiter } from '../src/auth/rateLimit.js'
import { SESSION_COOKIE, sessionDigest, sessionTokenFromCookie } from '../src/auth/session.js'
import type { AuthBackend } from '../src/auth/routes.js'

test('senha é armazenada com salt; mesma senha produz hashes diferentes', async () => {
  const password = 'exemplo-de-senha-ficticia-123'
  const a = await hashPassword(password)
  const b = await hashPassword(password)
  assert.notEqual(a, b)
  assert.doesNotMatch(a, /exemplo-de-senha/)
  assert.equal(await verifyPassword(password, a), true)
  assert.equal(await verifyPassword('senha-incorreta-123', a), false)
  assert.equal(await verifyPassword(password, 'formato inválido'), false)
  assert.equal(await verifyPassword(password, null), false)
  await assert.rejects(() => hashPassword('curta'), /12 caracteres/)
})

test('token de sessão é interpretado somente em formato hexadecimal e nunca armazenado em claro', () => {
  const token = 'a'.repeat(64)
  assert.equal(sessionTokenFromCookie('outra=xyz; ' + SESSION_COOKIE + '=' + token), token)
  assert.equal(sessionTokenFromCookie(SESSION_COOKIE + '=invalido'), null)
  assert.equal(sessionTokenFromCookie(undefined), null)
  assert.match(sessionDigest(token), /^[a-f0-9]{64}$/)
  assert.notEqual(sessionDigest(token), token)
})

test('limitador protege login contra sequência de tentativas repetidas', () => {
  const limit = createLoginLimiter(2, 1000)
  assert.equal(limit.attempt('127.0.0.1', 100), true)
  assert.equal(limit.attempt('127.0.0.1', 200), true)
  assert.equal(limit.attempt('127.0.0.1', 300), false)
  assert.equal(limit.attempt('127.0.0.1', 1101), true)
})

test('limitador mantém bloqueios mesmo quando o número de chaves chega ao limite', () => {
  const limiter = createLoginLimiter(2, 1000, 2)
  assert.equal(limiter.attempt('ip-1', 10), true)
  assert.equal(limiter.attempt('ip-2', 10), true)
  assert.equal(limiter.attempt('ip-2', 11), true)
  assert.equal(limiter.attempt('ip-3', 12), true)
  assert.equal(limiter.attempt('ip-2', 13), false,
    'Adicionar outro IP não pode apagar o bloqueio do IP anterior.')
  limiter.reset('ip-2')
  assert.equal(limiter.attempt('ip-2', 14), true,
    'Login válido pode limpar as tentativas acumuladas do usuário.')
})

test('limitador aceita chaves de contas separadas, não somente endereços IP', () => {
  const limiter = createLoginLimiter(2, 1000)
  assert.equal(limiter.attempt('conta:um', 1), true)
  assert.equal(limiter.attempt('conta:um', 2), true)
  assert.equal(limiter.attempt('conta:um', 3), false)
  assert.equal(limiter.attempt('conta:dois', 3), true)
})

async function withApp(auth: AuthBackend, visit: (url: string) => Promise<void>, ready = async () => true) {
  const server = createApp({
    webOrigin: 'http://localhost:5173', isDatabaseReady: ready, auth,
  }).listen(0, '127.0.0.1')
  try {
    await new Promise<void>((resolve, reject) => {
      if (server.listening) resolve()
      else { server.once('listening', resolve); server.once('error', reject) }
    })
    await visit('http://127.0.0.1:' + (server.address() as AddressInfo).port)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  }
}

test('login: valida origem, credenciais, cookie HttpOnly e consulta perfil autenticado', async () => {
  const token = 'a'.repeat(64)
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.invalid' }
  let loggedOut: string | null = null
  const auth: AuthBackend = {
    login: async (_email, password) => password === 'senha-correta-123' ? { token, user } : null,
    getUser: async requestToken => requestToken === token && !loggedOut ? user : null,
    logout: async requestToken => { loggedOut = requestToken },
  }
  await withApp(auth, async url => {
    // Política de origem se aplica também às futuras rotas de alteração.
    const originMissing = await fetch(url + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'senha-correta-123' }),
    })
    assert.equal(originMissing.status, 403)
    const futurePut = await fetch(url + '/api/projects/any', {
      method: 'PUT', headers: { Origin: 'https://hostile.invalid' },
    })
    assert.equal(futurePut.status, 403)
    const missing = await fetch(url + '/auth/me')
    assert.equal(missing.status, 401)
    const crossSite = await fetch(url + '/auth/login', { method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'senha-correta-123' }) })
    assert.equal(crossSite.status, 403)
    const invalid = await fetch(url + '/auth/login', { method: 'POST',
      headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'senha-errada-123' }) })
    assert.equal(invalid.status, 401)
    assert.equal(invalid.headers.get('set-cookie'), null)
    const correct = await fetch(url + '/auth/login', { method: 'POST',
      headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'senha-correta-123' }) })
    assert.equal(correct.status, 200)
    assert.deepEqual(await correct.json(), { user })
    const cookie = correct.headers.get('set-cookie') ?? ''
    assert.match(cookie, /httponly/i)
    assert.match(cookie, /samesite=strict/i)
    assert.match(cookie, /path=\//i)
    const active = await fetch(url + '/auth/me', { headers: { Cookie: SESSION_COOKIE + '=' + token } })
    assert.equal(active.status, 200)
    assert.deepEqual(await active.json(), { user })
    assert.equal(active.headers.get('cache-control'), 'no-store')
    const forged = await fetch(url + '/auth/me', { headers: { Cookie: SESSION_COOKIE + '=' + 'b'.repeat(64) } })
    assert.equal(forged.status, 401)
    const untrustedLogout = await fetch(url + '/auth/logout', { method: 'POST',
      headers: { Cookie: SESSION_COOKIE + '=' + token, Origin: 'https://evil.example' } })
    assert.equal(untrustedLogout.status, 403)
    const logout = await fetch(url + '/auth/logout', { method: 'POST',
      headers: { Cookie: SESSION_COOKIE + '=' + token, Origin: 'http://localhost:5173' } })
    assert.equal(logout.status, 204)
    assert.equal(loggedOut, token)
    const after = await fetch(url + '/auth/me', { headers: { Cookie: SESSION_COOKIE + '=' + token } })
    assert.equal(after.status, 401)
    const unknown = await fetch(url + '/api/clients')
    assert.equal(unknown.status, 404)
  })
})

test('banco indisponível não expõe detalhes, nem confirma autenticação', async () => {
  const auth: AuthBackend = {
    login: async () => { throw new Error('DB_PASSWORD=muito-secreto') },
    getUser: async () => null,
    logout: async () => undefined,
  }
  await withApp(auth, async url => {
    const response = await fetch(url + '/auth/me', {
      headers: { Cookie: SESSION_COOKIE + '=' + 'a'.repeat(64) },
    })
    assert.equal(response.status, 503)
    assert.doesNotMatch(await response.text(), /muito-secreto/)
  }, async () => false)
})
