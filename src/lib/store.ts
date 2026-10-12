import { computed, reactive, ref, watch } from 'vue'
import type { BriefingQuestion, Lead, PlanItem, Project, Publication, Service, Task, Transaction, Workspace } from './types'
import { todayLocal } from './format'
import { convertOpportunityToProject, createInitialWorkspace, migrateWorkspace, readWorkspace, writeWorkspace, type ProjectConversionInput, type StoragePort } from './workspace.ts'

function getBrowserStorage(): { storage?: StoragePort; warning: string } {
  try {
    if (typeof localStorage === 'undefined') return { warning: typeof window === 'undefined' ? '' : 'O armazenamento local não está disponível neste navegador.' }
    return { storage: localStorage, warning: '' }
  } catch {
    return { warning: 'O navegador bloqueou o armazenamento local. Os dados não podem ser persistidos nesta sessão.' }
  }
}

const browserStorage = getBrowserStorage()
const storage = browserStorage.storage
const loaded = readWorkspace(storage)
export const state = reactive<Workspace>(loaded.workspace)
export const persistenceError = ref(loaded.warning || browserStorage.warning)

function persistNow(): void {
  if (!storage) return
  try {
    writeWorkspace(state, storage)
    persistenceError.value = ''
  } catch {
    persistenceError.value = 'Não foi possível salvar neste navegador. Exporte um backup e confira o espaço disponível.'
  }
}

watch(state, persistNow, { deep: true })

export const metrics = computed(() => {
  const incomes = state.transactions.filter(t => t.kind === 'entrada').reduce((a, b) => a + b.amount, 0)
  const expenses = state.transactions.filter(t => t.kind === 'saida').reduce((a, b) => a + b.amount, 0)
  return {
    leads: state.leads.filter(l => l.stage !== 'perdido' && l.stage !== 'ganho').length,
    activeProjects: state.projects.filter(p => p.status !== 'entregue').length,
    income: incomes,
    expenses,
    balance: incomes - expenses,
    pipeline: state.leads.filter(l => !['ganho', 'perdido'].includes(l.stage)).reduce((a, b) => a + b.value, 0),
    planDone: state.plan.filter(t => t.status === 'concluido').length,
    planTotal: state.plan.length,
    scheduledPosts: state.publications.filter(p => p.status !== 'publicado').length,
    serviceCount: state.services.length,
  }
})

export function uid(): string { return crypto.randomUUID() }
function saved<T>(value: T): T { persistNow(); return value }

export function addLead(input: Omit<Lead, 'id' | 'createdAt' | 'convertedProjectId'>): Lead {
  if (input.serviceId && !state.services.some(service => service.id === input.serviceId)) throw new Error('O serviço selecionado não existe mais.')
  const lead: Lead = { ...input, id: uid(), convertedProjectId: null, createdAt: new Date().toISOString() }
  state.leads.unshift(lead)
  return saved(lead)
}

export function updateLead(id: string, input: Omit<Lead, 'id' | 'createdAt' | 'convertedProjectId'>): Lead {
  const lead = state.leads.find(item => item.id === id)
  if (!lead) throw new Error('A oportunidade não foi encontrada.')
  if (input.serviceId && !state.services.some(service => service.id === input.serviceId)) throw new Error('O serviço selecionado não existe mais.')
  Object.assign(lead, input)
  return saved(lead)
}

export function addProject(input: Omit<Project, 'id' | 'createdAt' | 'sourceLeadId'>): Project {
  if (input.serviceId && !state.services.some(service => service.id === input.serviceId)) throw new Error('O serviço selecionado não existe mais.')
  const project: Project = { ...input, sourceLeadId: null, id: uid(), createdAt: new Date().toISOString() }
  state.projects.unshift(project)
  return saved(project)
}

export function updateProject(id: string, input: Omit<Project, 'id' | 'createdAt' | 'sourceLeadId'>): Project {
  const project = state.projects.find(item => item.id === id)
  if (!project) throw new Error('O projeto não foi encontrado.')
  if (input.serviceId && !state.services.some(service => service.id === input.serviceId)) throw new Error('O serviço selecionado não existe mais.')
  Object.assign(project, input)
  return saved(project)
}

export function convertLeadToProject(leadId: string, input: ProjectConversionInput): Project {
  const project = convertOpportunityToProject(state, leadId, input, uid())
  return saved(project)
}

export function addTransaction(input: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  if (input.projectId && !state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto selecionado não existe mais.')
  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || !input.date) throw new Error('Informe descrição, valor positivo e data para o lançamento.')
  const transaction: Transaction = { ...input, description: input.description.trim(), id: uid(), createdAt: new Date().toISOString() }
  state.transactions.unshift(transaction)
  return saved(transaction)
}

