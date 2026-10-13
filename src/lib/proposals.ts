import type { Lead, LeadProposal, ProposalRevision, ProposalStatus, Service } from './types.ts'
import { initialConversionPrice } from './pricing.ts'
export type ProposalInput = Pick<ProposalRevision, 'serviceName' | 'scope' | 'exclusions' | 'price' | 'deliveryTerms' | 'revisionRounds' | 'paymentTerms' | 'notes'>
export function validateProposalDraft(input: ProposalInput): string {
  if (!input.serviceName.trim() || input.serviceName.length > 120) return 'Informe um serviço com até 120 caracteres.'
  if (input.scope.length > 4000 || input.exclusions.length > 3000 || input.notes.length > 2000 ||
    input.paymentTerms.length > 1000 || input.deliveryTerms.length > 500) return 'O texto da proposta ultrapassa o tamanho permitido.'
  if (!Number.isFinite(input.price) || input.price < 0) return 'Informe um preço válido, igual ou maior que zero.'
  if (!Number.isInteger(input.revisionRounds) || input.revisionRounds < 0 || input.revisionRounds > 20) return 'Informe de 0 a 20 rodadas de revisão.'
  return ''
}
export function validateProposalForSending(input: ProposalInput): string {
  const draftError = validateProposalDraft(input)
  if (draftError) return draftError
  if (!input.scope.trim()) return 'Descreva o escopo antes de marcar como enviada.'
  if (!input.price || input.price <= 0) return 'Confirme um valor positivo antes de enviar.'
  if (!input.deliveryTerms.trim()) return 'Informe o prazo ou condição de entrega antes de enviar.'
  if (!input.paymentTerms.trim()) return 'Informe as condições de pagamento antes de enviar.'
  return ''
}
export function proposalFromLead(lead: Lead, service: Service | null): ProposalInput {
  return {
    serviceName: service?.name || lead.service || 'A definir',
    scope: service?.scope || lead.notes || '',
    exclusions: service?.exclusions || '',
    price: initialConversionPrice(lead.value, service),
    deliveryTerms: '', revisionRounds: 0, paymentTerms: '', notes: '',
  }
}
export function latestRevision(proposal: LeadProposal | undefined | null): ProposalRevision | null {
  return proposal?.revisions.at(-1) ?? null
}
export function acceptedPrice(proposal: LeadProposal | undefined | null): number | null {
  const revision = latestRevision(proposal)
  return revision?.status === 'aceita' ? revision.price : null
}
export const proposalStatusLabel: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita', recusada: 'Recusada',
}
export function proposalText(client: string, revision: ProposalRevision): string {
  return [
    'PROPOSTA DE SERVIÇO', '', `Cliente: ${client}`, `Versão: ${revision.number}`,
    `Serviço: ${revision.serviceName}`, '', 'ESCOPO', revision.scope || 'Não informado', '',
    'NÃO INCLUSO', revision.exclusions || 'A combinar', '',
    `RODADAS DE REVISÃO INCLUÍDAS: ${revision.revisionRounds}`, '',
    'PRAZO / CONDIÇÕES DE ENTREGA', revision.deliveryTerms || 'A combinar', '',
    'CONDIÇÕES DE PAGAMENTO', revision.paymentTerms || 'A combinar', '',
    `VALOR PROPOSTO: R$ ${revision.price.toFixed(2).replace('.', ',')}`,
    ...(revision.notes.trim() ? ['', 'OBSERVAÇÕES', revision.notes] : []),
    '', 'Proposta para revisão; não representa confirmação de pagamento nem contrato assinado.',
  ].join('\n')
}
