import { unansweredRequiredQuestionIds } from './briefing.ts'
import { installmentBalance } from './projectMilestones.ts'
import type { Workspace } from './types.ts'

export type TodayPriority = 'urgente' | 'proximo' | 'acompanhar'
export type TodayProjectTab = 'resumo' | 'briefing' | 'tarefas' | 'financeiro' | 'entrega'
export type TodayAction =
  | { id: string; target: 'project'; entityId: string; tab: TodayProjectTab; priority: TodayPriority; kind: 'prazo' | 'briefing' | 'producao' | 'financeiro' | 'cobranca' | 'entrega'; title: string; subject: string; description: string; cta: string; sortOrder: number }
  | { id: string; target: 'lead'; entityId: string; priority: TodayPriority; kind: 'comercial'; title: string; subject: string; description: string; cta: string; sortOrder: number }
  | { id: string; target: 'task'; entityId: string; priority: TodayPriority; kind: 'avulsa'; title: string; subject: string; description: string; cta: string; sortOrder: number }

const DAY_MS = 86_400_000
function daysUntil(date: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null
  const deadline = Date.parse(date + 'T00:00:00Z')
  const current = Date.parse(today + 'T00:00:00Z')
  if (!Number.isFinite(deadline) || !Number.isFinite(current)) return null
  return Math.round((deadline - current) / DAY_MS)
}

/**
 * A lista Hoje é derivada do workspace. Não grava status, prazo, cobrança ou tarefa extra.
 * Apenas uma ação principal por projeto; concluídos/entregues não reaparecem por tarefas antigas.
 */
