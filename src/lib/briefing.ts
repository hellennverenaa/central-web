import type { BriefingAnswer, BriefingQuestionDefinition, ProjectBriefing } from './types.ts'

export function validateBriefingTemplate(template: { name: string; sections: Array<{ title: string; questions: BriefingQuestionDefinition[] }> }): string {
  if (!template.name.trim()) return 'Informe o nome do questionário.'
  if (!template.sections.length) return 'Inclua ao menos uma seção.'
  const sectionIds = template.sections.map(section => (section as { id?: string }).id).filter((id): id is string => Boolean(id))
  if (sectionIds.length !== template.sections.length || new Set(sectionIds).size !== sectionIds.length) return 'Cada seção precisa ter um identificador único.'
  const questions = template.sections.flatMap(section => section.questions)
  const questionById = new Map(questions.map(question => [question.id, question]))
  if (questionById.size !== questions.length || questions.some(question => !question.id.trim())) return 'Cada pergunta precisa ter um identificador único.'
  for (const section of template.sections) {
    if (!section.title.trim()) return 'Informe o título de cada seção.'
    if (!section.questions.length) return `Inclua uma pergunta na seção “${section.title}”.`
  }
  for (const question of questions) {
    if (!question.label.trim()) return 'Preencha o texto de cada pergunta.'
    if (['single-choice', 'multiple-choice'].includes(question.type) && (!question.options.some(option => option.trim()) || new Set(question.options.map(option => option.trim())).size !== question.options.length)) return `Revise as opções de “${question.label}”.`
    if (question.condition && (!questionById.has(question.condition.questionId) || question.condition.questionId === question.id)) return `Revise a condição de “${question.label}”.`
    if (question.condition?.operator !== 'answered' && question.condition && !question.condition.value?.trim()) return `Informe a resposta que revela “${question.label}”.`
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    const parent = questionById.get(id)?.condition?.questionId
    if (parent && hasCycle(parent)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  if (questions.some(question => hasCycle(question.id))) return 'As condições do questionário não podem depender umas das outras em ciclo.'
  return ''
}

export function isQuestionVisible(question: BriefingQuestionDefinition, answers: Record<string, BriefingAnswer>): boolean {
  const condition = question.condition
  if (!condition) return true
  const answer = answers[condition.questionId]
  if (condition.operator === 'answered') {
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim())
  }
  if (condition.operator === 'equals') {
    return !Array.isArray(answer) && answer === condition.value
  }
  return Array.isArray(answer) ? answer.includes(condition.value ?? '') : answer?.split(',').map(value => value.trim()).includes(condition.value ?? '') ?? false
}

export function requiredQuestionIds(briefing: ProjectBriefing): string[] {
  const questions = briefing.sections.flatMap(section => section.questions)
  return questions.filter(question => question.required && isQuestionVisible(question, briefing.answers)).map(question => question.id)
}

export function unansweredRequiredQuestionIds(briefing: ProjectBriefing): string[] {
  return requiredQuestionIds(briefing).filter(id => {
    const answer = briefing.answers[id]
    return Array.isArray(answer) ? answer.length === 0 : !answer?.trim()
  })
}

export function briefingProgress(briefing: ProjectBriefing): { complete: number; total: number } {
  const required = requiredQuestionIds(briefing)
  return { complete: required.length - unansweredRequiredQuestionIds(briefing).length, total: required.length }
}
