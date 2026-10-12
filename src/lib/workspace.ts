import type { BriefingQuestion, Lead, Project, Publication, Service, Task, Transaction, Workspace } from './types.ts'
import { initialBriefing, initialPlan, initialPublications, initialServices } from './catalog.ts'

export const WORKSPACE_STORAGE_KEY = 'central-web:workspace:v3'
export const LEGACY_STORAGE_KEYS = ['central-web:workspace:v2', 'central-web:workspace:v1'] as const

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface WorkspaceLoadResult {
  workspace: Workspace
  migratedFrom: number | null
  warning: string
}

const clone = <T>(value: readonly T[]): T[] => JSON.parse(JSON.stringify(value)) as T[]

export function createInitialWorkspace(): Workspace {
  return {
    schemaVersion: 3,
    leads: [],
    projects: [],
    transactions: [],
    tasks: [],
    plan: clone(initialPlan),
    services: clone(initialServices),
    publications: clone(initialPublications),
    briefing: clone(initialBriefing),
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown): value is string => typeof value === 'string'
const nullableString = (value: unknown): value is string | null => value === null || str(value)
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isArray = (value: unknown, validate: (row: Record<string, unknown>) => boolean): boolean =>
  Array.isArray(value) && value.length <= 3000 && value.every((row: unknown) => object(row) && validate(row))

const validLeadBase = (x: Record<string, unknown>) =>
  ['id', 'name', 'contact', 'service', 'notes', 'createdAt'].every(k => str(x[k])) &&
  ['novo', 'conversa', 'proposta', 'ganho', 'perdido'].includes(String(x.stage)) && num(x.value)
const validProjectBase = (x: Record<string, unknown>) =>
  ['id', 'name', 'client', 'deadline', 'createdAt'].every(k => str(x[k])) &&
  ['planejado', 'andamento', 'revisao', 'entregue'].includes(String(x.status)) && num(x.value)
const validTransactionBase = (x: Record<string, unknown>) =>
  ['id', 'description', 'date', 'createdAt'].every(k => str(x[k])) &&
  ['entrada', 'saida'].includes(String(x.kind)) && num(x.amount)
const validTaskBase = (x: Record<string, unknown>) => ['id', 'title', 'createdAt'].every(k => str(x[k])) && typeof x.done === 'boolean'
const validPlan = (x: Record<string, unknown>) =>
  ['id', 'week', 'title', 'goal', 'priority', 'nextStep', 'notes'].every(k => str(x[k])) &&
  ['nao-iniciado', 'andamento', 'concluido'].includes(String(x.status)) && num(x.hours)
const validService = (x: Record<string, unknown>) =>
  ['id', 'name', 'scope', 'exclusions', 'availability'].every(k => str(x[k])) &&
  ['hours', 'hourlyRate', 'extras', 'contingency'].every(k => num(x[k])) && Number(x.contingency) <= 3
const validPublication = (x: Record<string, unknown>) =>
  ['id', 'week', 'channel', 'topic', 'copy', 'audience', 'result', 'url'].every(k => str(x[k])) &&
  ['planejado', 'produzindo', 'publicado'].includes(String(x.status))
const validBriefing = (x: Record<string, unknown>) => ['id', 'phase', 'question', 'reason', 'required', 'answer', 'nextAction', 'notes'].every(k => str(x[k]))

const validLeadV3 = (x: Record<string, unknown>) => validLeadBase(x) && nullableString(x.serviceId) && nullableString(x.convertedProjectId)
const validProjectV3 = (x: Record<string, unknown>) => validProjectBase(x) && nullableString(x.serviceId) && nullableString(x.sourceLeadId)
const validTransactionV3 = (x: Record<string, unknown>) => validTransactionBase(x) && nullableString(x.projectId)
const validTaskV3 = (x: Record<string, unknown>) => validTaskBase(x) && nullableString(x.projectId)

function validCollectionIds(rows: Array<{ id: string }>): boolean {
  return new Set(rows.map(row => row.id)).size === rows.length
}

function isValidWorkspaceV3(x: unknown): x is Workspace {
  if (!object(x) || x.schemaVersion !== 3 ||
      !isArray(x.leads, validLeadV3) || !isArray(x.projects, validProjectV3) ||
      !isArray(x.transactions, validTransactionV3) || !isArray(x.tasks, validTaskV3) ||
      !isArray(x.plan, validPlan) || !isArray(x.services, validService) ||
      !isArray(x.publications, validPublication) || !isArray(x.briefing, validBriefing)) return false

  const workspace = x as unknown as Workspace
  if (![workspace.leads, workspace.projects, workspace.transactions, workspace.tasks, workspace.plan, workspace.services, workspace.publications, workspace.briefing].every(validCollectionIds)) return false
  const leadIds = new Set(workspace.leads.map(lead => lead.id))
  const projectIds = new Set(workspace.projects.map(project => project.id))
  const serviceIds = new Set(workspace.services.map(service => service.id))
  return workspace.leads.every(lead =>
    (!lead.serviceId || serviceIds.has(lead.serviceId)) &&
    (!lead.convertedProjectId || projectIds.has(lead.convertedProjectId)) &&
    (!lead.convertedProjectId || workspace.projects.some(project => project.id === lead.convertedProjectId && project.sourceLeadId === lead.id))) &&
    workspace.projects.every(project =>
      (!project.serviceId || serviceIds.has(project.serviceId)) &&
      (!project.sourceLeadId || leadIds.has(project.sourceLeadId)) &&
      (!project.sourceLeadId || workspace.leads.some(lead => lead.id === project.sourceLeadId && lead.convertedProjectId === project.id))) &&
    workspace.transactions.every(transaction => !transaction.projectId || projectIds.has(transaction.projectId)) &&
    workspace.tasks.every(task => !task.projectId || projectIds.has(task.projectId))
}

function serviceIdForLabel(label: string, services: Service[]): string | null {
  const normalized = label.trim().toLocaleLowerCase('pt-BR')
  const matches = services.filter(service => service.name.trim().toLocaleLowerCase('pt-BR') === normalized)
  return matches.length === 1 ? matches[0].id : null
}

function migrateV1(input: Record<string, unknown>): Workspace | null {
  if (input.schemaVersion !== 1 || !isArray(input.leads, validLeadBase) || !isArray(input.projects, validProjectBase) ||
      !isArray(input.transactions, validTransactionBase) || !isArray(input.tasks, validTaskBase)) return null
  const result = createInitialWorkspace()
  const leads = input.leads as Record<string, unknown>[]
  const projects = input.projects as Record<string, unknown>[]
  const transactions = input.transactions as Record<string, unknown>[]
  const tasks = input.tasks as Record<string, unknown>[]
  result.leads = leads.map(row => {
    const lead = row as unknown as Lead
    return { id: lead.id, name: lead.name, contact: lead.contact, service: lead.service, serviceId: null, convertedProjectId: null, stage: lead.stage, value: lead.value, notes: lead.notes, createdAt: lead.createdAt }
  })
  result.projects = projects.map(row => {
    const project = row as unknown as Project
    return { id: project.id, name: project.name, client: project.client, serviceId: null, sourceLeadId: null, status: project.status, deadline: project.deadline, value: project.value, createdAt: project.createdAt }
  })
  result.transactions = transactions.map(row => {
    const transaction = row as unknown as Transaction
    return { id: transaction.id, description: transaction.description, kind: transaction.kind, amount: transaction.amount, date: transaction.date, projectId: null, createdAt: transaction.createdAt }
  })
  result.tasks = tasks.map(row => {
    const task = row as unknown as Task
    return { id: task.id, title: task.title, done: task.done, projectId: null, createdAt: task.createdAt }
  })
  if (![result.leads, result.projects, result.transactions, result.tasks].every(validCollectionIds)) return null
  return result
}

function migrateV2(input: Record<string, unknown>): Workspace | null {
  if (input.schemaVersion !== 2 || !isArray(input.leads, validLeadBase) || !isArray(input.projects, validProjectBase) ||
      !isArray(input.transactions, validTransactionBase) || !isArray(input.tasks, validTaskBase) ||
      !isArray(input.plan, validPlan) || !isArray(input.services, validService) ||
      !isArray(input.publications, validPublication) || !isArray(input.briefing, validBriefing)) return null

  const services = input.services as unknown as Service[]
  const result: Workspace = {
    schemaVersion: 3,
    leads: (input.leads as unknown as Lead[]).map(({ id, name, contact, service, stage, value, notes, createdAt }) => ({ id, name, contact, service, serviceId: serviceIdForLabel(service, services), convertedProjectId: null, stage, value, notes, createdAt })),
    projects: (input.projects as unknown as Project[]).map(({ id, name, client, status, deadline, value, createdAt }) => ({ id, name, client, serviceId: null, sourceLeadId: null, status, deadline, value, createdAt })),
    transactions: (input.transactions as unknown as Transaction[]).map(({ id, description, kind, amount, date, createdAt }) => ({ id, description, kind, amount, date, projectId: null, createdAt })),
    tasks: (input.tasks as unknown as Task[]).map(({ id, title, done, createdAt }) => ({ id, title, done, projectId: null, createdAt })),
    plan: (input.plan as Workspace['plan']).map(({ id, week, title, goal, priority, status, hours, nextStep, notes }) => ({ id, week, title, goal, priority, status, hours, nextStep, notes })),
    services: clone(services),
    publications: (input.publications as Publication[]).map(({ id, week, channel, topic, copy, audience, status, result, url }) => ({ id, week, channel, topic, copy, audience, status, result, url })),
    briefing: (input.briefing as BriefingQuestion[]).map(({ id, phase, question, reason, required, answer, nextAction, notes }) => ({ id, phase, question, reason, required, answer, nextAction, notes })),
  }
  if (![result.leads, result.projects, result.transactions, result.tasks, result.plan, result.services, result.publications, result.briefing].every(validCollectionIds)) return null
  return result
}

/** Accepts current data and valid v1/v2 backups, returning a clean v3 workspace. */
export function migrateWorkspace(input: unknown): Workspace {
  if (!object(input)) throw new Error('Backup inválido ou versão incompatível.')
  if (isValidWorkspaceV3(input)) {
    return {
      schemaVersion: 3,
      leads: input.leads.map(({ id, name, contact, service, serviceId, convertedProjectId, stage, value, notes, createdAt }) => ({ id, name, contact, service, serviceId, convertedProjectId, stage, value, notes, createdAt })),
      projects: input.projects.map(({ id, name, client, serviceId, sourceLeadId, status, deadline, value, createdAt }) => ({ id, name, client, serviceId, sourceLeadId, status, deadline, value, createdAt })),
      transactions: input.transactions.map(({ id, description, kind, amount, date, projectId, createdAt }) => ({ id, description, kind, amount, date, projectId, createdAt })),
      tasks: input.tasks.map(({ id, title, done, projectId, createdAt }) => ({ id, title, done, projectId, createdAt })),
      plan: input.plan.map(({ id, week, title, goal, priority, status, hours, nextStep, notes }) => ({ id, week, title, goal, priority, status, hours, nextStep, notes })),
      services: input.services.map(({ id, name, hours, hourlyRate, extras, contingency, scope, exclusions, availability }) => ({ id, name, hours, hourlyRate, extras, contingency, scope, exclusions, availability })),
      publications: input.publications.map(({ id, week, channel, topic, copy, audience, status, result, url }) => ({ id, week, channel, topic, copy, audience, status, result, url })),
      briefing: input.briefing.map(({ id, phase, question, reason, required, answer, nextAction, notes }) => ({ id, phase, question, reason, required, answer, nextAction, notes })),
    }
  }
  const migrated = input.schemaVersion === 1 ? migrateV1(input) : input.schemaVersion === 2 ? migrateV2(input) : null
  if (!migrated) throw new Error('Backup inválido ou versão incompatível.')
  return migrated
}

export function readWorkspace(storage?: StoragePort): WorkspaceLoadResult {
  if (!storage) return { workspace: createInitialWorkspace(), migratedFrom: null, warning: '' }
  let foundStoredData = false
  let warning = ''
  const candidates = [WORKSPACE_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
  for (const key of candidates) {
    let serialized: string | null
    try { serialized = storage.getItem(key) } catch {
      warning = 'Não foi possível ler os dados locais deste navegador.'
      continue
    }
    if (!serialized) continue
    foundStoredData = true
    try {
      const raw: unknown = JSON.parse(serialized)
      const workspace = migrateWorkspace(raw)
      const version = object(raw) && (raw.schemaVersion === 1 || raw.schemaVersion === 2) ? raw.schemaVersion : null
      if (version !== null) {
        try { writeWorkspace(workspace, storage) } catch { warning = 'Os dados foram carregados, mas não foi possível gravar a migração v3.' }
      }
      return { workspace, migratedFrom: version, warning }
    } catch {
      warning = 'Um backup local estava inválido; os demais dados disponíveis foram verificados.'
    }
  }
  return {
    workspace: createInitialWorkspace(),
    migratedFrom: null,
    warning: foundStoredData ? warning || 'Não foi possível validar os dados locais.' : '',
  }
}

export function writeWorkspace(workspace: Workspace, storage: StoragePort): void {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
}

export interface ProjectConversionInput {
  name: string
  client: string
  status: Project['status']
  deadline: string
  value: number
}

export function convertOpportunityToProject(
  workspace: Workspace,
  leadId: string,
  input: ProjectConversionInput,
  id: string,
  createdAt = new Date().toISOString(),
): Project {
  const lead = workspace.leads.find(item => item.id === leadId)
  if (!lead) throw new Error('A oportunidade não foi encontrada.')
  if (lead.convertedProjectId || workspace.projects.some(project => project.sourceLeadId === lead.id)) {
    throw new Error('Esta oportunidade já foi convertida em projeto.')
  }
  const name = input.name.trim()
  const client = input.client.trim()
  if (!name || !client || !Number.isFinite(input.value) || input.value < 0) throw new Error('Revise nome, cliente e valor combinado do projeto.')
  const project: Project = {
    id,
    name,
    client,
    serviceId: lead.serviceId,
    sourceLeadId: lead.id,
    status: input.status,
    deadline: input.deadline,
    value: input.value,
    createdAt,
  }
  workspace.projects.unshift(project)
  lead.convertedProjectId = project.id
  lead.stage = 'ganho'
  return project
}
