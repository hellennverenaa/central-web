import test from 'node:test'
import assert from 'node:assert/strict'
import { addProject, addTask, addTransaction, clearAll, state, updateProjectBriefing } from '../src/lib/store.ts'
import { readWorkspace, writeWorkspace, WORKSPACE_STORAGE_KEY, type StoragePort } from '../src/lib/workspace.ts'

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
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 4)
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
