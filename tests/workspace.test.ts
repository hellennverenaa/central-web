import test from 'node:test'
import assert from 'node:assert/strict'
import type { Lead, Project, Task, Transaction, Workspace } from '../src/lib/types.ts'
import {
  convertOpportunityToProject,
  createInitialWorkspace,
  LEGACY_STORAGE_KEYS,
  migrateWorkspace,
  readWorkspace,
  WORKSPACE_STORAGE_KEY,
  createProjectBriefing,
  writeWorkspace,
  type StoragePort,
} from '../src/lib/workspace.ts'

class MemoryStorage implements StoragePort {
  values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

function linkedWorkspace(): Workspace {
  const workspace = createInitialWorkspace()
  const service = workspace.services[0]
  const lead: Lead = {
    id: 'lead-1', name: 'Cliente de exemplo', contact: '', service: service.name, serviceId: service.id,
    convertedProjectId: 'project-1', stage: 'ganho', value: 900, notes: '', createdAt: '2026-01-01T00:00:00.000Z',
  }
  const project: Project = {
    id: 'project-1', name: 'Site contratado', client: lead.name, serviceId: service.id, sourceLeadId: lead.id,
    briefingId: 'project-briefing-1', status: 'andamento', deadline: '2026-03-01', value: 740, createdAt: '2026-01-02T00:00:00.000Z',
  }
  const task: Task = { id: 'task-1', title: 'Preparar primeira versão', done: false, projectId: project.id, createdAt: '2026-01-02T00:00:00.000Z' }
  const transaction: Transaction = { id: 'transaction-1', description: 'Sinal recebido', kind: 'entrada', amount: 200, date: '2026-01-05', projectId: project.id, createdAt: '2026-01-05T00:00:00.000Z' }
  workspace.leads = [lead]
  workspace.projects = [project]
  const template = workspace.briefingTemplates.find(item => item.id === service.briefingTemplateId)!
  workspace.projectBriefings = [createProjectBriefing(project.id, template, project.briefingId!, project.createdAt)]
  workspace.tasks = [task]
  workspace.transactions = [transaction]
  return workspace
}

test('vínculos por ID conectam oportunidade, serviço, projeto, tarefa e lançamento', () => {
  const result = migrateWorkspace(linkedWorkspace())
  const lead = result.leads[0]
  const project = result.projects[0]
  assert.equal(lead.convertedProjectId, project.id)
  assert.equal(project.sourceLeadId, lead.id)
  assert.equal(lead.serviceId, project.serviceId)
  assert.equal(result.tasks[0].projectId, project.id)
  assert.equal(result.transactions[0].projectId, project.id)
})

test('backup atual com referências órfãs é rejeitado', () => {
  const invalid = linkedWorkspace()
  invalid.tasks[0].projectId = 'missing-project'
  assert.throws(() => migrateWorkspace(invalid), /Backup inválido/)
})

test('converter oportunidade usa o preço informado e mantém a estimativa separada', () => {
  const workspace = createInitialWorkspace()
  const service = workspace.services[0]
  workspace.leads.push({
    id: 'lead-2', name: 'Negócio local', contact: '', service: service.name, serviceId: service.id,
    convertedProjectId: null, stage: 'proposta', value: 1250, notes: '', createdAt: '2026-02-01T00:00:00.000Z',
  })
  const project = convertOpportunityToProject(workspace, 'lead-2', {
    name: 'Página da campanha', client: 'Negócio local', status: 'planejado', deadline: '2026-04-01', value: 0,
  }, 'project-2', '2026-02-02T00:00:00.000Z')
  assert.equal(project.value, 0)
  assert.equal(project.sourceLeadId, 'lead-2')
  assert.equal(project.serviceId, service.id)
  assert.equal(workspace.leads[0].stage, 'ganho')
  assert.equal(workspace.leads[0].convertedProjectId, project.id)
  assert.equal(workspace.leads[0].value, 1250)
  assert.throws(() => convertOpportunityToProject(workspace, 'lead-2', {
    name: 'Outro projeto', client: 'Negócio local', status: 'planejado', deadline: '2026-04-01', value: 500,
  }, 'project-3'), /já foi convertida/)
})

test('converter oportunidade prepara tarefas e briefing do serviço para o novo projeto', () => {
  const workspace = createInitialWorkspace()
  const service = workspace.services[0]
  workspace.leads.push({
    id: 'lead-auto', name: 'Cliente com serviço', contact: '', service: service.name, serviceId: service.id,
    convertedProjectId: null, stage: 'proposta', value: 900, notes: '', createdAt: '2026-04-01T00:00:00.000Z',
  })

  const project = convertOpportunityToProject(workspace, 'lead-auto', {
    name: 'Convite do evento', client: 'Cliente com serviço', status: 'planejado', deadline: '2026-05-01', value: 700,
  }, 'project-auto', '2026-04-02T00:00:00.000Z')

  const projectTasks = workspace.tasks.filter(task => task.projectId === project.id)
  const briefing = workspace.projectBriefings.find(item => item.projectId === project.id)
  assert.equal(projectTasks.length, service.taskTemplates.length)
  assert.deepEqual(projectTasks.map(task => task.title), service.taskTemplates)
  assert.ok(projectTasks.every(task => !task.done))
  assert.ok(project.briefingId)
  assert.equal(briefing?.id, project.briefingId)
  assert.equal(briefing?.templateId, service.briefingTemplateId)
  assert.deepEqual(briefing?.answers, {})
})

test('migração v1 preserva os registros e acrescenta modelos estruturados', () => {
  const v1 = {
    schemaVersion: 1,
    leads: [{ id: 'old-lead', name: 'Contato salvo', contact: '', service: 'Serviço antigo', stage: 'conversa', value: 500, notes: 'nota', createdAt: '2025-01-01' }],
    projects: [{ id: 'old-project', name: 'Projeto salvo', client: 'Cliente', status: 'andamento', deadline: '', value: 300, createdAt: '2025-01-02' }],
    transactions: [{ id: 'old-transaction', description: 'Recebido', kind: 'entrada', amount: 50, date: '2025-01-03', createdAt: '2025-01-03' }],
    tasks: [{ id: 'old-task', title: 'Ação salva', done: false, createdAt: '2025-01-04' }],
  }
  const result = migrateWorkspace(v1)
  assert.equal(result.schemaVersion, 5)
  assert.equal(result.leads[0].name, 'Contato salvo')
  assert.equal(result.leads[0].serviceId, null)
  assert.equal(result.projects[0].name, 'Projeto salvo')
  assert.equal(result.projects[0].sourceLeadId, null)
  assert.equal(result.transactions[0].projectId, null)
  assert.equal(result.tasks[0].projectId, null)
  assert.ok(result.services.length > 0)
  assert.ok(result.plan.length > 0)
})

test('migração v2 preserva todos os módulos e associa serviço por nome único', () => {
  const source = createInitialWorkspace()
  const service = source.services[0]
  const v2 = {
    ...source,
    schemaVersion: 2 as const,
    briefing: source.legacyBriefing,
    services: source.services.map(({ taskTemplates: _taskTemplates, briefingTemplateId: _briefingTemplateId, ...row }) => row),
    leads: [{ id: 'v2-lead', name: 'Cliente v2', contact: '', service: service.name, stage: 'novo', value: 150, notes: '', createdAt: '2025-02-01', privateExtra: 'discard' }],
    projects: [{ id: 'v2-project', name: 'Projeto v2', client: 'Cliente v2', status: 'planejado', deadline: '', value: 0, createdAt: '2025-02-02' }],
    transactions: [{ id: 'v2-tx', description: 'Domínio', kind: 'saida', amount: 30, date: '2025-02-03', createdAt: '2025-02-03' }],
    tasks: [{ id: 'v2-task', title: 'Enviar escopo', done: false, createdAt: '2025-02-04' }],
  }
  const result = migrateWorkspace(v2)
  assert.equal(result.leads[0].serviceId, service.id)
  assert.equal(result.leads[0].service, service.name)
  assert.equal('privateExtra' in result.leads[0], false)
  assert.equal(result.projects[0].sourceLeadId, null)
  assert.equal(result.transactions[0].projectId, null)
  assert.equal(result.tasks[0].projectId, null)
  assert.equal(result.services.length, source.services.length)
  assert.equal(result.publications.length, source.publications.length)
  assert.equal(result.legacyBriefing.length, source.legacyBriefing.length)
})

test('leitura migra a chave v2 para v5, sem remover o backup legado', () => {
  const storage = new MemoryStorage()
  const source = createInitialWorkspace()
  const backupV2 = {
    ...source, schemaVersion: 2 as const, leads: [], projects: [], transactions: [], tasks: [],
    services: source.services.map(({ taskTemplates: _taskTemplates, briefingTemplateId: _briefingTemplateId, ...row }) => row),
    briefing: source.legacyBriefing,
  }
  storage.setItem(LEGACY_STORAGE_KEYS[2], JSON.stringify(backupV2))
  const result = readWorkspace(storage)
  assert.equal(result.migratedFrom, 2)
  assert.equal(result.warning, '')
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 5)
  assert.equal(storage.getItem(LEGACY_STORAGE_KEYS[2]), JSON.stringify(backupV2))
})

