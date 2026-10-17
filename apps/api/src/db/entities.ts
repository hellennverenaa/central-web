import { EntitySchema } from 'typeorm'
import type { EntitySchemaColumnOptions } from 'typeorm'

/**
 * Representações ORM do schema da migration inicial.
 * Chaves estrangeiras compostas (owner_id + id) são definidas pela migration,
 * para impedir referências cruzadas entre titulares mesmo antes das rotas.
 * Números NUMERIC devem ser serializados como strings decimais no acesso via pg.
 */
type Columns = Record<string, EntitySchemaColumnOptions>
const pk: EntitySchemaColumnOptions = { type: 'text', primary: true }
const owner: EntitySchemaColumnOptions = { type: 'uuid', name: 'owner_id' }
const text = (name?: string, nullable = false): EntitySchemaColumnOptions =>
  ({ type: 'text', ...(name ? { name } : {}), nullable })
const number = (name: string, precision = 14, scale = 2): EntitySchemaColumnOptions =>
  ({ type: 'numeric', name, precision, scale })
const date = (name: string, nullable = false): EntitySchemaColumnOptions =>
  ({ type: 'date', name, nullable })
const timestamp = (name: string, nullable = false): EntitySchemaColumnOptions =>
  ({ type: 'timestamptz', name, nullable })
const json = (name: string): EntitySchemaColumnOptions => ({ type: 'jsonb', name })
const boolean = (name: string): EntitySchemaColumnOptions => ({ type: 'boolean', name })
const integer = (name: string): EntitySchemaColumnOptions => ({ type: 'integer', name })

function schema(name: string, tableName: string, columns: Columns): EntitySchema {
  return new EntitySchema({ name, tableName, columns })
}

export const UserEntity = schema('User', 'users', {
  id: { type: 'uuid', primary: true, generated: 'uuid' },
  email: text(), passwordHash: text('password_hash', true),
  createdAt: timestamp('created_at'),
})
export const ClientEntity = schema('Client', 'clients', {
  id: pk, ownerId: owner, name: text(), contact: text(), notes: text(),
  createdAt: timestamp('created_at'),
})
export const BriefingTemplateEntity = schema('BriefingTemplate', 'briefing_templates', {
  id: pk, ownerId: owner, name: text(), description: text(), sections: json('sections'),
})
export const ServiceEntity = schema('Service', 'services', {
  id: pk, ownerId: owner, name: text(), hours: number('hours',12),
  hourlyRate: number('hourly_rate',12), extras: number('extras',12),
  contingency: number('contingency',7,4), scope: text(), exclusions: text(),
  availability: text(), taskTemplates: json('task_templates'),
  briefingTemplateId: text('briefing_template_id',true),
})
export const LeadEntity = schema('Lead', 'leads', {
  id: pk, ownerId: owner, clientId: text('client_id',true), name: text(),
  contact: text(), service: text(), serviceId: text('service_id',true),
  convertedProjectId: text('converted_project_id',true),
  stage: { type: 'varchar', length: 16 },
  estimatedValue: number('estimated_value'), notes: text(),
  createdAt: timestamp('created_at'),
})
export const ProposalEntity = schema('Proposal', 'proposals', {
  id: pk, ownerId: owner, leadId: text('lead_id'),
  createdAt: timestamp('created_at'),
})
export const ProposalRevisionEntity = schema('ProposalRevision', 'proposal_revisions', {
  id: pk, ownerId: owner, proposalId: text('proposal_id'),
  revisionNumber: integer('revision_number'), createdAt: timestamp('created_at'),
  serviceName: text('service_name'), scope: text(), exclusions: text(),
  price: number('price'), deliveryTerms: text('delivery_terms'),
  revisionRounds: integer('revision_rounds'), paymentTerms: text('payment_terms'),
  notes: text(), status: { type: 'varchar', length: 16 },
  sentAt: timestamp('sent_at',true),
})
export const ProjectEntity = schema('Project', 'projects', {
  id: pk, ownerId: owner, clientId: text('client_id',true),
  name: text(), clientName: text('client_name'),
  serviceId: text('service_id',true), sourceLeadId: text('source_lead_id',true),
  status: { type: 'varchar', length: 16 }, deadline: date('deadline',true),
  contractedValue: number('contracted_value'), createdAt: timestamp('created_at'),
})
export const ProjectBriefingEntity = schema('ProjectBriefing', 'project_briefings', {
  id: pk, ownerId: owner, projectId: text('project_id'),
  templateId: text('template_id',true), templateName: text('template_name'),
  sections: json('sections'), answers: json('answers'),
  createdAt: timestamp('created_at'), updatedAt: timestamp('updated_at'),
})
export const TaskEntity = schema('Task', 'tasks', {
  id: pk, ownerId: owner, projectId: text('project_id',true),
  title: text(), done: boolean('done'), createdAt: timestamp('created_at'),
})
export const TransactionEntity = schema('Transaction', 'transactions', {
  id: pk, ownerId: owner, projectId: text('project_id',true),
  description: text(), kind: { type: 'varchar', length: 12 },
  amount: number('amount'), date: date('date'), createdAt: timestamp('created_at'),
})
export const ProjectInstallmentEntity = schema('ProjectInstallment', 'project_installments', {
  id: pk, ownerId: owner, projectId: text('project_id'), title: text(),
  amount: number('amount'), dueDate: date('due_date'),
  createdAt: timestamp('created_at'),
})
export const InstallmentReceiptEntity = schema('InstallmentReceipt', 'installment_receipts', {
  ownerId: { ...owner, primary: true }, projectId: text('project_id'),
  installmentId: { ...text('installment_id'), primary: true },
  transactionId: { ...text('transaction_id'), primary: true },
  receiptKind: { type: 'varchar', name: 'receipt_kind', length: 12 },
})
export const ProjectMaterialEntity = schema('ProjectMaterial', 'project_materials', {
  id: pk, ownerId: owner, projectId: text('project_id'),
  name: text(), category: { type: 'varchar', length: 24 },
  url: text(), notes: text(), createdAt: timestamp('created_at'),
})
export const ProjectDeliveryEntity = schema('ProjectDelivery', 'project_deliveries', {
  projectId: { ...text('project_id'), primary: true },
  ownerId: owner, reviewSentAt: date('review_sent_at',true),
  approvedAt: date('approved_at',true), deliveredAt: date('delivered_at',true),
  notes: text(),
})
export const PlanItemEntity = schema('PlanItem', 'plan_items', {
  id: pk, ownerId: owner, week: text(), title: text(), goal: text(),
  priority: text(), status: { type: 'varchar', length: 20 },
  hours: number('hours',12), nextStep: text('next_step'), notes: text(),
})
export const PublicationEntity = schema('Publication', 'publications', {
  id: pk, ownerId: owner, week: text(), channel: text(),
  topic: text(), copy: text(), audience: text(),
  status: { type: 'varchar', length: 16 }, result: text(), url: text(),
})

export const databaseEntities: EntitySchema[] = [
  UserEntity, ClientEntity, BriefingTemplateEntity, ServiceEntity,
  LeadEntity, ProposalEntity, ProposalRevisionEntity, ProjectEntity,
  ProjectBriefingEntity, TaskEntity, TransactionEntity,
  ProjectInstallmentEntity, InstallmentReceiptEntity, ProjectMaterialEntity,
  ProjectDeliveryEntity, PlanItemEntity, PublicationEntity,
]
