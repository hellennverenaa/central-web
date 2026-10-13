import { computed, reactive, ref, watch } from 'vue'
import type { BriefingAnswer, BriefingQuestion, BriefingTemplate, Lead, LeadProposal, ProposalRevision, ProposalStatus, PlanItem, Project, Publication, ProjectBriefing, ProjectMaterial, ProjectInstallment, ProjectDelivery, Service, Task, Transaction, Workspace } from './types'
import { todayLocal } from './format.ts'
import { validateBriefingTemplate } from './briefing.ts'
import { safeProjectMaterialUrl, validateProjectMaterial, type ProjectMaterialInput } from './projectMaterials.ts'
import { validateInstallment, validateDelivery, type InstallmentInput, type DeliveryInput } from './projectMilestones.ts'
import { latestRevision, validateProposalDraft, validateProposalForSending, type ProposalInput } from './proposals.ts'
import { convertOpportunityToProject, createInitialWorkspace, createProjectBriefing, migrateWorkspace, readWorkspace, writeWorkspace, type ProjectConversionInput, type StoragePort } from './workspace.ts'

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

/** Cria ou atualiza somente um rascunho. Versões marcadas como enviadas são imutáveis. */
export function saveLeadProposal(leadId: string, input: ProposalInput): LeadProposal {
  const lead = state.leads.find(item => item.id === leadId)
  if (!lead) throw new Error('A oportunidade não foi encontrada.')
  if (lead.convertedProjectId) throw new Error('A oportunidade já virou projeto; o histórico da proposta fica somente para consulta.')
  const error = validateProposalDraft(input)
  if (error) throw new Error(error)
  const previous = state.leadProposals.find(item => item.leadId === leadId)
  const latest = latestRevision(previous)
  if (latest && latest.status === 'aceita') throw new Error('Esta proposta foi aceita; converta a oportunidade em projeto.')
  const normalized: ProposalInput = {
    serviceName: input.serviceName.trim(), scope: input.scope.trim(), exclusions: input.exclusions.trim(),
    price: input.price, deliveryTerms: input.deliveryTerms.trim(), revisionRounds: input.revisionRounds,
    paymentTerms: input.paymentTerms.trim(), notes: input.notes.trim(),
  }
  if (latest?.status === 'rascunho') {
    Object.assign(latest, normalized)
    return saved(previous!)
  }
  const createdAt = new Date().toISOString()
  const revision: ProposalRevision = {
    ...normalized, id: uid(), number: (latest?.number ?? 0) + 1,
    createdAt, status: 'rascunho', sentAt: null,
  }
  if (previous) {
    if (previous.revisions.length >= 50) throw new Error('O histórico atingiu o limite de 50 versões.')
    previous.revisions.push(revision)
    return saved(previous)
  }
  const proposal: LeadProposal = { id: uid(), leadId, revisions: [revision] }
  state.leadProposals.push(proposal)
  return saved(proposal)
}

/** Marcar uma proposta como enviada NÃO envia mensagem ou cria projeto. */
export function markLeadProposal(leadId: string, status: Exclude<ProposalStatus, 'rascunho'>): LeadProposal {
  const lead = state.leads.find(item => item.id === leadId)
  const proposal = state.leadProposals.find(item => item.leadId === leadId)
  const latest = latestRevision(proposal)
  if (!lead || !proposal || !latest) throw new Error('A proposta não foi encontrada.')
  if (lead.convertedProjectId) throw new Error('A proposta de um projeto já convertido não pode ser alterada.')
  if (status === 'enviada') {
    if (latest.status !== 'rascunho') throw new Error('Somente um rascunho pode ser marcado como enviado.')
    const error = validateProposalForSending(latest)
    if (error) throw new Error(error)
    latest.status = 'enviada'
    latest.sentAt = new Date().toISOString()
    if (lead.stage === 'novo' || lead.stage === 'conversa') lead.stage = 'proposta'
  } else {
    if (latest.status !== 'enviada') throw new Error('Somente uma proposta enviada pode ser aceita ou recusada.')
    latest.status = status
    if (status === 'recusada' && lead.stage === 'proposta') lead.stage = 'conversa'
  }
  return saved(proposal)
}