test('persistência v5 faz round trip e reporta versão atual', () => {
  const storage = new MemoryStorage()
  const source = linkedWorkspace()
  writeWorkspace(source, storage)
  const result = readWorkspace(storage)
  assert.equal(result.migratedFrom, null)
  assert.deepEqual(result.workspace, source)
})

test('leitura ignora JSON local inválido e retorna modelos seguros', () => {
  const storage = new MemoryStorage()
  storage.setItem(WORKSPACE_STORAGE_KEY, '{broken')
  const result = readWorkspace(storage)
  assert.equal(result.workspace.schemaVersion, 5)
  assert.equal(result.workspace.leads.length, 0)
  assert.match(result.warning, /inválido/)
})

test('migração v3 mantém relações, tarefas e roteiro legado, e cria respostas próprias para projetos antigos', () => {
  const current = linkedWorkspace()
  const project = current.projects[0]
  const service = current.services[0]
  const backupV3 = {
    schemaVersion: 3,
    leads: current.leads,
    projects: current.projects.map(({ briefingId: _briefingId, ...row }) => row),
    transactions: current.transactions,
    tasks: current.tasks,
    plan: current.plan,
    services: current.services.map(({ taskTemplates: _tasks, briefingTemplateId: _templateId, ...row }) => row),
    publications: current.publications,
    briefing: current.legacyBriefing,
  }
  const result = migrateWorkspace(backupV3)
  const migratedProject = result.projects.find(item => item.id === project.id)!
  const migratedBriefing = result.projectBriefings.find(item => item.projectId === project.id)
  assert.equal(result.schemaVersion, 5)
  assert.equal(result.leads[0].convertedProjectId, project.id)
  assert.equal(result.tasks[0].projectId, project.id)
  assert.equal(result.transactions[0].projectId, project.id)
  assert.equal(migratedProject.briefingId, migratedBriefing?.id)
  assert.equal(migratedBriefing?.templateId, service.briefingTemplateId)
  assert.deepEqual(result.legacyBriefing, current.legacyBriefing)
})

