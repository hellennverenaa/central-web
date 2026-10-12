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

export interface Project {
  id: string
  name: string
  client: string
  serviceId: string | null
  sourceLeadId: string | null
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

export interface Task {
  id: string
  title: string
  done: boolean
  projectId: string | null
  createdAt: string
}

export interface PlanItem { id: string; week: string; title: string; goal: string; priority: string; status: PlanStatus; hours: number; nextStep: string; notes: string }
export interface Service { id: string; name: string; hours: number; hourlyRate: number; extras: number; contingency: number; scope: string; exclusions: string; availability: string }
export interface Publication { id: string; week: string; channel: string; topic: string; copy: string; audience: string; status: PublicationStatus; result: string; url: string }
export interface BriefingQuestion { id: string; phase: string; question: string; reason: string; required: string; answer: string; nextAction: string; notes: string }

export interface Workspace {
  schemaVersion: 3
  leads: Lead[]
  projects: Project[]
  transactions: Transaction[]
  tasks: Task[]
  plan: PlanItem[]
  services: Service[]
  publications: Publication[]
  briefing: BriefingQuestion[]
}
