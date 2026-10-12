<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ClipboardList, Copy, Info, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { state, addBriefingTemplate, persistenceError, removeItem, updateBriefingTemplate } from '../lib/store'
import { validateBriefingTemplate } from '../lib/briefing'
import type { BriefingQuestionDefinition, BriefingQuestionType, BriefingSection, BriefingTemplate } from '../lib/types'

const showForm = ref(false)
const editingId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const copied = ref('')
const form = reactive<BriefingTemplate>({ id: '', name: '', description: '', sections: [] })
const questionTypes: Array<{ value: BriefingQuestionType; label: string }> = [
  { value: 'short-text', label: 'Texto curto' }, { value: 'long-text', label: 'Texto longo' },
  { value: 'email', label: 'E-mail' }, { value: 'url', label: 'Link' }, { value: 'date', label: 'Data' },
  { value: 'number', label: 'Número' }, { value: 'single-choice', label: 'Escolha única' },
  { value: 'multiple-choice', label: 'Múltipla escolha' }, { value: 'yes-no', label: 'Sim ou não' },
]
const allQuestions = computed(() => form.sections.flatMap(section => section.questions))
const questionCount = (template: BriefingTemplate) => template.sections.reduce((sum, section) => sum + section.questions.length, 0)
const linkedCount = (id: string) => state.services.filter(service => service.briefingTemplateId === id).length
const uid = () => crypto.randomUUID()