test('leitura migra a chave v3 para v5 e preserva o arquivo de origem', () => {
  const storage = new MemoryStorage()
  const current = linkedWorkspace()
  const backupV3 = {
    schemaVersion: 3,
    leads: current.leads,
    projects: current.projects.map(({ briefingId: _briefingId, ...row }) => row),
    transactions: current.transactions,
    tasks: current.tasks,
    plan: current.plan,
    services: current.services.map(({ taskTemplates: _tasks, briefingTemplateId: _templateId, ...row }) => row),
    publications: current.publications,
    briefing: current.legacyBriefing,
  }
  storage.setItem(LEGACY_STORAGE_KEYS[1], JSON.stringify(backupV3))
  const result = readWorkspace(storage)
  assert.equal(result.migratedFrom, 3)
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 5)
  assert.equal(storage.getItem(LEGACY_STORAGE_KEYS[1]), JSON.stringify(backupV3))
  assert.equal(result.workspace.tasks[0].projectId, current.projects[0].id)
})

test('respostas e perguntas de projetos são cópias independentes do modelo', () => {
  const workspace = createInitialWorkspace()
  const service = workspace.services[0]
  const eventTemplate = workspace.briefingTemplates.find(item => item.id === service.briefingTemplateId)!
  const makeLead = (id: string): Lead => ({
    id, name: `Cliente ${id}`, contact: '', service: service.name, serviceId: service.id,
    convertedProjectId: null, stage: 'proposta', value: 500, notes: '', createdAt: '2026-05-01',
  })
  workspace.leads.push(makeLead('independent-1'), makeLead('independent-2'))
  const first = convertOpportunityToProject(workspace, 'independent-1', { name: 'Projeto A', client: 'A', status: 'planejado', deadline: '', value: 500 }, 'project-a', '2026-05-02')
  const second = convertOpportunityToProject(workspace, 'independent-2', { name: 'Projeto B', client: 'B', status: 'planejado', deadline: '', value: 500 }, 'project-b', '2026-05-02')
  const firstBriefing = workspace.projectBriefings.find(item => item.projectId === first.id)!
  const secondBriefing = workspace.projectBriefings.find(item => item.projectId === second.id)!
  const originalQuestion = firstBriefing.sections[0].questions[0].label
  firstBriefing.answers['event-type'] = 'Casamento'
  firstBriefing.sections[0].questions[0].label = 'Alteração local'
  eventTemplate.sections[0].questions[0].label = 'Alteração no modelo'
  assert.equal(secondBriefing.answers['event-type'], undefined)
  assert.equal(secondBriefing.sections[0].questions[0].label, originalQuestion)
})

