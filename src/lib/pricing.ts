import type { Service } from './types'

// Apenas referência ilustrativa. Não inclui impostos, pesquisa de mercado ou margem real de lucro.
export function serviceFloor(service: Pick<Service, 'hours' | 'hourlyRate' | 'extras' | 'contingency'>): number {
  const valid = (value: number) => Number.isFinite(value) && value >= 0 ? value : 0
  return valid(service.hours) * valid(service.hourlyRate) * (1 + Math.min(valid(service.contingency), 3)) + valid(service.extras)
}

export function serviceSuggestion(service: Pick<Service, 'hours' | 'hourlyRate' | 'extras' | 'contingency'>): number {
  return Math.ceil(serviceFloor(service) / 10) * 10
}

/**
 * A estimativa informada na oportunidade tem precedência sobre a sugestão
 * do catálogo. Zero significa que ainda não houve estimativa.
 */
export function initialConversionPrice(
  estimatedValue: number,
  service: Pick<Service, 'hours' | 'hourlyRate' | 'extras' | 'contingency'> | null,
): number {
  if (Number.isFinite(estimatedValue) && estimatedValue > 0) return estimatedValue
  return service ? serviceSuggestion(service) : 0
}