export function addProject(input: Omit<Project, 'id' | 'createdAt' | 'sourceLeadId' | 'briefingId'>): Project {
  if (input.serviceId && !state.services.some(service => service.id === input.serviceId)) throw new Error('O serviço selecionado não existe mais.')
  const service = state.services.find(item => item.id === input.serviceId)
  const template = state.briefingTemplates.find(item => item.id === service?.briefingTemplateId) ?? state.briefingTemplates[0]
  if (!template) throw new Error('Cadastre um modelo de briefing antes de criar um projeto.')
  const id = uid()
  const createdAt = new Date().toISOString()
  const briefingId = uid()
  const project: Project = { ...input, sourceLeadId: null, briefingId, id, createdAt }
  state.projectBriefings.unshift(createProjectBriefing(id, template, briefingId, createdAt))
  state.tasks.unshift(...(service?.taskTemplates ?? []).filter(title => title.trim()).map(title => ({
    id: uid(), title: title.trim(), done: false, projectId: id, createdAt,
  })))
  state.projects.unshift(project)
  return saved(project)
}

export function updateProject(id: string, input: Omit<Project, 'id' | 'createdAt' | 'sourceLeadId' | 'briefingId'>): Project {
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
  if (transaction.kind === 'entrada' && (transaction.projectId !== input.projectId || input.kind !== 'entrada')) {
    state.projectInstallments.forEach(item => { item.receivedTransactionIds = item.receivedTransactionIds.filter(txId => txId !== id) })
  }
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
export function addService(input: Omit<Service, 'id'>): Service {
  if (!input.name.trim()) throw new Error('Informe o nome do serviço.')
  if (!input.taskTemplates.some(title => title.trim())) throw new Error('Inclua ao menos uma tarefa no modelo do serviço.')
  if (input.briefingTemplateId && !state.briefingTemplates.some(template => template.id === input.briefingTemplateId)) throw new Error('O modelo de briefing selecionado não existe mais.')
  const service = { ...input, name: input.name.trim(), taskTemplates: input.taskTemplates.map(title => title.trim()).filter(Boolean), id: uid() }
  state.services.push(service)
  return saved(service)
}
export function updateService(id: string, input: Omit<Service, 'id'>): Service {
  const service = state.services.find(item => item.id === id)
  if (!service) throw new Error('O serviço não foi encontrado.')
  if (!input.name.trim()) throw new Error('Informe o nome do serviço.')
  if (input.briefingTemplateId && !state.briefingTemplates.some(template => template.id === input.briefingTemplateId)) throw new Error('O modelo de briefing selecionado não existe mais.')
  if (!input.taskTemplates.some(title => title.trim())) throw new Error('Inclua ao menos uma tarefa no modelo do serviço.')
  Object.assign(service, input, { name: input.name.trim(), taskTemplates: input.taskTemplates.map(title => title.trim()).filter(Boolean) })
  return saved(service)
}
export function addBriefingTemplate(input: Omit<BriefingTemplate, 'id'>): BriefingTemplate {
  const validationError = validateBriefingTemplate(input)
  if (validationError) throw new Error(validationError)
  const template = { ...JSON.parse(JSON.stringify(input)) as Omit<BriefingTemplate, 'id'>, id: uid() }
  state.briefingTemplates.push(template)
  return saved(template)
}
export function updateBriefingTemplate(id: string, input: Omit<BriefingTemplate, 'id'>): BriefingTemplate {
  const template = state.briefingTemplates.find(item => item.id === id)
  if (!template) throw new Error('O modelo de briefing não foi encontrado.')
  const validationError = validateBriefingTemplate(input)
  if (validationError) throw new Error(validationError)
  Object.assign(template, JSON.parse(JSON.stringify(input)) as Omit<BriefingTemplate, 'id'>, { name: input.name.trim() })
  return saved(template)
}
export function updateProjectBriefing(id: string, answers: Record<string, BriefingAnswer>): ProjectBriefing {
  const briefing = state.projectBriefings.find(item => item.id === id)
  if (!briefing) throw new Error('As respostas deste projeto não foram encontradas.')
  const knownQuestions = new Map(briefing.sections.flatMap(section => section.questions.map(question => [question.id, question] as const)))
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = knownQuestions.get(questionId)
    if (!question) throw new Error('As respostas incluem uma pergunta que não pertence a este briefing.')
    if (question.type === 'multiple-choice') {
      if (!Array.isArray(answer) || answer.some(option => !question.options.includes(option))) throw new Error(`Revise as opções marcadas em “${question.label}”.`)
    } else {
      if (Array.isArray(answer)) throw new Error(`A resposta de “${question.label}” deve ser um único valor.`)
      if (question.type === 'single-choice' && answer && !question.options.includes(answer)) throw new Error(`Selecione uma opção válida em “${question.label}”.`)
      if (question.type === 'yes-no' && answer && !['Sim', 'Não'].includes(answer)) throw new Error(`Selecione Sim ou Não em “${question.label}”.`)
    }
  }
  briefing.answers = JSON.parse(JSON.stringify(answers)) as Record<string, BriefingAnswer>
  briefing.updatedAt = new Date().toISOString()
  return saved(briefing)
}
export function addProjectMaterial(input: ProjectMaterialInput): ProjectMaterial {
  if (!state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto não foi encontrado.')
  const message = validateProjectMaterial(input)
  if (message) throw new Error(message)
  const material: ProjectMaterial = {
    ...input, name: input.name.trim(), url: safeProjectMaterialUrl(input.url)!, notes: input.notes.trim(),
    id: uid(), createdAt: new Date().toISOString(),
  }
  state.projectMaterials.unshift(material)
  return saved(material)
}

export function updateProjectMaterial(id: string, input: ProjectMaterialInput): ProjectMaterial {
  const material = state.projectMaterials.find(item => item.id === id)
  if (!material || material.projectId !== input.projectId) throw new Error('O material deste projeto não foi encontrado.')
  const message = validateProjectMaterial(input)
  if (message) throw new Error(message)
  Object.assign(material, {
    name: input.name.trim(), category: input.category, url: safeProjectMaterialUrl(input.url)!, notes: input.notes.trim(),
  })
  return saved(material)
}

export function removeProjectMaterial(id: string, projectId: string): void {
  const index = state.projectMaterials.findIndex(item => item.id === id && item.projectId === projectId)
  if (index < 0) throw new Error('O material deste projeto não foi encontrado.')
  state.projectMaterials.splice(index, 1)
  persistNow()
}

function checkInstallment(input: InstallmentInput, currentId?: string): void {
  if (!state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto não foi encontrado.')
  const error = validateInstallment(input)
  if (error) throw new Error(error)
  for (const txId of input.receivedTransactionIds) {
    const tx = state.transactions.find(item => item.id === txId)
    if (!tx || tx.kind !== 'entrada' || tx.projectId !== input.projectId) throw new Error('Recebimento inválido ou pertencente a outro projeto.')
    if (state.projectInstallments.some(item => item.id !== currentId && item.receivedTransactionIds.includes(txId))) {
      throw new Error('Este recebimento já está vinculado a outra parcela.')
    }
  }
}
export function addProjectInstallment(input: InstallmentInput): ProjectInstallment {
  checkInstallment(input)
  const item: ProjectInstallment = { ...input, title: input.title.trim(),
    receivedTransactionIds: [...input.receivedTransactionIds], id: uid(), createdAt: new Date().toISOString() }
  state.projectInstallments.push(item)
  return saved(item)
}
export function updateProjectInstallment(id: string, input: InstallmentInput): ProjectInstallment {
  const item = state.projectInstallments.find(row => row.id === id && row.projectId === input.projectId)
  if (!item) throw new Error('A parcela não foi encontrada neste projeto.')
  checkInstallment(input, id)
  Object.assign(item, { title: input.title.trim(), amount: input.amount, dueDate: input.dueDate,
    receivedTransactionIds: [...input.receivedTransactionIds] })
  return saved(item)
}
export function removeProjectInstallment(id: string, projectId: string): void {
  const index = state.projectInstallments.findIndex(item => item.id === id && item.projectId === projectId)
  if (index < 0) throw new Error('A parcela não foi encontrada neste projeto.')
  state.projectInstallments.splice(index, 1)
  persistNow()
}
export function saveProjectDelivery(input: DeliveryInput): ProjectDelivery {
  if (!state.projects.some(project => project.id === input.projectId)) throw new Error('O projeto não foi encontrado.')
  const error = validateDelivery(input)
  if (error) throw new Error(error)
  const previous = state.projectDeliveries.find(item => item.projectId === input.projectId)
  if (previous) Object.assign(previous, input, { notes: input.notes.trim() })
  else state.projectDeliveries.push({ ...input, notes: input.notes.trim() })
  const project = state.projects.find(item => item.id === input.projectId)!
  // A entrega só é concluída depois da confirmação explícita das datas pela usuária.
  if (input.deliveredAt) project.status = 'entregue'
  else if (input.reviewSentAt && project.status === 'andamento') project.status = 'revisao'
  return saved(previous ?? state.projectDeliveries.find(item => item.projectId === input.projectId)!)
}

export function addPublication(input: Omit<Publication, 'id'>) { state.publications.push({ ...input, id: uid() }); persistNow() }
export function addBriefingQuestion(input: Omit<BriefingQuestion, 'id'>) { state.legacyBriefing.push({ ...input, id: uid() }); persistNow() }

type CollectionKey = 'leads' | 'projects' | 'transactions' | 'tasks' | 'plan' | 'services' | 'publications' | 'briefingTemplates' | 'legacyBriefing'
export function removeItem(key: CollectionKey, id: string): void {
  const collection = state[key] as Array<{ id: string }>
  const index = collection.findIndex(item => item.id === id)
  if (index < 0) return
  collection.splice(index, 1)
  if (key === 'projects') {
    state.leads.forEach(lead => { if (lead.convertedProjectId === id) lead.convertedProjectId = null })
    state.tasks.forEach(task => { if (task.projectId === id) task.projectId = null })
    state.transactions.forEach(transaction => { if (transaction.projectId === id) transaction.projectId = null })
    state.projectBriefings = state.projectBriefings.filter(briefing => briefing.projectId !== id)
    state.projectMaterials = state.projectMaterials.filter(material => material.projectId !== id)
    state.projectInstallments = state.projectInstallments.filter(item => item.projectId !== id)
    state.projectDeliveries = state.projectDeliveries.filter(item => item.projectId !== id)
  } else if (key === 'transactions') {
    state.projectInstallments.forEach(item => { item.receivedTransactionIds = item.receivedTransactionIds.filter(txId => txId !== id) })
  } else if (key === 'leads') {
    state.projects.forEach(project => { if (project.sourceLeadId === id) project.sourceLeadId = null })
    state.leadProposals = state.leadProposals.filter(item => item.leadId !== id)
  } else if (key === 'services') {
    state.leads.forEach(lead => { if (lead.serviceId === id) lead.serviceId = null })
    state.projects.forEach(project => { if (project.serviceId === id) project.serviceId = null })
  } else if (key === 'briefingTemplates') {
    state.services.forEach(service => { if (service.briefingTemplateId === id) service.briefingTemplateId = null })
    state.projectBriefings.forEach(briefing => { if (briefing.templateId === id) briefing.templateId = null })
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
  const demo = createInitialWorkspace()
  const service = demo.services.find(item => item.id === 'service-02')!
  const leadId = uid()
  const projectId = uid()
  const briefingId = uid()
  const createdAt = new Date().toISOString()
  demo.leads = [
    { id: leadId, name: 'Cliente de exemplo', contact: '', service: service.name, serviceId: service.id, convertedProjectId: projectId, stage: 'ganho', value: 600, notes: 'Dados fictícios.', createdAt },
    { id: uid(), name: 'Negócio de demonstração', contact: '', service: 'Página para negócio local', serviceId: 'service-04', convertedProjectId: null, stage: 'conversa', value: 850, notes: 'Dados fictícios.', createdAt },
  ]
  demo.projects = [{ id: projectId, name: 'Convite digital de demonstração', client: 'Cliente de exemplo', serviceId: service.id, sourceLeadId: leadId, briefingId, status: 'andamento', deadline: d, value: 600, createdAt }]
  const template = demo.briefingTemplates.find(item => item.id === service.briefingTemplateId)!
  demo.projectBriefings = [createProjectBriefing(projectId, template, briefingId, createdAt)]
  demo.transactions = [{ id: uid(), description: 'Recebimento fictício', kind: 'entrada', amount: 350, date: d, projectId, createdAt }]
  demo.tasks = service.taskTemplates.map(title => ({ id: uid(), title, done: false, projectId, createdAt }))
  Object.assign(state, demo)
  persistNow()
}
