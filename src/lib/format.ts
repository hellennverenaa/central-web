export const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
export function dateBR(value: string): string {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : '—'
}
export function todayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export const leadLabels = { novo: 'Novo', conversa: 'Em conversa', proposta: 'Proposta', ganho: 'Fechado', perdido: 'Perdido' }
export const projectLabels = { planejado: 'Planejado', andamento: 'Em andamento', revisao: 'Em revisão', entregue: 'Entregue' }
export function whatsappHref(contact: string): string | null {
  const digits = contact.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return null
  const country = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  return `https://wa.me/${country}`
}
