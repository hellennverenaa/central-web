import test from 'node:test'
import assert from 'node:assert/strict'
import { initialConversionPrice, serviceFloor, serviceSuggestion } from '../src/lib/pricing.ts'

test('o convite simples usa 3 horas a 30 reais com reserva de 15%', () => {
  const s = { hours: 3, hourlyRate: 30, extras: 0, contingency: 0.15 }
  assert.ok(Math.abs(serviceFloor(s) - 103.5) < 0.001)
  assert.equal(serviceSuggestion(s), 110)
})
test('custos extras entram após a reserva', () => {
  assert.equal(serviceFloor({hours: 10, hourlyRate: 30, extras: 40, contingency: 0.2}), 400)
})
test('valores inválidos não fazem o simulador exibir NaN', () => {
  assert.equal(serviceFloor({hours: NaN, hourlyRate: 30, extras: 0, contingency: 0.2}), 0)
})

test('conversão preserva a estimativa em vez de sobrescrevê-la pela sugestão', () => {
  const service = { hours: 5, hourlyRate: 30, extras: 0, contingency: 0.2 }
  assert.equal(serviceSuggestion(service), 180)
  assert.equal(initialConversionPrice(300, service), 300)
  assert.equal(initialConversionPrice(0, service), 180)
  assert.equal(initialConversionPrice(0, null), 0)
})
