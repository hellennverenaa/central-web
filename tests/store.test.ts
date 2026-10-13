import test from 'node:test'
import assert from 'node:assert/strict'
import { addProject, addProjectMaterial, addProjectInstallment, addTask, addTransaction, clearAll, removeItem, removeProjectMaterial, saveProjectDelivery, state, updateProjectBriefing, updateProjectMaterial, updateProjectInstallment, updateTransaction } from '../src/lib/store.ts'
import { readWorkspace, writeWorkspace, WORKSPACE_STORAGE_KEY, type StoragePort } from '../src/lib/workspace.ts'

import { installmentReceived, installmentBalance } from '../src/lib/projectMilestones.ts'

class MemoryStorage implements StoragePort {
  values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

test('projeto copia tarefas e questionário do serviço e persiste respostas e lançamentos vinculados', () => {
  clearAll()
  const service = state.services.find(item => item.id === 'service-04')!
  const project = addProject({
    name: 'Página do negócio', client: 'Cliente de exemplo', serviceId: service.id,
    status: 'planejado', deadline: '2026-09-15', value: 850,
  })
  const briefing = state.projectBriefings.find(item => item.id === project.briefingId)!
  const projectTasks = state.tasks.filter(task => task.projectId === project.id)
  assert.deepEqual(projectTasks.map(task => task.title), service.taskTemplates)
  assert.equal(briefing.templateId, service.briefingTemplateId)

  updateProjectBriefing(briefing.id, { 'business-name': 'Cliente de exemplo' })
  addTask('Enviar protótipo', project.id)
  addTask('Revisar calendário')
  addTransaction({ description: 'Sinal', kind: 'entrada', amount: 300, date: '2026-08-02', projectId: project.id })

  const storage = new MemoryStorage()
  writeWorkspace(state, storage)
  const reopened = readWorkspace(storage).workspace
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 6)
  assert.equal(reopened.projectBriefings.find(item => item.projectId === project.id)?.answers['business-name'], 'Cliente de exemplo')
  assert.equal(reopened.tasks.filter(task => task.projectId === project.id).length, service.taskTemplates.length + 1)
  assert.equal(reopened.tasks.find(task => task.title === 'Revisar calendário')?.projectId, null)
  assert.equal(reopened.transactions[0].projectId, project.id)
})

test('respostas inválidas ou pertencentes a outro projeto não são salvas', () => {
  clearAll()
  const project = addProject({ name: 'Projeto', client: 'Cliente', serviceId: 'service-03', status: 'planejado', deadline: '', value: 0 })
  const briefing = state.projectBriefings.find(item => item.id === project.briefingId)!
  assert.throws(() => updateProjectBriefing(briefing.id, { 'missing-question': 'valor' }), /não pertence/)
  assert.throws(() => updateProjectBriefing(briefing.id, { 'event-type': ['Casamento'] }), /único valor/)
})

test('materiais pertencem ao projeto, são editáveis, persistem e são excluídos com ele', () => {
  clearAll()
  const project = addProject({ name: 'Site demonstrativo', client: 'Cliente fictício', serviceId: null, status: 'planejado', deadline: '2026-10-15', value: 200 })
  const input = { projectId: project.id, name: '  Protótipo no Figma  ', category: 'design' as const, url: 'https://www.figma.com', notes: '  Revisar  ' }
  assert.throws(() => addProjectMaterial({ ...input, url: 'javascript:alert(1)' }), /http/)
  assert.throws(() => addProjectMaterial({ ...input, projectId: 'projeto-inexistente' }), /não foi encontrado/)
  const item = addProjectMaterial(input)
  assert.equal(item.name, 'Protótipo no Figma')
  assert.equal(item.notes, 'Revisar')
  assert.equal(item.url, 'https://www.figma.com/')
  assert.throws(() => updateProjectMaterial(item.id, { ...input, projectId: 'projeto-inexistente' }), /não foi encontrado/)
  updateProjectMaterial(item.id, { ...input, name: 'Link de entrega', category: 'entrega', url: 'https://example.org/entrega', notes: '' })
  assert.equal(state.projectMaterials[0].category, 'entrega')
  const storage = new MemoryStorage()
  writeWorkspace(state, storage)
  assert.equal(readWorkspace(storage).workspace.projectMaterials[0].name, 'Link de entrega')
  removeProjectMaterial(item.id, project.id)
  assert.equal(state.projectMaterials.length, 0)
  addProjectMaterial(input)
  removeItem('projects', project.id)
  assert.equal(state.projectMaterials.length, 0)
})