export function buildTodayActions(
  workspace: Pick<Workspace, 'projects' | 'projectBriefings' | 'tasks' | 'leads' | 'transactions' | 'projectInstallments' | 'projectDeliveries'>,
  today: string,
): TodayAction[] {
  const actions: TodayAction[] = []

  for (const project of workspace.projects) {
    const received = workspace.transactions
      .filter(item => item.projectId === project.id && item.kind === 'entrada')
      .reduce((sum, item) => sum + item.amount, 0)
    const outstanding = Math.max(0, project.value - received)

    // Só um vencimento explicitamente registrado pode gerar este alerta.
    // Sem vínculo financeiro, sugerimos conferir, não afirmar inadimplência.
    const installment = workspace.projectInstallments
      .filter(item => item.projectId === project.id && installmentBalance(item, workspace.transactions) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .find(item => { const days = daysUntil(item.dueDate, today); return days !== null && days <= 7 })
    if (installment) {
      const days = daysUntil(installment.dueDate, today)!
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'financeiro',
        kind: 'cobranca', priority: days <= 0 ? 'urgente' : 'proximo',
        sortOrder: days < 0 ? days : days === 0 ? 1 : 12 + days,
        title: days < 0 ? 'Conferir cobrança prevista com prazo ultrapassado' : days === 0
          ? 'Conferir cobrança prevista para hoje' : 'Cobrança prevista se aproxima',
        subject: project.name,
        description: `${installment.title}: vencimento combinado em ${installment.dueDate.slice(8, 10)}/${installment.dueDate.slice(5, 7)}/${installment.dueDate.slice(0, 4)}. ` +
          'Confira se houve recebimento e vincule-o à parcela. Não significa necessariamente que o cliente esteja inadimplente.',
        cta: 'Conferir financeiro',
      })
      continue
    }
    if (project.status === 'entregue') {
      if (outstanding > 0) actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'financeiro',
        kind: 'financeiro', priority: 'acompanhar', sortOrder: 80,
        title: 'Revisar valores do projeto entregue', subject: project.name,
        description: 'Há valor contratado ainda não registrado como recebido. Confira o financeiro; não há vencimento de cobrança definido.',
        cta: 'Ver financeiro',
      })
      continue
    }

    const days = daysUntil(project.deadline, today)
    if (days !== null && days <= 7) {
      const overdue = days < 0
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'resumo',
        kind: 'prazo', priority: overdue || days === 0 ? 'urgente' : 'proximo',
        sortOrder: overdue ? days : days === 0 ? 0 : 10 + days,
        title: overdue ? 'Prazo do projeto ultrapassado' : days === 0 ? 'Prazo do projeto é hoje' : 'Prazo do projeto se aproxima',
        subject: project.name,
        description: overdue ? `Prazo cadastrado passou há ${-days} dia(s). Revise o andamento.` :
          days === 0 ? 'O prazo cadastrado é hoje. Confira o andamento e a entrega.' :
            `Faltam ${days} dia(s) para o prazo cadastrado.`,
        cta: 'Abrir resumo',
      })
      continue
    }

    const briefing = workspace.projectBriefings.find(item => item.id === project.briefingId)
    const missing = briefing ? unansweredRequiredQuestionIds(briefing) : []
    if (missing.length) {
      const firstQuestion = briefing!.sections.flatMap(section => section.questions).find(item => item.id === missing[0])
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'briefing',
        kind: 'briefing', priority: 'proximo', sortOrder: 30,
        title: 'Completar briefing', subject: project.name,
        description: `Faltam ${missing.length} resposta(s) obrigatória(s).` + (firstQuestion ? ` Comece por: ${firstQuestion.label}` : ''),
        cta: 'Abrir briefing',
      })
      continue
    }

    const pending = workspace.tasks.filter(task => task.projectId === project.id && !task.done)
    if (pending.length) {
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'tarefas',
        kind: 'producao', priority: 'proximo', sortOrder: 40,
        title: 'Avançar na produção', subject: project.name,
        description: `Próxima tarefa: ${pending[0]!.title}. Mais ${pending.length - 1} pendente(s) neste projeto.`,
        cta: 'Ver tarefas',
      })
      continue
    }

    const delivery = workspace.projectDeliveries.find(item => item.projectId === project.id)
    if (project.status === 'revisao' || (delivery?.approvedAt && !delivery.deliveredAt)) {
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'entrega',
        kind: 'entrega', priority: 'proximo', sortOrder: 50,
        title: delivery?.approvedAt ? 'Preparar entrega final' : 'Acompanhar aprovação da revisão',
        subject: project.name, description: delivery?.approvedAt
          ? 'A aprovação foi registrada. Revise os links e registre a data da entrega quando ela acontecer.'
          : 'O projeto está em revisão. Confira se a aprovação do cliente já foi recebida.',
        cta: 'Abrir entrega',
      })
      continue
    }

    if (outstanding > 0) {
      actions.push({
        id: `project:${project.id}`, entityId: project.id, target: 'project', tab: 'financeiro',
        kind: 'financeiro', priority: 'acompanhar', sortOrder: 80,
        title: 'Revisar valor ainda a receber', subject: project.name,
        description: 'Confira o que já foi recebido e o que ainda falta registrar. Nenhuma data de cobrança foi definida.',
        cta: 'Ver financeiro',
      })
    }
  }

  for (const lead of workspace.leads) {
    if (lead.convertedProjectId || lead.stage === 'perdido') continue
    const title = lead.stage === 'ganho' ? 'Regularizar oportunidade marcada como ganha' :
      lead.stage === 'proposta' ? 'Acompanhar proposta apresentada' :
        lead.stage === 'novo' ? 'Iniciar conversa com novo contato' : 'Continuar conversa com cliente'
    actions.push({
      id: `lead:${lead.id}`, target: 'lead', entityId: lead.id, kind: 'comercial',
      priority: lead.stage === 'ganho' ? 'urgente' : 'acompanhar',
      sortOrder: lead.stage === 'ganho' ? 2 : lead.stage === 'proposta' ? 65 : lead.stage === 'conversa' ? 70 : 75,
      title, subject: lead.name, description: `Serviço: ${lead.service || 'A definir'}. Etapa do atendimento: ${lead.stage}.`,
      cta: 'Retomar atendimento',
    })
  }

  for (const task of workspace.tasks) {
    if (task.done || task.projectId !== null) continue
    actions.push({
      id: `task:${task.id}`, target: 'task', entityId: task.id, kind: 'avulsa',
      priority: 'acompanhar', sortOrder: 85, title: 'Tarefa independente pendente',
      subject: task.title, description: 'Tarefa pessoal ainda não concluída, sem prazo cadastrado.',
      cta: 'Abrir tarefas',
    })
  }

  return actions.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}
