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
    status: 'andamento', deadline: '2026-03-01', value: 740, createdAt: '2026-01-02T00:00:00.000Z',
  }
  const task: Task = { id: 'task-1', title: 'Preparar primeira versão', done: false, projectId: project.id, createdAt: '2026-01-02T00:00:00.000Z' }
  const transaction: Transaction = { id: 'transaction-1', description: 'Sinal recebido', kind: 'entrada', amount: 200, date: '2026-01-05', projectId: project.id, createdAt: '2026-01-05T00:00:00.000Z' }
  workspace.leads = [lead]
  workspace.projects = [project]
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

test('backup v3 com referências órfãs é rejeitado', () => {
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

test('migração v1 preserva os registros e acrescenta modelos v3', () => {
  const v1 = {
    schemaVersion: 1,
    leads: [{ id: 'old-lead', name: 'Contato salvo', contact: '', service: 'Serviço antigo', stage: 'conversa', value: 500, notes: 'nota', createdAt: '2025-01-01' }],
    projects: [{ id: 'old-project', name: 'Projeto salvo', client: 'Cliente', status: 'andamento', deadline: '', value: 300, createdAt: '2025-01-02' }],
    transactions: [{ id: 'old-transaction', description: 'Recebido', kind: 'entrada', amount: 50, date: '2025-01-03', createdAt: '2025-01-03' }],
    tasks: [{ id: 'old-task', title: 'Ação salva', done: false, createdAt: '2025-01-04' }],
  }
  const result = migrateWorkspace(v1)
  assert.equal(result.schemaVersion, 3)
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
  assert.equal(result.briefing.length, source.briefing.length)
})

test('leitura migra a chave v2 para v3, sem remover o backup legado', () => {
  const storage = new MemoryStorage()
  const source = createInitialWorkspace()
  const backupV2 = { ...source, schemaVersion: 2 as const, leads: [], projects: [], transactions: [], tasks: [] }
  storage.setItem(LEGACY_STORAGE_KEYS[0], JSON.stringify(backupV2))
  const result = readWorkspace(storage)
  assert.equal(result.migratedFrom, 2)
  assert.equal(result.warning, '')
  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) || '{}').schemaVersion, 3)
  assert.equal(storage.getItem(LEGACY_STORAGE_KEYS[0]), JSON.stringify(backupV2))
})

test('persistência v3 faz round trip e reporta versão atual', () => {
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
  assert.equal(result.workspace.schemaVersion, 3)
  assert.equal(result.workspace.leads.length, 0)
  assert.match(result.warning, /inválido/)
})
