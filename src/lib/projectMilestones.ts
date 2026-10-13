import type { ProjectDelivery, ProjectInstallment, Transaction } from './types.ts'

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export type InstallmentInput = Pick<ProjectInstallment, 'projectId' | 'title' | 'amount' | 'dueDate' | 'receivedTransactionIds'>

export function validateInstallment(input: InstallmentInput): string {
  if (!input.title.trim() || input.title.trim().length > 120) return 'Informe a descrição da parcela (até 120 caracteres).'
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'Informe um valor positivo para a parcela.'
  if (!isValidDate(input.dueDate)) return 'Informe uma data de vencimento válida.'
  if (!Array.isArray(input.receivedTransactionIds) || !input.receivedTransactionIds.every(id => typeof id === 'string' && id.trim()) ||
      new Set(input.receivedTransactionIds).size !== input.receivedTransactionIds.length) return 'Revise os recebimentos vinculados.'
  return ''
}

export function installmentReceived(installment: ProjectInstallment, transactions: readonly Transaction[]): number {
  const ids = new Set(installment.receivedTransactionIds)
  return transactions.filter(item => ids.has(item.id) && item.kind === 'entrada' && item.projectId === installment.projectId)
    .reduce((sum, item) => sum + item.amount, 0)
}

export function installmentBalance(installment: ProjectInstallment, transactions: readonly Transaction[]): number {
  return Math.max(0, installment.amount - installmentReceived(installment, transactions))
}

export type DeliveryInput = Pick<ProjectDelivery, 'projectId' | 'reviewSentAt' | 'approvedAt' | 'deliveredAt' | 'notes'>

export function validateDelivery(input: DeliveryInput): string {
  if (input.notes.length > 1000) return 'A observação deve ter até 1000 caracteres.'
  for (const date of [input.reviewSentAt, input.approvedAt, input.deliveredAt]) {
    if (date && !isValidDate(date)) return 'Informe datas válidas para revisão, aprovação e entrega.'
  }
  if (input.reviewSentAt && input.approvedAt && input.approvedAt < input.reviewSentAt) return 'A aprovação não pode ser anterior ao envio para revisão.'
  if (input.approvedAt && input.deliveredAt && input.deliveredAt < input.approvedAt) return 'A entrega não pode ser anterior à aprovação.'
  if (input.reviewSentAt && input.deliveredAt && input.deliveredAt < input.reviewSentAt) return 'A entrega não pode ser anterior ao envio para revisão.'
  return ''
}
