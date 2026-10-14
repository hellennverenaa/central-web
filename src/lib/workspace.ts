import type {
  BriefingQuestion, BriefingQuestionDefinition, BriefingSection, BriefingTemplate,
  Lead, LeadProposal, ProposalRevision, Project, ProjectBriefing, ProjectMaterial, ProjectInstallment, ProjectDelivery, Publication, Service, Task, Transaction, Workspace,
} from './types.ts'
import {
  initialBriefing, initialBriefingTemplates, initialPlan, initialPublications, initialServices,
  serviceBriefingTemplates, serviceTaskTemplates,
} from './catalog.ts'
import { safeProjectMaterialUrl, validateProjectMaterial } from './projectMaterials.ts'
import { validateInstallment, validateDelivery } from './projectMilestones.ts'
import { validateProposalDraft, validateProposalForSending } from './proposals.ts'

export const WORKSPACE_STORAGE_KEY = 'central-web:workspace:v7'
export const LEGACY_STORAGE_KEYS = ['central-web:workspace:v6', 'central-web:workspace:v5', 'central-web:workspace:v4', 'central-web:workspace:v3', 'central-web:workspace:v2', 'central-web:workspace:v1'] as const

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface WorkspaceLoadResult {
  workspace: Workspace
  migratedFrom: number | null
  warning: string
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const genericTasks = ['Confirmar escopo e materiais com o cliente', 'Preparar primeira versão', 'Revisar ajustes e combinar a entrega']
const DEFAULT_BRIEFING_TEMPLATE_ID = 'brief-template-general'

function enrichService(service: Omit<Service, 'taskTemplates' | 'briefingTemplateId'> & Partial<Pick<Service, 'taskTemplates' | 'briefingTemplateId'>>): Service {
  return {
    ...service,
    taskTemplates: service.taskTemplates?.length ? [...service.taskTemplates] : [...(serviceTaskTemplates[service.id] ?? genericTasks)],
    briefingTemplateId: service.briefingTemplateId ?? serviceBriefingTemplates[service.id] ?? null,
  }
}

export function createInitialWorkspace(): Workspace {
  return {
    schemaVersion: 7,
    leads: [],
    projects: [],
    transactions: [],
    tasks: [],
    plan: clone([...initialPlan]),
    services: clone(initialServices).map(service => enrichService(service)),
    publications: clone([...initialPublications]),
    briefingTemplates: clone(initialBriefingTemplates),
    projectBriefings: [],
    projectMaterials: [],
    projectInstallments: [],
    projectDeliveries: [],
    leadProposals: [],
    legacyBriefing: clone([...initialBriefing]),
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown): value is string => typeof value === 'string'
const nullableString = (value: unknown): value is string | null => value === null || str(value)
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 500 && value.every(str)
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
const validServiceBase = (x: Record<string, unknown>) =>
  ['id', 'name', 'scope', 'exclusions', 'availability'].every(k => str(x[k])) &&
  ['hours', 'hourlyRate', 'extras', 'contingency'].every(k => num(x[k])) && Number(x.contingency) <= 3
const validService = (x: Record<string, unknown>) => validServiceBase(x) && isStringArray(x.taskTemplates) && x.taskTemplates.some(title => title.trim()) && nullableString(x.briefingTemplateId)
const validPublication = (x: Record<string, unknown>) =>
  ['id', 'week', 'channel', 'topic', 'copy', 'audience', 'result', 'url'].every(k => str(x[k])) &&
  ['planejado', 'produzindo', 'publicado'].includes(String(x.status))
const validLegacyBriefing = (x: Record<string, unknown>) => ['id', 'phase', 'question', 'reason', 'required', 'answer', 'nextAction', 'notes'].every(k => str(x[k]))
const validQuestionTypes = ['short-text', 'long-text', 'email', 'url', 'date', 'number', 'single-choice', 'multiple-choice', 'yes-no']

const validCondition = (value: unknown): boolean => value === null || (object(value) &&
  str(value.questionId) && ['equals', 'includes', 'answered'].includes(String(value.operator)) &&
  (value.value === undefined || str(value.value)))
const validQuestion = (x: Record<string, unknown>): boolean =>
  ['id', 'label', 'example'].every(k => str(x[k])) && validQuestionTypes.includes(String(x.type)) &&
  Boolean(String(x.id).trim()) && Boolean(String(x.label).trim()) && typeof x.required === 'boolean' && isStringArray(x.options) &&
  (!['single-choice', 'multiple-choice'].includes(String(x.type)) || x.options.length > 0) && validCondition(x.condition)
const validSection = (x: Record<string, unknown>): boolean =>
  ['id', 'title', 'description'].every(k => str(x[k])) && Boolean(String(x.id).trim()) && Boolean(String(x.title).trim()) &&
  Array.isArray(x.questions) && x.questions.length > 0 && isArray(x.questions, validQuestion)
const validTemplate = (x: Record<string, unknown>): boolean =>
  ['id', 'name', 'description'].every(k => str(x[k])) && Boolean(String(x.id).trim()) && Boolean(String(x.name).trim()) &&
  Array.isArray(x.sections) && x.sections.length > 0 && isArray(x.sections, validSection)
const validAnswerMap = (value: unknown): boolean => object(value) && Object.values(value).every(answer =>
  str(answer) || (Array.isArray(answer) && answer.every(str)))
const validProjectBriefing = (x: Record<string, unknown>): boolean =>
  ['id', 'projectId', 'templateName', 'createdAt', 'updatedAt'].every(k => str(x[k])) && nullableString(x.templateId) &&
  isArray(x.sections, validSection) && validAnswerMap(x.answers)

function questionsIn(sections: BriefingSection[]): BriefingQuestionDefinition[] {
  return sections.flatMap(section => section.questions)
}

function validQuestionGraph(sections: BriefingSection[]): boolean {
  if (!sections.length || !validCollectionIds(sections)) return false
  const questions = questionsIn(sections)
  if (!validCollectionIds(questions)) return false
  const byId = new Map(questions.map(question => [question.id, question]))
  if (!questions.every(question => !question.condition ||
    (question.condition.questionId !== question.id && byId.has(question.condition.questionId) &&
      (question.condition.operator === 'answered' || Boolean(question.condition.value?.trim()))))) return false
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    const parent = byId.get(id)?.condition?.questionId
    if (parent && hasCycle(parent)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return questions.every(question => !hasCycle(question.id))
}

function validAnswersForSections(sections: BriefingSection[], answers: Record<string, string | string[]>): boolean {
  const questions = new Map(questionsIn(sections).map(question => [question.id, question]))
  return Object.entries(answers).every(([id, answer]) => {
    const question = questions.get(id)
    if (!question) return false
    if (question.type === 'multiple-choice') return Array.isArray(answer) && answer.every(value => question.options.includes(value))
    return typeof answer === 'string' && (!['single-choice', 'yes-no'].includes(question.type) || !answer || question.options.includes(answer) || (question.type === 'yes-no' && ['Sim', 'Não'].includes(answer)))
  })
}

function validCollectionIds(rows: Array<{ id: string }>): boolean {
  return new Set(rows.map(row => row.id)).size === rows.length
}

function isValidWorkspaceCore(x: unknown): x is Omit<Workspace, 'schemaVersion' | 'projectMaterials' | 'projectInstallments' | 'projectDeliveries' | 'leadProposals'> & { schemaVersion: 4 | 5 | 6 | 7 } {
  if (!object(x) || ![4, 5, 6, 7].includes(Number(x.schemaVersion)) ||
      !isArray(x.leads, row => validLeadBase(row) && nullableString(row.serviceId) && nullableString(row.convertedProjectId)) ||
      !isArray(x.projects, row => validProjectBase(row) && nullableString(row.serviceId) && nullableString(row.sourceLeadId) && str(row.briefingId)) ||
      !isArray(x.transactions, row => validTransactionBase(row) && nullableString(row.projectId)) ||
      !isArray(x.tasks, row => validTaskBase(row) && nullableString(row.projectId)) ||
      !isArray(x.plan, validPlan) || !isArray(x.services, validService) ||
      !isArray(x.publications, validPublication) || !isArray(x.briefingTemplates, validTemplate) ||
      !isArray(x.projectBriefings, validProjectBriefing) || !isArray(x.legacyBriefing, validLegacyBriefing)) return false

  const workspace = x as unknown as Workspace
  const collections = [workspace.leads, workspace.projects, workspace.transactions, workspace.tasks, workspace.plan,
    workspace.services, workspace.publications, workspace.briefingTemplates, workspace.projectBriefings, workspace.legacyBriefing]
  if (!collections.every(validCollectionIds)) return false
  if (![...workspace.briefingTemplates, ...workspace.projectBriefings].every(row => validQuestionGraph(row.sections))) return false
  const leadIds = new Set(workspace.leads.map(lead => lead.id))
  const projectIds = new Set(workspace.projects.map(project => project.id))
  const serviceIds = new Set(workspace.services.map(service => service.id))
  const templateIds = new Set(workspace.briefingTemplates.map(template => template.id))
  const briefingById = new Map(workspace.projectBriefings.map(briefing => [briefing.id, briefing]))
  const projectsWithBriefings = new Set(workspace.projectBriefings.map(briefing => briefing.projectId))
  if (projectsWithBriefings.size !== workspace.projectBriefings.length) return false
  return workspace.services.every(service => !service.briefingTemplateId || templateIds.has(service.briefingTemplateId)) &&
    workspace.leads.every(lead =>
      (!lead.serviceId || serviceIds.has(lead.serviceId)) &&
      (!lead.convertedProjectId || projectIds.has(lead.convertedProjectId)) &&
      (!lead.convertedProjectId || workspace.projects.some(project => project.id === lead.convertedProjectId && project.sourceLeadId === lead.id))) &&
    workspace.projects.every(project =>
      (!project.serviceId || serviceIds.has(project.serviceId)) &&
      (!project.sourceLeadId || leadIds.has(project.sourceLeadId)) &&
      (!project.sourceLeadId || workspace.leads.some(lead => lead.id === project.sourceLeadId && lead.convertedProjectId === project.id)) &&
      projectsWithBriefings.has(project.id) && briefingById.get(project.briefingId ?? '')?.projectId === project.id) &&
    workspace.projectBriefings.every(briefing => projectIds.has(briefing.projectId) && (!briefing.templateId || templateIds.has(briefing.templateId)) && validAnswersForSections(briefing.sections, briefing.answers)) &&
    workspace.transactions.every(transaction => !transaction.projectId || projectIds.has(transaction.projectId)) &&
    workspace.tasks.every(task => !task.projectId || projectIds.has(task.projectId))
}

type LegacyWorkspaceV5 = Omit<Workspace, 'schemaVersion' | 'projectInstallments' | 'projectDeliveries'> & { schemaVersion: 5 }
function isValidWorkspaceV5(x: unknown): x is LegacyWorkspaceV5 {
  if (!isValidWorkspaceCore(x) || x.schemaVersion !== 5) return false
  const materials = (x as unknown as Record<string, unknown>).projectMaterials
  if (!isArray(materials, row => {
    if (!['id', 'projectId', 'name', 'url', 'notes', 'createdAt'].every(key => str(row[key]))) return false
    return Boolean(String(row.id).trim()) && Boolean(String(row.projectId).trim()) &&
      !validateProjectMaterial(row as unknown as ProjectMaterial) &&
      Boolean(safeProjectMaterialUrl(String(row.url)))
  })) return false
  const items = materials as ProjectMaterial[]
  const projectIds = new Set(x.projects.map(project => project.id))
  return validCollectionIds(items) && items.every(item => projectIds.has(item.projectId))
}

type LegacyWorkspaceV6 = Omit<Workspace, 'schemaVersion' | 'leadProposals'> & { schemaVersion: 6 }
function isValidWorkspaceV6(x: unknown): x is LegacyWorkspaceV6 {
  if (!isValidWorkspaceCore(x) || x.schemaVersion !== 6 ||
      !isValidWorkspaceV5({ ...x, schemaVersion: 5 })) return false
  if (!object(x)) return false
  const payload = x as unknown as Record<string, unknown>
  if (!isArray(payload.projectInstallments, row =>
      ['id', 'projectId', 'title', 'dueDate', 'createdAt'].every(key => str(row[key])) &&
      !validateInstallment(row as unknown as ProjectInstallment)) ||
      !isArray(payload.projectDeliveries, row =>
        ['projectId', 'reviewSentAt', 'approvedAt', 'deliveredAt', 'notes'].every(key => str(row[key])) &&
        !validateDelivery(row as unknown as ProjectDelivery))) return false
  const installments = payload.projectInstallments as ProjectInstallment[]
  const deliveries = payload.projectDeliveries as ProjectDelivery[]
  const projects = new Set(x.projects.map(project => project.id))
  const transactions = new Map(x.transactions.map(tx => [tx.id, tx]))
  const usedTransactions = new Set<string>()
  if (!validCollectionIds(installments) ||
      new Set(deliveries.map(delivery => delivery.projectId)).size !== deliveries.length ||
      deliveries.some(delivery => !projects.has(delivery.projectId))) return false
  for (const installment of installments) {
    if (!projects.has(installment.projectId)) return false
    for (const id of installment.receivedTransactionIds) {
      const tx = transactions.get(id)
      if (!tx || tx.kind !== 'entrada' || tx.projectId !== installment.projectId || usedTransactions.has(id)) return false
      usedTransactions.add(id)
    }
  }
  return true
}

function isValidWorkspaceV7(x: unknown): x is Workspace {
  if (!isValidWorkspaceCore(x) || x.schemaVersion !== 7 ||
      !isValidWorkspaceV6({ ...x, schemaVersion: 6 })) return false
  if (!object(x)) return false
  const proposals = (x as unknown as Record<string, unknown>).leadProposals
  if (!isArray(proposals, row => {
    if (typeof row.id !== 'string' || !row.id.trim() || typeof row.leadId !== 'string' || !row.leadId.trim() ||
        !Array.isArray(row.revisions) || row.revisions.length < 1 || row.revisions.length > 50) return false
    return row.revisions.every((revision: unknown, index: number) => {
      if (!object(revision) || !str(revision.id) || !String(revision.id).trim() ||
          !str(revision.createdAt) || revision.number !== index + 1 ||
          !['rascunho','enviada','aceita','recusada'].includes(String(revision.status)) ||
          !(revision.sentAt === null || str(revision.sentAt)) ||
          (revision.status === 'rascunho' ? revision.sentAt !== null : !revision.sentAt)) return false
      for (const key of ['serviceName', 'scope', 'exclusions', 'deliveryTerms', 'paymentTerms', 'notes']) {
        if (!str(revision[key])) return false
      }
      const r = revision as unknown as ProposalRevision
      return !validateProposalDraft(r) && (r.status === 'rascunho' || !validateProposalForSending(r))
    })
  })) return false
  const items = proposals as LeadProposal[]
  const leads = new Set(x.leads.map(item => item.id))
  return validCollectionIds(items) && new Set(items.map(item => item.leadId)).size === items.length &&
    items.every(item => leads.has(item.leadId) && validCollectionIds(item.revisions))
}

function serviceIdForLabel(label: string, services: Service[]): string | null {
  const normalized = label.trim().toLocaleLowerCase('pt-BR')
  const matches = services.filter(service => service.name.trim().toLocaleLowerCase('pt-BR') === normalized)
  return matches.length === 1 ? matches[0].id : null
}

function templateForService(services: Service[], serviceId: string | null): BriefingTemplate {
  const templateId = services.find(service => service.id === serviceId)?.briefingTemplateId
  return initialBriefingTemplates.find(template => template.id === templateId) ??
    initialBriefingTemplates.find(template => template.id === DEFAULT_BRIEFING_TEMPLATE_ID) ?? initialBriefingTemplates[0]
}

export function createProjectBriefing(
  projectId: string,
  template: BriefingTemplate,
  id: string,
  createdAt = new Date().toISOString(),
): ProjectBriefing {
  return {
    id, projectId, templateId: template.id, templateName: template.name,
    sections: clone(template.sections), answers: {}, createdAt, updatedAt: createdAt,
  }
}

function attachEmptyProjectBriefings(workspace: Workspace): void {
  for (const project of workspace.projects) {
    const existing = workspace.projectBriefings.find(briefing => briefing.projectId === project.id)
    if (existing) {
      project.briefingId = existing.id
      continue
    }
    const template = templateForService(workspace.services, project.serviceId)
    const id = `project-briefing-${project.id}`
    const briefing = createProjectBriefing(project.id, template, id, project.createdAt)
    project.briefingId = id
    workspace.projectBriefings.push(briefing)
  }
}

function migrateV1(input: Record<string, unknown>): Workspace | null {
  if (input.schemaVersion !== 1 || !isArray(input.leads, validLeadBase) || !isArray(input.projects, validProjectBase) ||
      !isArray(input.transactions, validTransactionBase) || !isArray(input.tasks, validTaskBase)) return null
  const result = createInitialWorkspace()
  result.leads = (input.leads as Record<string, unknown>[]).map(row => {
    const lead = row as unknown as Lead
    return { id: lead.id, name: lead.name, contact: lead.contact, service: lead.service, serviceId: null, convertedProjectId: null, stage: lead.stage, value: lead.value, notes: lead.notes, createdAt: lead.createdAt }
  })
  result.projects = (input.projects as Record<string, unknown>[]).map(row => {
    const project = row as unknown as Project
    return { id: project.id, name: project.name, client: project.client, serviceId: null, sourceLeadId: null, briefingId: '', status: project.status, deadline: project.deadline, value: project.value, createdAt: project.createdAt }
  })
  result.transactions = (input.transactions as Record<string, unknown>[]).map(row => {
    const transaction = row as unknown as Transaction
    return { id: transaction.id, description: transaction.description, kind: transaction.kind, amount: transaction.amount, date: transaction.date, projectId: null, createdAt: transaction.createdAt }
  })
  result.tasks = (input.tasks as Record<string, unknown>[]).map(row => {
    const task = row as unknown as Task
    return { id: task.id, title: task.title, done: task.done, projectId: null, createdAt: task.createdAt }
  })
  if (![result.leads, result.projects, result.transactions, result.tasks].every(validCollectionIds)) return null
  attachEmptyProjectBriefings(result)
  return result
}

function migrateV2(input: Record<string, unknown>): Workspace | null {
  if (input.schemaVersion !== 2 || !isArray(input.leads, validLeadBase) || !isArray(input.projects, validProjectBase) ||
      !isArray(input.transactions, validTransactionBase) || !isArray(input.tasks, validTaskBase) ||
      !isArray(input.plan, validPlan) || !isArray(input.services, validServiceBase) ||
      !isArray(input.publications, validPublication) || !isArray(input.briefing, validLegacyBriefing)) return null

  const services = (input.services as unknown as Array<Omit<Service, 'taskTemplates' | 'briefingTemplateId'>>).map(enrichService)
  const result = createInitialWorkspace()
  result.leads = (input.leads as unknown as Lead[]).map(({ id, name, contact, service, stage, value, notes, createdAt }) => ({ id, name, contact, service, serviceId: serviceIdForLabel(service, services), convertedProjectId: null, stage, value, notes, createdAt }))
  result.projects = (input.projects as unknown as Project[]).map(({ id, name, client, status, deadline, value, createdAt }) => ({ id, name, client, serviceId: null, sourceLeadId: null, briefingId: '', status, deadline, value, createdAt }))
  result.transactions = (input.transactions as unknown as Transaction[]).map(({ id, description, kind, amount, date, createdAt }) => ({ id, description, kind, amount, date, projectId: null, createdAt }))
  result.tasks = (input.tasks as unknown as Task[]).map(({ id, title, done, createdAt }) => ({ id, title, done, projectId: null, createdAt }))
  result.plan = clone(input.plan as Workspace['plan'])
  result.services = services
  result.publications = clone(input.publications as Publication[])
  result.legacyBriefing = clone(input.briefing as BriefingQuestion[])
  const ids = [result.leads, result.projects, result.transactions, result.tasks, result.plan, result.services, result.publications, result.legacyBriefing]
  if (!ids.every(validCollectionIds)) return null
  attachEmptyProjectBriefings(result)
  return result
}

function migrateV3(input: Record<string, unknown>): Workspace | null {
  const validV3Service = (row: Record<string, unknown>) => validServiceBase(row)
  const validV3Project = (row: Record<string, unknown>) => validProjectBase(row) && nullableString(row.serviceId) && nullableString(row.sourceLeadId)
  if (input.schemaVersion !== 3 ||
      !isArray(input.leads, row => validLeadBase(row) && nullableString(row.serviceId) && nullableString(row.convertedProjectId)) ||
      !isArray(input.projects, validV3Project) ||
      !isArray(input.transactions, row => validTransactionBase(row) && nullableString(row.projectId)) ||
      !isArray(input.tasks, row => validTaskBase(row) && nullableString(row.projectId)) ||
      !isArray(input.plan, validPlan) || !isArray(input.services, validV3Service) ||
      !isArray(input.publications, validPublication) || !isArray(input.briefing, validLegacyBriefing)) return null
  const result = createInitialWorkspace()
  const services = (input.services as unknown as Array<Omit<Service, 'taskTemplates' | 'briefingTemplateId'>>).map(enrichService)
  result.leads = clone(input.leads as Lead[])
  result.projects = (input.projects as Array<Record<string, unknown>>).map(row => ({
    id: String(row.id), name: String(row.name), client: String(row.client), serviceId: row.serviceId as string | null,
    sourceLeadId: row.sourceLeadId as string | null, briefingId: '', status: row.status as Project['status'],
    deadline: String(row.deadline), value: Number(row.value), createdAt: String(row.createdAt),
  }))
  result.transactions = clone(input.transactions as Transaction[])
  result.tasks = clone(input.tasks as Task[])
  result.plan = clone(input.plan as Workspace['plan'])
  result.services = services
  result.publications = clone(input.publications as Publication[])
  result.legacyBriefing = clone(input.briefing as BriefingQuestion[])
  const ids = [result.leads, result.projects, result.transactions, result.tasks, result.plan, result.services, result.publications, result.legacyBriefing]
  if (!ids.every(validCollectionIds)) return null
  const leadIds = new Set(result.leads.map(lead => lead.id))
  const projectIds = new Set(result.projects.map(project => project.id))
  const serviceIds = new Set(result.services.map(service => service.id))
  if (!result.leads.every(lead => (!lead.serviceId || serviceIds.has(lead.serviceId)) && (!lead.convertedProjectId || projectIds.has(lead.convertedProjectId))) ||
      !result.projects.every(project => (!project.serviceId || serviceIds.has(project.serviceId)) && (!project.sourceLeadId || leadIds.has(project.sourceLeadId))) ||
      !result.transactions.every(tx => !tx.projectId || projectIds.has(tx.projectId)) ||
      !result.tasks.every(task => !task.projectId || projectIds.has(task.projectId))) return null
  attachEmptyProjectBriefings(result)
  return result
}

/** Aceita backups v1-v7 preservando contratos anteriores; proposta nova é um registro separado. */
export function migrateWorkspace(input: unknown): Workspace {
  if (!object(input)) throw new Error('Backup inválido ou versão incompatível.')
  if (isValidWorkspaceV7(input)) return clone(input)
  if (isValidWorkspaceV6(input)) {
    const updated: Workspace = { ...clone(input), schemaVersion: 7, leadProposals: [] }
    if (!isValidWorkspaceV7(updated)) throw new Error('Backup inválido ou versão incompatível.')
    return updated
  }
  if (isValidWorkspaceV5(input)) {
    const updated: Workspace = { ...clone(input), schemaVersion: 7,
      projectInstallments: [], projectDeliveries: [], leadProposals: [] }
    if (!isValidWorkspaceV7(updated)) throw new Error('Backup inválido ou versão incompatível.')
    return updated
  }
  if (isValidWorkspaceCore(input) && input.schemaVersion === 4) {
    const updated: Workspace = { ...clone(input), schemaVersion: 7,
      projectMaterials: [], projectInstallments: [], projectDeliveries: [], leadProposals: [] }
    if (!isValidWorkspaceV7(updated)) throw new Error('Backup inválido ou versão incompatível.')
    return updated
  }
  let migrated: Workspace | null = null
  if (input.schemaVersion === 1) migrated = migrateV1(input)
  else if (input.schemaVersion === 2) migrated = migrateV2(input)
  else if (input.schemaVersion === 3) migrated = migrateV3(input)
  if (!migrated || !isValidWorkspaceV7(migrated)) throw new Error('Backup inválido ou versão incompatível.')
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
      const version = object(raw) && [1, 2, 3, 4, 5, 6].includes(Number(raw.schemaVersion)) ? Number(raw.schemaVersion) : null
      if (version !== null) {
        try { writeWorkspace(workspace, storage) } catch { warning = 'Os dados foram carregados, mas não foi possível gravar a migração v7.' }
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
  /** Se informado, substitui apenas o modelo de briefing desta conversão. */
  briefingTemplateId?: string | null
}

export function convertOpportunityToProject(
  workspace: Workspace,
  leadId: string,
  input: ProjectConversionInput,
  id: string,
  createdAt = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID(),
): Project {
  const lead = workspace.leads.find(item => item.id === leadId)
  if (!lead) throw new Error('A oportunidade não foi encontrada.')
  if (lead.convertedProjectId || workspace.projects.some(project => project.sourceLeadId === lead.id)) {
    throw new Error('Esta oportunidade já foi convertida em projeto.')
  }
  const name = input.name.trim()
  const client = input.client.trim()
  if (!name || !client || !Number.isFinite(input.value) || input.value < 0) throw new Error('Revise nome, cliente e valor combinado do projeto.')
  const service = workspace.services.find(item => item.id === lead.serviceId) ??
    workspace.services.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === lead.service.trim().toLocaleLowerCase('pt-BR'))
  if (input.briefingTemplateId && !workspace.briefingTemplates.some(item => item.id === input.briefingTemplateId)) {
    throw new Error('O modelo de briefing selecionado não existe mais.')
  }
  const template = workspace.briefingTemplates.find(item => item.id === (input.briefingTemplateId || service?.briefingTemplateId)) ??
    workspace.briefingTemplates.find(item => item.id === DEFAULT_BRIEFING_TEMPLATE_ID) ?? workspace.briefingTemplates[0]
  if (!template) throw new Error('Cadastre um modelo de briefing antes de converter a oportunidade.')
  const briefingId = createId()
  const project: Project = {
    id, name, client, serviceId: service?.id ?? null, sourceLeadId: lead.id, briefingId,
    status: input.status, deadline: input.deadline, value: input.value, createdAt,
  }
  const briefing = createProjectBriefing(project.id, template, briefingId, createdAt)
  const tasks: Task[] = (service?.taskTemplates ?? genericTasks).filter(title => title.trim()).map(title => ({
    id: createId(), title: title.trim(), done: false, projectId: project.id, createdAt,
  }))
  workspace.projects.unshift(project)
  workspace.projectBriefings.unshift(briefing)
  workspace.tasks.unshift(...tasks)
  lead.serviceId = service?.id ?? lead.serviceId
  lead.convertedProjectId = project.id
  lead.stage = 'ganho'
  return project
}
