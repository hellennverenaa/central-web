import { reactive, computed, watch } from 'vue'
import type { Lead, Project, Transaction, Workspace, PlanItem, Service, Publication, BriefingQuestion } from './types'
import { todayLocal } from './format'
import { initialPlan, initialServices, initialPublications, initialBriefing } from './catalog'

const STORAGE_KEY = 'central-web:workspace:v2'
const LEGACY_STORAGE_KEY = 'central-web:workspace:v1'
const cloneTemplates = <T>(data: readonly T[]): T[] => JSON.parse(JSON.stringify(data)) as T[]
const initial = (): Workspace => ({
  schemaVersion: 2, leads: [], projects: [], transactions: [], tasks: [],
  plan: cloneTemplates<PlanItem>(initialPlan.map(x => ({ ...x }))),
  services: cloneTemplates<Service>(initialServices.map(x => ({ ...x }))),
  publications: cloneTemplates<Publication>(initialPublications.map(x => ({ ...x }))),
  briefing: cloneTemplates<BriefingQuestion>(initialBriefing.map(x => ({ ...x }))),
})
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const str = (x: unknown): x is string => typeof x === 'string'
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0
const isArray = (x: unknown, validate: (row: Record<string, unknown>) => boolean): boolean =>
  Array.isArray(x) && x.length <= 3000 && x.every((row: unknown) => object(row) && validate(row))
