import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayActions } from '../src/lib/todayActions.ts'
import { createInitialWorkspace, createProjectBriefing } from '../src/lib/workspace.ts'
import type { Workspace } from '../src/lib/types.ts'

const today = '2026-10-12'
function projectWorkspace(deadline = '2026-12-01'): Workspace {
  const w = createInitialWorkspace()
  w.projects.push({
    id: 'project-1', name: 'Convite fictício', client: 'Cliente ilustrativo',
    serviceId: null, sourceLeadId: null, briefingId: 'brief-1',
    status: 'andamento', deadline, value: 600, createdAt: '2026-10-01T00:00:00Z',
  })
  const template = w.briefingTemplates.find(item => item.id === 'brief-template-general')!
  w.projectBriefings.push(createProjectBriefing('project-1', template, 'brief-1', '2026-10-01T00:00:00Z'))
  w.tasks.push({ id: 'task-1', title: 'Finalizar layout', projectId: 'project-1', done: false, createdAt: '2026-10-01T00:00:00Z' })
  return w
}

test('Hoje mostra uma única prioridade por projeto e coloca prazo vencido primeiro', () => {
  const w = projectWorkspace('2026-10-10')
  w.leads.push({
    id: 'lead-1', name: 'Contato em proposta', contact: '', service: 'Página web',
    serviceId: null, convertedProjectId: null, stage: 'proposta', value: 200,
    notes: '', createdAt: '2026-10-01T00:00:00Z',
  })
  const original = structuredClone(w)
  const list = buildTodayActions(w, today)
  const project = list.filter(item => item.target === 'project')
  assert.equal(project.length, 1)
  assert.equal(project[0]?.kind, 'prazo')
  assert.equal(project[0]?.priority, 'urgente')
  assert.equal(project[0]?.target === 'project' ? project[0].tab : null, 'resumo')
  assert.equal(list[0]?.id, 'project:project-1')
  assert.equal(list[1]?.id, 'lead:lead-1')
  assert.deepEqual(w, original)
})

test('Hoje reconhece prazo para hoje, próximo em sete dias e fora da janela', () => {
  const w = projectWorkspace('2026-10-12')
  assert.equal(buildTodayActions(w, today)[0]?.title, 'Prazo do projeto é hoje')
  w.projects[0]!.deadline = '2026-10-19'
  assert.equal(buildTodayActions(w, today)[0]?.title, 'Prazo do projeto se aproxima')
  w.projects[0]!.deadline = '2026-10-20'
  assert.equal(buildTodayActions(w, today)[0]?.kind, 'briefing')
  w.projects[0]!.deadline = ''
  assert.equal(buildTodayActions(w, today)[0]?.kind, 'briefing')
})

test('Hoje respeita campos obrigatórios condicionais e passa a mostrar tarefa após completar briefing', () => {
  const w = projectWorkspace()
  const briefing = w.projectBriefings[0]!
  assert.equal(buildTodayActions(w, today)[0]?.kind, 'briefing')
  briefing.answers = { 'general-goal': 'Convite digital', 'general-deadline': '2026-11-30', 'general-materials-ready': 'Sim', 'general-contact': 'Responsável fictício' }
  const action = buildTodayActions(w, today)[0]!
  assert.equal(action.kind, 'producao')
  assert.equal(action.target === 'project' ? action.tab : null, 'tarefas')
  assert.match(action.description, /Finalizar layout/)
  w.tasks[0]!.done = true
  const afterTask = buildTodayActions(w, today)[0]!
  assert.equal(afterTask.kind, 'financeiro')
  assert.equal(afterTask.priority, 'acompanhar')
  assert.match(afterTask.description, /Nenhuma data de cobrança/)
  assert.equal(w.transactions.length, 0)
  w.transactions.push({ id: 'tx-1', description: 'Entrada fictícia', amount: 600, kind: 'entrada', date: today, projectId: 'project-1', createdAt: today })
  assert.equal(buildTodayActions(w, today).length, 0)
})

test('Hoje ignora projetos entregues sem pendência financeira e não chama pagamento de atrasado', () => {
  const w = projectWorkspace('2026-09-01')
  w.projects[0]!.status = 'entregue'
  const action = buildTodayActions(w, today)[0]!
  assert.equal(action.kind, 'financeiro')
  assert.equal(action.priority, 'acompanhar')
  assert.equal(action.target === 'project' ? action.tab : null, 'financeiro')
  assert.doesNotMatch(action.title + action.description, /atrasad|vencid/i)
  w.transactions.push({ id: 'tx-1', description: 'Pago', amount: 600, kind: 'entrada', date: today, projectId: 'project-1', createdAt: today })
  assert.deepEqual(buildTodayActions(w, today), [])
})

test('Hoje prioriza proposta aberta, mostra conversa e tarefas avulsas e ignora concluídas/convertidas', () => {
  const w = createInitialWorkspace()
  const lead = { name: 'Contato A', contact: '', service: 'A definir',
    serviceId: null, convertedProjectId: null, value: 0, notes: '', createdAt: '2026-10-01T00:00:00Z' }
  w.leads = [
    { ...lead, id: 'lead-proposal', stage: 'proposta' },
    { ...lead, id: 'lead-new', name: 'Contato B', stage: 'novo' },
    { ...lead, id: 'lead-lost', stage: 'perdido' },
    { ...lead, id: 'lead-converted', stage: 'ganho', convertedProjectId: 'project-2' },
  ]
  w.tasks = [
    { id: 'personal-open', title: 'Revisar divulgação', done: false, projectId: null, createdAt: today },
    { id: 'personal-done', title: 'Concluído', done: true, projectId: null, createdAt: today },
  ]
  const actions = buildTodayActions(w, today)
  assert.deepEqual(actions.map(item => item.id), ['lead:lead-proposal', 'lead:lead-new', 'task:personal-open'])
  assert.equal(actions[0]?.target, 'lead')
  assert.equal(actions.at(-1)?.target, 'task')
})

test('Hoje sinaliza oportunidade ganha sem projeto sem criar registros novos', () => {
  const w = createInitialWorkspace()
  w.leads.push({
    id: 'legacy-win', name: 'Atendimento antigo', contact: '', service: 'A definir', serviceId: null,
    convertedProjectId: null, stage: 'ganho', value: 0, notes: '', createdAt: today,
  })
  const action = buildTodayActions(w, today)[0]!
  assert.equal(action.priority, 'urgente')
  assert.match(action.title, /Regularizar oportunidade/)
  assert.equal(w.projects.length, 0)
})
