import test from 'node:test'
import assert from 'node:assert/strict'
import { briefingProgress, isQuestionVisible, unansweredRequiredQuestionIds, validateBriefingTemplate } from '../src/lib/briefing.ts'
import { createProjectBriefing } from '../src/lib/workspace.ts'
import { initialBriefingTemplates } from '../src/lib/catalog.ts'

test('perguntas condicionais aparecem conforme a resposta e saem do progresso quando ocultas', () => {
  const template = initialBriefingTemplates.find(item => item.id === 'brief-template-event')!
  const briefing = createProjectBriefing('project-1', template, 'briefing-1', '2026-06-01')
  const rsvpQuestion = template.sections.flatMap(section => section.questions).find(question => question.id === 'event-rsvp-link')!
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers), false)
  briefing.answers['event-rsvp'] = 'Não'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers), false)
  briefing.answers['event-rsvp'] = 'Sim'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers), true)
  assert.ok(unansweredRequiredQuestionIds(briefing).includes('event-rsvp-link'))
  assert.equal(briefingProgress(briefing).total, 7)
})

test('o construtor rejeita ciclos em perguntas condicionais', () => {
  const template = {
    name: 'Questionário inválido',
    sections: [{ id: 'section', title: 'Seção', questions: [
      { id: 'a', label: 'Pergunta A', type: 'short-text' as const, example: '', required: false, options: [], condition: { questionId: 'b', operator: 'answered' as const } },
      { id: 'b', label: 'Pergunta B', type: 'short-text' as const, example: '', required: false, options: [], condition: { questionId: 'a', operator: 'answered' as const } },
    ] }],
  }
  assert.match(validateBriefingTemplate(template), /ciclo/)
})
