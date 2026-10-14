import test from 'node:test'
import assert from 'node:assert/strict'
import { briefingProgress, briefingReviewSections, isQuestionVisible, unansweredRequiredQuestionIds, validateBriefingTemplate } from '../src/lib/briefing.ts'
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

test('consulta do briefing reúne todas as seções sem campos de formulário', () => {
  const template = initialBriefingTemplates.find(item => item.id === 'brief-template-event')!
  const briefing = createProjectBriefing('project-consulta', template, 'briefing-consulta', '2026-10-12')
  const allQuestions = template.sections.flatMap(section => section.questions)
  const multiple = allQuestions.find(question => question.type === 'multiple-choice')!
  const original = structuredClone(briefing)
  briefing.answers[multiple.id] = multiple.options.slice(0, 2)
  const review = briefingReviewSections(briefing)
  assert.equal(review.length, template.sections.length)
  const multipleAnswer = review.flatMap(section => section.answers).find(item => item.id === multiple.id)!
  assert.equal(multipleAnswer.answer, multiple.options.slice(0, 2).join(', '))
  assert.equal(multipleAnswer.answered, true)
  assert.ok(review.flatMap(section => section.answers).some(item => !item.answered && item.answer === ''))
  assert.deepEqual(briefing.sections, original.sections)
})

test('consulta do briefing não exibe respostas ocultas por condições encadeadas', () => {
  const template = initialBriefingTemplates.find(item => item.id === 'brief-template-event')!
  const briefing = createProjectBriefing('project-1', template, 'briefing-1', '2026-10-12')
  briefing.answers['event-rsvp'] = 'Sim'
  briefing.answers['event-rsvp-method'] = 'Por formulário ou link externo'
  briefing.answers['event-rsvp-link'] = 'https://example.org/rsvp'
  const all = () => briefingReviewSections(briefing).flatMap(section => section.answers)
  assert.equal(all().find(item => item.id === 'event-rsvp-link')?.answer, 'https://example.org/rsvp')
  briefing.answers['event-rsvp'] = 'Não'
  assert.equal(all().find(item => item.id === 'event-rsvp-link'), undefined)
  assert.equal(all().find(item => item.id === 'event-rsvp-method'), undefined)
  briefing.answers['event-rsvp'] = 'Sim'
  briefing.answers['event-rsvp-method'] = 'Em uma planilha'
  assert.equal(all().find(item => item.id === 'event-rsvp-link'), undefined)
  assert.ok(all().some(item => item.id === 'event-rsvp-sheet'))
  assert.equal(briefing.answers['event-rsvp-link'], 'https://example.org/rsvp')
})