test('cobranças previstas não alteram caixa e vínculo de recebimentos parciais não duplica receita', () => {
  clearAll()
  const project = addProject({ name: 'Site demonstrativo', client: 'Pessoa fictícia', serviceId: null, status: 'andamento', deadline: '2026-11-20', value: 1000 })
  const input = { projectId: project.id, title: 'Entrada combinada', amount: 500, dueDate: '2026-11-01', receivedTransactionIds: [] as string[] }
  const installment = addProjectInstallment(input)
  assert.equal(state.transactions.length, 0)
  assert.equal(installmentReceived(installment, state.transactions), 0)
  const first = addTransaction({ description: 'Primeira parte', amount: 200, kind: 'entrada', date: '2026-10-20', projectId: project.id })
  const second = addTransaction({ description: 'Segunda parte', amount: 100, kind: 'entrada', date: '2026-10-22', projectId: project.id })
  updateProjectInstallment(installment.id, { ...input, receivedTransactionIds: [first.id, second.id] })
  assert.equal(installmentReceived(installment, state.transactions), 300)
  assert.equal(installmentBalance(installment, state.transactions), 200)
  assert.equal(state.transactions.filter(item => item.kind === 'entrada').reduce((sum, item) => sum + item.amount, 0), 300)
  assert.throws(() => addProjectInstallment({ ...input, title: 'Outra', receivedTransactionIds: [first.id] }), /já está vinculado/)
  assert.throws(() => addProjectInstallment({ ...input, title: 'Invalida', amount: -5 }), /positivo/)
  assert.throws(() => addProjectInstallment({ ...input, dueDate: '2026-02-31' }), /data/)
  const storage = new MemoryStorage()
  writeWorkspace(state, storage)
  const restored = readWorkspace(storage).workspace
  assert.equal(restored.projectInstallments[0].receivedTransactionIds.length, 2)
  removeItem('transactions', first.id)
  assert.equal(state.projectInstallments[0].receivedTransactionIds.length, 1)
  updateTransaction(second.id, { description: 'Movido', amount: 100, kind: 'entrada', date: '2026-10-22', projectId: null })
  assert.equal(state.projectInstallments[0].receivedTransactionIds.length, 0)
  assert.equal(installmentBalance(state.projectInstallments[0], state.transactions), 500)
})

test('revisão, aprovação e entrega preservam datas explícitas e não geram recebimentos', () => {
  clearAll()
  const project = addProject({ name: 'Convite demonstrativo', client: 'Cliente exemplo', serviceId: null, status: 'andamento', deadline: '2026-11-15', value: 750 })
  const input = { projectId: project.id, reviewSentAt: '2026-10-20', approvedAt: '', deliveredAt: '', notes: 'Uma revisão' }
  saveProjectDelivery(input)
  assert.equal(state.projects.find(item => item.id === project.id)?.status, 'revisao')
  assert.equal(state.transactions.length, 0)
  assert.throws(() => saveProjectDelivery({ ...input, approvedAt: '2026-10-19' }), /anterior/)
  saveProjectDelivery({ ...input, approvedAt: '2026-10-21', deliveredAt: '2026-10-25' })
  assert.equal(state.projects.find(item => item.id === project.id)?.status, 'entregue')
  assert.equal(state.projectDeliveries.length, 1)
  const storage = new MemoryStorage()
  writeWorkspace(state, storage)
  assert.equal(readWorkspace(storage).workspace.projectDeliveries[0].deliveredAt, '2026-10-25')
  assert.equal(state.transactions.length, 0)
  removeItem('projects', project.id)
  assert.deepEqual(state.projectDeliveries, [])
  assert.deepEqual(state.projectInstallments, [])
})