export function updateTransaction(id: string, input: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transaction = state.transactions.find(item => item.id === id)
  if (!transaction) throw new Error('O lançamento não foi encontrado.')
  if (input.projectId && !state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto selecionado não existe mais.')
  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || !input.date) throw new Error('Informe descrição, valor positivo e data para o lançamento.')
  Object.assign(transaction, { ...input, description: input.description.trim() })
  return saved(transaction)
}

export function addTask(title: string, projectId: string | null = null): Task {
  if (projectId && !state.projects.some(project => project.id === projectId)) throw new Error('O projeto selecionado não existe mais.')
  if (!title.trim()) throw new Error('Informe o título da tarefa.')
  const task: Task = { id: uid(), title: title.trim(), done: false, projectId, createdAt: new Date().toISOString() }
  state.tasks.unshift(task)
  return saved(task)
}

export function updateTask(id: string, input: Pick<Task, 'title' | 'done' | 'projectId'>): Task {
  const task = state.tasks.find(item => item.id === id)
  if (!task) throw new Error('A tarefa não foi encontrada.')
  if (input.projectId && !state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto selecionado não existe mais.')
  if (!input.title.trim()) throw new Error('Informe o título da tarefa.')
  Object.assign(task, { ...input, title: input.title.trim() })
  return saved(task)
}

export function addPlan(input: Omit<PlanItem, 'id'>) { state.plan.push({ ...input, id: uid() }); persistNow() }
export function addService(input: Omit<Service, 'id'>): Service { const service = { ...input, id: uid() }; state.services.push(service); return saved(service) }
export function updateService(id: string, input: Omit<Service, 'id'>): Service {
  const service = state.services.find(item => item.id === id)
  if (!service) throw new Error('O serviço não foi encontrado.')
  if (!input.name.trim()) throw new Error('Informe o nome do serviço.')
  Object.assign(service, input, { name: input.name.trim() })
  return saved(service)
}
export function addPublication(input: Omit<Publication, 'id'>) { state.publications.push({ ...input, id: uid() }); persistNow() }
export function addBriefingQuestion(input: Omit<BriefingQuestion, 'id'>) { state.briefing.push({ ...input, id: uid() }); persistNow() }

type CollectionKey = 'leads' | 'projects' | 'transactions' | 'tasks' | 'plan' | 'services' | 'publications' | 'briefing'
export function removeItem(key: CollectionKey, id: string): void {
  const collection = state[key] as Array<{ id: string }>
  const index = collection.findIndex(item => item.id === id)
  if (index < 0) return
  collection.splice(index, 1)
  if (key === 'projects') {
    state.leads.forEach(lead => { if (lead.convertedProjectId === id) lead.convertedProjectId = null })
    state.tasks.forEach(task => { if (task.projectId === id) task.projectId = null })
    state.transactions.forEach(transaction => { if (transaction.projectId === id) transaction.projectId = null })
  } else if (key === 'leads') {
    state.projects.forEach(project => { if (project.sourceLeadId === id) project.sourceLeadId = null })
  } else if (key === 'services') {
    state.leads.forEach(lead => { if (lead.serviceId === id) lead.serviceId = null })
    state.projects.forEach(project => { if (project.serviceId === id) project.serviceId = null })
  }
  persistNow()
}

export function clearAll(): void {
  Object.assign(state, createInitialWorkspace())
  persistNow()
}

export function importWorkspace(data: unknown): void {
  const migrated = migrateWorkspace(data)
  Object.assign(state, migrated)
  persistNow()
}

export function exportWorkspace(): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `central-backup-${todayLocal()}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function loadDemo(): void {
  const d = todayLocal()
  Object.assign(state, {
    ...createInitialWorkspace(),
    leads: [
      { id: uid(), name: 'Barbearia Exemplo', contact: '', service: 'Landing page', serviceId: null, convertedProjectId: null, stage: 'conversa', value: 850, notes: 'Dados fictícios.', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Cliente de casamento (demo)', contact: '', service: 'Site de casamento', serviceId: null, convertedProjectId: null, stage: 'proposta', value: 600, notes: 'Dados fictícios.', createdAt: new Date().toISOString() },
    ],
    projects: [{ id: uid(), name: 'Convite digital demonstração', client: 'Portfólio', serviceId: null, sourceLeadId: null, status: 'andamento', deadline: d, value: 0, createdAt: new Date().toISOString() }],
    transactions: [{ id: uid(), description: 'Recebimento fictício', kind: 'entrada', amount: 350, date: d, projectId: null, createdAt: new Date().toISOString() }],
    tasks: [{ id: uid(), title: 'Preparar divulgação do convite', done: false, projectId: null, createdAt: new Date().toISOString() }],
  } satisfies Workspace)
  persistNow()
}