function blankQuestion(): BriefingQuestionDefinition {
  return { id: uid(), label: '', type: 'short-text', example: '', required: false, options: [], condition: null }
}
function blankSection(): BriefingSection {
  return { id: uid(), title: '', description: '', questions: [blankQuestion()] }
}
function reset() {
  Object.assign(form, { id: '', name: '', description: '', sections: [blankSection()] })
  editingId.value = null
  error.value = ''
}
function create() { reset(); feedback.value = ''; showForm.value = true }
function edit(template: BriefingTemplate) {
  Object.assign(form, JSON.parse(JSON.stringify(template)) as BriefingTemplate)
  editingId.value = template.id
  error.value = ''; feedback.value = ''; showForm.value = true
}
function addSection() { form.sections.push(blankSection()) }
function removeSection(id: string) {
  if (form.sections.length === 1) { error.value = 'O modelo precisa manter ao menos uma seção.'; return }
  form.sections = form.sections.filter(section => section.id !== id)
  const ids = new Set(allQuestions.value.map(question => question.id))
  for (const question of allQuestions.value) if (question.condition && !ids.has(question.condition.questionId)) question.condition = null
}
function addQuestion(section: BriefingSection) { section.questions.push(blankQuestion()) }
function removeQuestion(section: BriefingSection, id: string) {
  if (section.questions.length === 1) { error.value = 'Cada seção precisa manter ao menos uma pergunta.'; return }
  section.questions = section.questions.filter(question => question.id !== id)
  for (const question of allQuestions.value) if (question.condition?.questionId === id) question.condition = null
}
function setOptions(question: BriefingQuestionDefinition, event: Event) {
  question.options = (event.target as HTMLTextAreaElement).value.split('\n').map(option => option.trim()).filter(Boolean)
}
function selectCondition(question: BriefingQuestionDefinition, event: Event) {
  const questionId = (event.target as HTMLSelectElement).value
  question.condition = questionId ? { questionId, operator: 'equals', value: '' } : null
}
function validate(): string { return validateBriefingTemplate(form) }
function submit() {
  error.value = validate()
  if (error.value) return
  try {
    const { id: _id, ...payload } = JSON.parse(JSON.stringify(form)) as BriefingTemplate
    if (editingId.value) updateBriefingTemplate(editingId.value, payload)
    else addBriefingTemplate(payload)
    feedback.value = persistenceError.value || 'Questionário salvo na biblioteca. Projetos existentes mantêm seu próprio modelo e respostas.'
    showForm.value = false
    reset()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o questionário.' }
}
function drop(template: BriefingTemplate) {
  const references = linkedCount(template.id)
  const message = references
    ? `Este modelo está associado a ${references} serviço(s). Removê-lo preserva as cópias e respostas já vinculadas aos projetos. Continuar?`
    : 'Excluir este modelo da biblioteca? Projetos existentes preservam suas cópias.'
  if (confirm(message)) removeItem('briefingTemplates', template.id)
}
async function copy(template: BriefingTemplate) {
  const text = template.sections.map(section => `${section.title}\n${section.questions.map(question => `• ${question.label}${question.required ? ' *' : ''}`).join('\n')}`).join('\n\n')
  try { await navigator.clipboard.writeText(text); copied.value = `Perguntas de “${template.name}” copiadas.` }
  catch { copied.value = 'O navegador bloqueou a área de transferência.' }
}
</script>

<template>
  <div class="view-enter">
    <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> MODELOS REUTILIZÁVEIS</p><h1>Briefing</h1><p class="page-subtitle">Monte questionários por serviço. Cada projeto recebe uma cópia própria, com respostas independentes.</p></div><button class="btn btn-dark" @click="create"><Plus :size="17"/> Novo questionário</button></div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="notice-box subtle-notice"><Info :size="22"/><div><b>Edite a biblioteca sem alterar projetos em andamento.</b><p>Quando um projeto é criado, as perguntas são copiadas para ele. As respostas ficam no projeto e não mudam quando o modelo da biblioteca for atualizado.</p></div></div>
    <div v-if="state.briefingTemplates.length" class="briefing-template-grid">
      <article v-for="template in state.briefingTemplates" :key="template.id" class="surface briefing-template-card">
        <header><div><p class="section-kicker">{{ template.sections.length }} seções · {{ questionCount(template) }} perguntas</p><h2>{{ template.name }}</h2></div><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${template.name}`" @click="edit(template)"><Pencil :size="16"/></button><button class="icon-button danger" :aria-label="`Excluir ${template.name}`" @click="drop(template)"><Trash2 :size="16"/></button></div></header>
        <p class="briefing-template-description">{{ template.description || 'Sem descrição adicional.' }}</p>
        <div class="briefing-section-preview"><section v-for="section in template.sections" :key="section.id"><b>{{ section.title }}</b><small>{{ section.questions.length }} perguntas<span v-if="section.questions.some(question => question.condition)"> · inclui condições</span></small></section></div>
        <footer><span>{{ linkedCount(template.id) }} serviço(s) usando este modelo</span><button class="text-link" @click="copy(template)"><Copy :size="14"/> Copiar perguntas</button></footer>
      </article>
    </div>
    <div v-else class="surface empty"><ClipboardList :size="26"/><b>Nenhum questionário cadastrado</b><p>Crie um modelo ou restaure seus dados de um backup.</p><button class="btn btn-outline" @click="create">Criar questionário</button></div>
    <details v-if="state.legacyBriefing.length" class="legacy-briefing surface"><summary>Roteiro antigo preservado ({{ state.legacyBriefing.length }} itens)</summary><p>Essas perguntas vieram de uma versão anterior. Elas continuam no backup e podem servir como referência ao montar modelos novos.</p><ul><li v-for="item in state.legacyBriefing" :key="item.id"><b>{{ item.phase }}:</b> {{ item.question }}</li></ul></details>
    <p v-if="copied" class="inline-notice" role="status">{{ copied }}</p>

    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal modal-wide briefing-builder" role="dialog" aria-modal="true" aria-labelledby="brief-modal-title"><div class="modal-head"><div><p class="section-kicker">BIBLIOTECA DE QUESTIONÁRIOS</p><h2 id="brief-modal-title">{{ editingId ? 'Editar questionário' : 'Novo questionário' }}</h2></div><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="brief-name">Nome do questionário *</label><input id="brief-name" v-model="form.name" maxlength="120" required autofocus placeholder="Ex.: Site para evento"/></div><div class="field"><label for="brief-description">Quando usar</label><textarea id="brief-description" v-model="form.description" rows="2" maxlength="400" placeholder="Resumo para ajudar a escolher o modelo"/></div>
        <div v-for="(section, sectionIndex) in form.sections" :key="section.id" class="builder-section"><header><div><p class="section-kicker">SEÇÃO {{ sectionIndex + 1 }}</p><button class="icon-button danger" type="button" :aria-label="`Remover seção ${sectionIndex + 1}`" @click="removeSection(section.id)"><Trash2 :size="15"/></button></div></header><div class="field"><label :for="`section-title-${section.id}`">Título da seção *</label><input :id="`section-title-${section.id}`" v-model="section.title" required maxlength="120" placeholder="Ex.: Sobre o projeto"/></div><div class="field"><label :for="`section-description-${section.id}`">Orientação para o cliente</label><textarea :id="`section-description-${section.id}`" v-model="section.description" rows="2" maxlength="300"/></div>
          <article v-for="(question, questionIndex) in section.questions" :key="question.id" class="builder-question"><div class="builder-question-heading"><b>Pergunta {{ questionIndex + 1 }}</b><button class="icon-button danger" type="button" :aria-label="`Remover pergunta ${questionIndex + 1}`" @click="removeQuestion(section, question.id)"><Trash2 :size="14"/></button></div><div class="field"><label :for="`question-label-${question.id}`">Texto da pergunta *</label><textarea :id="`question-label-${question.id}`" v-model="question.label" rows="2" maxlength="300" required placeholder="Escreva a pergunta para o cliente"/></div>
            <div class="form-row"><div class="field"><label :for="`question-type-${question.id}`">Tipo de resposta</label><select :id="`question-type-${question.id}`" v-model="question.type"><option v-for="type in questionTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select></div><label class="required-toggle"><input v-model="question.required" type="checkbox"/> Obrigatória</label></div>
            <div v-if="['single-choice', 'multiple-choice'].includes(question.type)" class="field"><label :for="`question-options-${question.id}`">Opções (uma por linha) *</label><textarea :id="`question-options-${question.id}`" :value="question.options.join('\n')" rows="3" @input="setOptions(question, $event)" placeholder="Primeira opção&#10;Segunda opção"/></div>
            <div class="field"><label :for="`question-example-${question.id}`">Exemplo ou ajuda</label><input :id="`question-example-${question.id}`" v-model="question.example" maxlength="240" placeholder="Ex.: nomes, link ou formato esperado"/></div>
            <div class="field"><label :for="`question-condition-${question.id}`">Mostrar esta pergunta quando</label><select :id="`question-condition-${question.id}`" :value="question.condition?.questionId ?? ''" @change="selectCondition(question, $event)"><option value="">Sempre mostrar</option><option v-for="source in allQuestions" :key="source.id" :value="source.id" :disabled="source.id === question.id">{{ source.label || 'Pergunta sem texto' }}</option></select></div>
            <div v-if="question.condition" class="form-row condition-row"><div class="field"><label :for="`question-operator-${question.id}`">Condição</label><select :id="`question-operator-${question.id}`" v-model="question.condition.operator"><option value="equals">A resposta é</option><option value="includes">A resposta inclui</option><option value="answered">A pergunta foi respondida</option></select></div><div v-if="question.condition.operator !== 'answered'" class="field"><label :for="`question-value-${question.id}`">Resposta que libera</label><input :id="`question-value-${question.id}`" v-model="question.condition.value" maxlength="150" required/></div></div>
          </article><button class="btn btn-outline btn-slim" type="button" @click="addQuestion(section)"><Plus :size="14"/> Adicionar pergunta</button>
        </div>
        <button class="btn btn-outline" type="button" @click="addSection"><Plus :size="15"/> Adicionar seção</button>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button class="btn btn-outline" type="button" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">{{ editingId ? 'Salvar alterações' : 'Salvar questionário' }}</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
