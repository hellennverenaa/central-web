export type LeadStage = 'novo' | 'conversa' | 'proposta' | 'ganho' | 'perdido'
export type ProjectStatus = 'planejado' | 'andamento' | 'revisao' | 'entregue'
export type TransactionType = 'entrada' | 'saida'
export type PlanStatus = 'nao-iniciado' | 'andamento' | 'concluido'
export type PublicationStatus = 'planejado' | 'produzindo' | 'publicado'

export interface Lead {
  id: string
  name: string
  contact: string
  service: string
  serviceId: string | null
  convertedProjectId: string | null
  stage: LeadStage
  value: number
  notes: string
  createdAt: string
}

export type ProposalStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada'
export interface ProposalRevision {
  id: string
  number: number
  createdAt: string
  serviceName: string
  scope: string
  exclusions: string
  price: number
  deliveryTerms: string
  revisionRounds: number
  paymentTerms: string
  notes: string
  status: ProposalStatus
  sentAt: string | null
}
export interface LeadProposal {
  id: string
  leadId: string
  revisions: ProposalRevision[]
}

export interface Project {
  id: string
  name: string
  client: string
  serviceId: string | null
  sourceLeadId: string | null
  briefingId: string | null
  status: ProjectStatus
  deadline: string
  value: number
  createdAt: string
}

export interface Transaction {
  id: string
  description: string
  kind: TransactionType
  amount: number
  date: string
  projectId: string | null
  createdAt: string
}

export type ProjectMaterialCategory = 'questionario' | 'referencia' | 'design' | 'arquivo' | 'documento' | 'entrega' | 'outro'
export interface ProjectMaterial {
  id: string
  projectId: string
  name: string
  category: ProjectMaterialCategory
  url: string
  notes: string
  createdAt: string
}

/** Uma cobrança combinada NÃO é receita realizada. Recebimentos são Transaction separadas. */
export interface ProjectInstallment {
  id: string
  projectId: string
  title: string
  amount: number
  dueDate: string
  receivedTransactionIds: string[]
  createdAt: string
}

/** Datas explícitas de acompanhamento de revisão e entrega, sem dados inventados. */
export interface ProjectDelivery {
  projectId: string
  reviewSentAt: string
  approvedAt: string
  deliveredAt: string
  notes: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  projectId: string | null
  createdAt: string
}

export interface PlanItem { id: string; week: string; title: string; goal: string; priority: string; status: PlanStatus; hours: number; nextStep: string; notes: string }
export interface Service { id: string; name: string; hours: number; hourlyRate: number; extras: number; contingency: number; scope: string; exclusions: string; availability: string; taskTemplates: string[]; briefingTemplateId: string | null }
export interface Publication { id: string; week: string; channel: string; topic: string; copy: string; audience: string; status: PublicationStatus; result: string; url: string }
export interface BriefingQuestion { id: string; phase: string; question: string; reason: string; required: string; answer: string; nextAction: string; notes: string }

export type BriefingQuestionType = 'short-text' | 'long-text' | 'email' | 'url' | 'date' | 'number' | 'single-choice' | 'multiple-choice' | 'yes-no'
export type BriefingAnswer = string | string[]
export interface BriefingCondition { questionId: string; operator: 'equals' | 'includes' | 'answered'; value?: string }
export interface BriefingQuestionDefinition {
  id: string
  label: string
  type: BriefingQuestionType
  example: string
  required: boolean
  options: string[]
  condition: BriefingCondition | null
}
export interface BriefingSection { id: string; title: string; description: string; questions: BriefingQuestionDefinition[] }
export interface BriefingTemplate { id: string; name: string; description: string; sections: BriefingSection[] }
export interface ProjectBriefing {
  id: string
  projectId: string
  templateId: string | null
  templateName: string
  sections: BriefingSection[]
  answers: Record<string, BriefingAnswer>
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  schemaVersion: 7
  leads: Lead[]
  projects: Project[]
  transactions: Transaction[]
  tasks: Task[]
  plan: PlanItem[]
  services: Service[]
  publications: Publication[]
  briefingTemplates: BriefingTemplate[]
  projectBriefings: ProjectBriefing[]
  projectMaterials: ProjectMaterial[]
  projectInstallments: ProjectInstallment[]
  projectDeliveries: ProjectDelivery[]
  leadProposals: LeadProposal[]
  legacyBriefing: BriefingQuestion[]
}
