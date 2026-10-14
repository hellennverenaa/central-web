import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmAction, currentConfirmation, settleConfirmation } from '../src/lib/confirmation.ts'

test('confirmação estilizada só resolve true quando a usuária confirma', async () => {
  const pending = confirmAction({ title: 'Registrar envio?', message: 'Esta ação não envia mensagens.', confirmLabel: 'Registrar envio' })
  assert.equal(currentConfirmation.value?.title, 'Registrar envio?')
  assert.equal(currentConfirmation.value?.confirmLabel, 'Registrar envio')
  assert.equal(currentConfirmation.value?.tone, undefined)
  settleConfirmation(true)
  assert.equal(await pending, true)
  assert.equal(currentConfirmation.value, null)
})

test('cancelar uma exclusão não executa a ação e permite outra confirmação', async () => {
  const pending = confirmAction({ title: 'Excluir projeto?', message: 'A exclusão remove o briefing.', tone: 'danger' })
  let confirmed = false
  const operation = pending.then(ok => { if (ok) confirmed = true })
  settleConfirmation(false)
  await operation
  assert.equal(confirmed, false)
  assert.equal(currentConfirmation.value, null)
})

test('fila de confirmações processa solicitações sem sobrescrever o diálogo aberto', async () => {
  const first = confirmAction({ title: 'Primeiro', message: 'Um' })
  const second = confirmAction({ title: 'Segundo', message: 'Dois' })
  assert.equal(currentConfirmation.value?.title, 'Primeiro')
  settleConfirmation(false)
  assert.equal(await first, false)
  assert.equal(currentConfirmation.value?.title, 'Segundo')
  settleConfirmation(true)
  assert.equal(await second, true)
  assert.equal(currentConfirmation.value, null)
})
