import test from 'node:test'
import assert from 'node:assert/strict'
import { briefingProgress, isQuestionVisible, unansweredRequiredQuestionIds, validateBriefingTemplate } from '../src/lib/briefing.ts'
import { createProjectBriefing } from '../src/lib/workspace.ts'
import { initialBriefingTemplates } from '../src/lib/catalog.ts'

test('perguntas condicionais aparecem conforme a resposta e saem do progresso quando ocultas', () => {
  const template = initialBriefingTemplates.find(item => item.id === 'brief-template-event')!
  const briefing = createProjectBriefing('project-1', template, 'briefing-1', '2026-06-01')
  const questions = template.sections.flatMap(section => section.questions)
  const rsvpQuestion = questions.find(question => question.id === 'event-rsvp-link')!
  const methodQuestion = questions.find(question => question.id === 'event-rsvp-method')!
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers), false)
  briefing.answers['event-rsvp'] = 'Não'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers), false)
  briefing.answers['event-rsvp'] = 'Sim'
  assert.equal(isQuestionVisible(methodQuestion, briefing.answers, questions), true)
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers, questions), false)
  assert.ok(unansweredRequiredQuestionIds(briefing).includes('event-rsvp-method'))
  briefing.answers['event-rsvp-method'] = 'No próprio convite'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers, questions), false)
  assert.ok(!unansweredRequiredQuestionIds(briefing).includes('event-rsvp-link'))
  briefing.answers['event-rsvp-method'] = 'Por formulário ou link externo'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers, questions), true)
  assert.ok(unansweredRequiredQuestionIds(briefing).includes('event-rsvp-link'))
  briefing.answers['event-rsvp'] = 'Não'
  assert.equal(isQuestionVisible(rsvpQuestion, briefing.answers, questions), false)
  assert.ok(!unansweredRequiredQuestionIds(briefing).includes('event-rsvp-link'))
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

test('RSVP por planilha ou WhatsApp não exige link externo', () => {
  const template = initialBriefingTemplates.find(item => item.id === 'brief-template-event')!
  const questions = template.sections.flatMap(section => section.questions)
  const briefing = createProjectBriefing('project-1', template, 'briefing-1', '2026-06-01')
  const sheet = questions.find(question => question.id === 'event-rsvp-sheet')!
  const whatsapp = questions.find(question => question.id === 'event-rsvp-whatsapp')!
  const external = questions.find(question => question.id === 'event-rsvp-link')!
  briefing.answers['event-rsvp'] = 'Sim'
  briefing.answers['event-rsvp-method'] = 'Em uma planilha'
  assert.equal(isQuestionVisible(sheet, briefing.answers, questions), true)
  assert.equal(isQuestionVisible(whatsapp, briefing.answers, questions), false)
  assert.equal(isQuestionVisible(external, briefing.answers, questions), false)
  briefing.answers['event-rsvp-method'] = 'Pelo WhatsApp'
  assert.equal(isQuestionVisible(sheet, briefing.answers, questions), false)
  assert.equal(isQuestionVisible(whatsapp, briefing.answers, questions), true)
  assert.equal(isQuestionVisible(external, briefing.answers, questions), false)
  briefing.answers['event-rsvp-method'] = 'Ainda não definido'
  assert.equal(isQuestionVisible(sheet, briefing.answers, questions), false)
  assert.equal(isQuestionVisible(whatsapp, briefing.answers, questions), false)
  assert.equal(isQuestionVisible(external, briefing.answers, questions), false)
})
