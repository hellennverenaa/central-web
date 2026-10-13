import test from 'node:test'
import assert from 'node:assert/strict'
import { addProject, addProjectMaterial, addTask, addTransaction, clearAll, removeItem, removeProjectMaterial, state, updateProjectBriefing, updateProjectMaterial } from '../src/lib/store.ts'
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
