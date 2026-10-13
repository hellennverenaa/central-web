import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('novo item do plano mostra exemplos para os campos principais sem valor preenchido', () => {
  const source = readFileSync('src/views/PlanView.vue', 'utf8')
  assert.match(source, /v-model="form.title"[^>]*placeholder="Ex\.: [^"]+"/)
  assert.match(source, /v-model="form.goal"[^>]*placeholder="Ex\.: [^"]+"/)
  assert.match(source, /v-model="form.nextStep"[^>]*placeholder="Ex\.: [^"]+"/)
  assert.match(source, /id="plan-hours-hint"[^>]*Ex\.: /)
  assert.match(source, /title:''/)
  assert.match(source, /goal:''/)
  assert.match(source, /nextStep:''/)
})

test('formulários de cadastro preservam orientações visíveis em campos vazios', () => {
  const files = ['ProjectsView', 'FinanceView', 'ServicesView', 'PublicationsView',
    'TasksView', 'ProjectDeliveryView', 'ProjectInstallmentsView']
  for (const file of files) {
    const source = readFileSync('src/views/' + file + '.vue', 'utf8')
    assert.match(source, /placeholder="Ex\.: [^"]+"/, 'Faltou exemplo em ' + file)
  }
})

test('placeholders possuem contraste explícito nos modos claro e escuro', () => {
  const css = readFileSync('src/style.css', 'utf8')
  assert.match(css, /\.field input::placeholder/)
  assert.match(css, /html\[data-theme="dark"\] \.field input::placeholder/)
  assert.match(css, /html\[data-theme="dark"\] \.field textarea::placeholder/)
})