const validLead = (x: Record<string, unknown>) => ['id','name','contact','service','notes','createdAt'].every(k => str(x[k])) && ['novo','conversa','proposta','ganho','perdido'].includes(String(x.stage)) && num(x.value)
const validProject = (x: Record<string, unknown>) => ['id','name','client','deadline','createdAt'].every(k => str(x[k])) && ['planejado','andamento','revisao','entregue'].includes(String(x.status)) && num(x.value)
const validTransaction = (x: Record<string, unknown>) => ['id','description','date','createdAt'].every(k => str(x[k])) && ['entrada','saida'].includes(String(x.kind)) && num(x.amount)
const validTask = (x: Record<string, unknown>) => ['id','title','createdAt'].every(k => str(x[k])) && typeof x.done === 'boolean'
const validPlan = (x: Record<string, unknown>) => ['id','week','title','goal','priority','nextStep','notes'].every(k=>str(x[k])) && ['nao-iniciado','andamento','concluido'].includes(String(x.status)) && num(x.hours)
const validService = (x: Record<string, unknown>) => ['id','name','scope','exclusions','availability'].every(k=>str(x[k])) && ['hours','hourlyRate','extras','contingency'].every(k=>num(x[k])) && Number(x.contingency) <= 3
const validPublication = (x: Record<string, unknown>) => ['id','week','channel','topic','copy','audience','result','url'].every(k=>str(x[k])) && ['planejado','produzindo','publicado'].includes(String(x.status))
const validBriefing = (x: Record<string, unknown>) => ['id','phase','question','reason','required','answer','nextAction','notes'].every(k=>str(x[k]))
function validLegacy(x: unknown): x is Record<string, unknown> {
  return object(x) && x.schemaVersion === 1 && isArray(x.leads, validLead) && isArray(x.projects, validProject) && isArray(x.transactions, validTransaction) && isArray(x.tasks, validTask)
}
function isWorkspace(x: unknown): x is Workspace {
  return object(x) && x.schemaVersion === 2 && isArray(x.leads,validLead) && isArray(x.projects,validProject) && isArray(x.transactions,validTransaction) && isArray(x.tasks,validTask) && isArray(x.plan,validPlan) && isArray(x.services,validService) && isArray(x.publications,validPublication) && isArray(x.briefing,validBriefing)
}
// Dados importados são projetados somente para os campos conhecidos, sem propriedades extras.
function normalize(input: unknown): Workspace {
  if (validLegacy(input)) {
    const safe = initial()
    for (const key of ['leads','projects','transactions','tasks'] as const) {
      // Known v1 structures are checked above and have no changes in v2.
      ;(safe as unknown as Record<string, unknown>)[key] = JSON.parse(JSON.stringify(input[key]))
    }
    return safe
  }
  if (!isWorkspace(input)) throw new Error('Backup inválido ou versão incompatível.')
  return {
    schemaVersion: 2,
    leads: input.leads.map(({id,name,contact,service,stage,value,notes,createdAt})=>({id,name,contact,service,stage,value,notes,createdAt})),
    projects: input.projects.map(({id,name,client,status,deadline,value,createdAt})=>({id,name,client,status,deadline,value,createdAt})),
    transactions: input.transactions.map(({id,description,kind,amount,date,createdAt})=>({id,description,kind,amount,date,createdAt})),
    tasks: input.tasks.map(({id,title,done,createdAt})=>({id,title,done,createdAt})),
    plan: input.plan.map(({id,week,title,goal,priority,status,hours,nextStep,notes})=>({id,week,title,goal,priority,status,hours,nextStep,notes})),
    services: input.services.map(({id,name,hours,hourlyRate,extras,contingency,scope,exclusions,availability})=>({id,name,hours,hourlyRate,extras,contingency,scope,exclusions,availability})),
    publications: input.publications.map(({id,week,channel,topic,copy,audience,status,result,url})=>({id,week,channel,topic,copy,audience,status,result,url})),
    briefing: input.briefing.map(({id,phase,question,reason,required,answer,nextAction,notes})=>({id,phase,question,reason,required,answer,nextAction,notes})),
  }
}
function load(): Workspace {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const serialized = localStorage.getItem(key)
      if (serialized) return normalize(JSON.parse(serialized) as unknown)
    } catch { /* corrupted storage: fall back to templates */ }
  }
  return initial()
}
export const state = reactive<Workspace>(load())
watch(state, () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage unavailable */ } }, { deep: true })
export const metrics = computed(() => {
  const incomes = state.transactions.filter(t => t.kind === 'entrada').reduce((a, b) => a + b.amount, 0)
  const expenses = state.transactions.filter(t => t.kind === 'saida').reduce((a, b) => a + b.amount, 0)
  return {
    leads: state.leads.filter(l => l.stage !== 'perdido' && l.stage !== 'ganho').length,
    activeProjects: state.projects.filter(p => p.status !== 'entregue').length,
    income: incomes,
    expenses,
    balance: incomes - expenses,
    pipeline: state.leads.filter(l => !['ganho','perdido'].includes(l.stage)).reduce((a, b) => a + b.value, 0),
    planDone: state.plan.filter(t=>t.status === 'concluido').length,
    planTotal: state.plan.length,
    scheduledPosts: state.publications.filter(p=>p.status !== 'publicado').length,
    serviceCount: state.services.length,
  }
})
export function uid(): string { return crypto.randomUUID() }
export function addLead(input: Omit<Lead, 'id' | 'createdAt'>) { state.leads.unshift({ ...input, id: uid(), createdAt: new Date().toISOString() }) }
export function addProject(input: Omit<Project, 'id' | 'createdAt'>) { state.projects.unshift({ ...input, id: uid(), createdAt: new Date().toISOString() }) }
export function addTransaction(input: Omit<Transaction, 'id' | 'createdAt'>) { state.transactions.unshift({ ...input, id: uid(), createdAt: new Date().toISOString() }) }
export function addTask(title: string) { state.tasks.unshift({ id: uid(), title, done: false, createdAt: new Date().toISOString() }) }
export function addPlan(input: Omit<PlanItem, 'id'>) { state.plan.push({ ...input, id: uid() }) }
export function addService(input: Omit<Service, 'id'>) { state.services.push({ ...input, id: uid() }) }
export function addPublication(input: Omit<Publication, 'id'>) { state.publications.push({ ...input, id: uid() }) }
export function addBriefingQuestion(input: Omit<BriefingQuestion, 'id'>) { state.briefing.push({ ...input, id: uid() }) }
export function removeItem(key: 'leads' | 'projects' | 'transactions' | 'tasks' | 'plan' | 'services' | 'publications' | 'briefing', id: string) {
  const collection = state[key]
  const index = collection.findIndex(item => item.id === id)
  if (index > -1) collection.splice(index, 1)
}
export function clearAll() { Object.assign(state, initial()) }
export function importWorkspace(data: unknown) { Object.assign(state, normalize(data)) }
export function exportWorkspace() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `central-backup-${todayLocal()}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function loadDemo() {
  const d = todayLocal()
  Object.assign(state, {
    ...initial(),
    leads: [
      { id: uid(), name: 'Barbearia Exemplo', contact: '', service: 'Landing page', stage: 'conversa', value: 850, notes: 'Dados fictícios.', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Cliente de casamento (demo)', contact: '', service: 'Site de casamento', stage: 'proposta', value: 600, notes: 'Dados fictícios.', createdAt: new Date().toISOString() },
    ],
    projects: [{ id: uid(), name: 'Convite digital demonstração', client: 'Portfólio', status: 'andamento', deadline: d, value: 0, createdAt: new Date().toISOString() }],
    transactions: [{ id: uid(), description: 'Recebimento fictício', kind: 'entrada', amount: 350, date: d, createdAt: new Date().toISOString() }],
    tasks: [{ id: uid(), title: 'Preparar divulgação do convite', done: false, createdAt: new Date().toISOString() }],
  })
}
