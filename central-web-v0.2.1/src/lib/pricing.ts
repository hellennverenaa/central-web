import type { Service } from './types'

// Apenas referência ilustrativa. Não inclui impostos, pesquisa de mercado ou margem real de lucro.
export function serviceFloor(service: Pick<Service, 'hours' | 'hourlyRate' | 'extras' | 'contingency'>): number {
  const valid = (value: number) => Number.isFinite(value) && value >= 0 ? value : 0
  return valid(service.hours) * valid(service.hourlyRate) * (1 + Math.min(valid(service.contingency), 3)) + valid(service.extras)
}

export function serviceSuggestion(service: Pick<Service, 'hours' | 'hourlyRate' | 'extras' | 'contingency'>): number {
  return Math.ceil(serviceFloor(service) / 10) * 10
}
