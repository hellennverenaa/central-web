import test from 'node:test'
import assert from 'node:assert/strict'
import { createWriteScheduler } from '../src/lib/writeScheduler.ts'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('edições sucessivas produzem uma gravação após pequeno intervalo', async () => {
  let writes = 0
  const writer = createWriteScheduler(() => { writes += 1 }, 30)
  writer.schedule()
  writer.schedule()
  writer.schedule()
  assert.equal(writes, 0)
  await wait(75)
  assert.equal(writes, 1)
  writer.cancel()
})

test('salvamento explícito grava imediatamente e cancela timer pendente', async () => {
  let writes = 0
  const writer = createWriteScheduler(() => { writes += 1 }, 50)
  writer.schedule()
  writer.flush()
  assert.equal(writes, 1)
  await wait(80)
  assert.equal(writes, 1)
})

test('ao ocultar ou sair só grava quando há edições pendentes', () => {
  let writes = 0
  const writer = createWriteScheduler(() => { writes += 1 }, 500)
  writer.flushPending()
  assert.equal(writes, 0)
  writer.schedule()
  writer.flushPending()
  assert.equal(writes, 1)
  writer.flushPending()
  assert.equal(writes, 1)
  writer.cancel()
})