test('migração v4 preserva clientes, projetos, briefings e tarefas sem apagar a chave anterior', () => {
  const storage = new MemoryStorage()
  const current = linkedWorkspace()
  const { projectMaterials: _projectMaterials, ...legacy } = current
  const backupV4 = { ...legacy, schemaVersion: 4 }
  storage.setItem(LEGACY_STORAGE_KEYS[0], JSON.stringify(backupV4))
  const result = readWorkspace(storage)
  assert.equal(result.migratedFrom, 4)
  assert.equal(result.workspace.schemaVersion, 5)
  assert.deepEqual(result.workspace.leads, current.leads)
  assert.deepEqual(result.workspace.projects, current.projects)
  assert.deepEqual(result.workspace.projectBriefings, current.projectBriefings)
  assert.deepEqual(result.workspace.tasks, current.tasks)
  assert.deepEqual(result.workspace.projectMaterials, [])
  assert.equal(storage.getItem(LEGACY_STORAGE_KEYS[0]), JSON.stringify(backupV4))
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 5)
})

test('links de projetos permanecem no backup v5 e referências inválidas são rejeitadas', () => {
  const workspace = linkedWorkspace()
  workspace.projectMaterials.push({
    id: 'material-1', projectId: 'project-1', category: 'design', name: 'Protótipo',
    url: 'https://www.figma.com/', notes: 'Versão em revisão', createdAt: '2026-02-01T00:00:00.000Z',
  })
  const storage = new MemoryStorage()
  writeWorkspace(workspace, storage)
  const reopened = readWorkspace(storage)
  assert.deepEqual(reopened.workspace.projectMaterials, workspace.projectMaterials)
  const orphan = structuredClone(workspace)
  orphan.projectMaterials[0].projectId = 'projeto-inexistente'
  assert.throws(() => migrateWorkspace(orphan), /Backup inválido/)
  const unsafe = structuredClone(workspace)
  unsafe.projectMaterials[0].url = 'javascript:alert(1)'
  assert.throws(() => migrateWorkspace(unsafe), /Backup inválido/)
  const duplicated = structuredClone(workspace)
  duplicated.projectMaterials.push({ ...duplicated.projectMaterials[0] })
  assert.throws(() => migrateWorkspace(duplicated), /Backup inválido/)
})
