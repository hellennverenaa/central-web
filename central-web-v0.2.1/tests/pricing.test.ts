import test from 'node:test'
import assert from 'node:assert/strict'
import { serviceFloor, serviceSuggestion } from '../src/lib/pricing.ts'

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
