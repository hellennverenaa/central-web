<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, FolderKanban, Link2, ExternalLink, Pencil, Plus, Trash2, Wallet } from 'lucide-vue-next'
import { state, addProjectMaterial, addTask, addTransaction, persistenceError, removeItem, removeProjectMaterial, updateProjectMaterial, updateProject, updateProjectBriefing, updateTask, updateTransaction } from '../lib/store'
import { brl, dateBR, projectLabels, todayLocal } from '../lib/format'
import { serviceSuggestion } from '../lib/pricing'
import { projectMaterialCategories } from '../lib/projectMaterials'
import { briefingProgress, isQuestionVisible, unansweredRequiredQuestionIds } from '../lib/briefing'
import type { BriefingAnswer, BriefingQuestionDefinition, ProjectMaterial, ProjectMaterialCategory, ProjectStatus, Transaction, TransactionType } from '../lib/types'

type MainPage = 'projects' | 'leads' | 'services' | 'finance' | 'tasks'
const props = defineProps<{ projectId: string; notice?: string }>()
const emit = defineEmits<{ go: [page: MainPage]; openLead: [id: string]; openService: [id: string] }>()
const project = computed(() => state.projects.find(item => item.id === props.projectId) ?? null)
const sourceLead = computed(() => project.value?.sourceLeadId ? state.leads.find(lead => lead.id === project.value?.sourceLeadId) ?? null : null)
const service = computed(() => project.value?.serviceId ? state.services.find(item => item.id === project.value?.serviceId) ?? null : null)
const tasks = computed(() => state.tasks.filter(task => task.projectId === props.projectId))
const transactions = computed(() => state.transactions.filter(item => item.projectId === props.projectId))
const materials = computed(() => state.projectMaterials.filter(item => item.projectId === props.projectId))
const received = computed(() => transactions.value.filter(item => item.kind === 'entrada').reduce((sum, item) => sum + item.amount, 0))
const spent = computed(() => transactions.value.filter(item => item.kind === 'saida').reduce((sum, item) => sum + item.amount, 0))
const projectBriefing = computed(() => state.projectBriefings.find(item => item.id === project.value?.briefingId) ?? null)
const briefingAnswers = reactive<Record<string, BriefingAnswer>>({})
const briefingError = ref('')
const briefingFeedback = ref('')
const briefingQuestions = computed(() => projectBriefing.value?.sections.flatMap(section => section.questions) ?? [])
const briefingDirty = ref(false)
const briefingSavedAt = ref('')
const briefingProgressValue = computed(() => projectBriefing.value ? briefingProgress({ ...projectBriefing.value, answers: { ...briefingAnswers } }) : { complete: 0, total: 0 })
const missingBriefingAnswers = computed(() => projectBriefing.value ? unansweredRequiredQuestionIds({ ...projectBriefing.value, answers: { ...briefingAnswers } }).length : 0)
const openProjectForm = ref(false)
const openTaskForm = ref(false)
const openTransactionForm = ref(false)
const openMaterialForm = ref(false)
const editingMaterialId = ref<string | null>(null)
const materialError = ref('')
const materialFeedback = ref('')
const materialForm = reactive({ name: '', category: 'referencia' as ProjectMaterialCategory, url: '', notes: '' })
const materialCategoryName = (category: ProjectMaterialCategory) => projectMaterialCategories.find(item => item.value === category)?.label ?? 'Outro'
const editingTaskId = ref<string | null>(null)
const editingTransactionId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const abaAtiva = ref<'resumo' | 'briefing' | 'tarefas' | 'materiais' | 'financeiro'>('resumo')
const secaoBriefingAtiva = ref('')
const tarefasPendentes = computed(() => tasks.value.filter(task => !task.done).length)
const valorAReceber = computed(() => Math.max(0, (project.value?.value ?? 0) - received.value))
const projectForm = reactive({ name: '', client: '', serviceId: '', status: 'planejado' as ProjectStatus, deadline: todayLocal(), value: 0 })
const taskForm = reactive({ title: '' })
const transactionForm = reactive({ description: '', kind: 'entrada' as TransactionType, amount: 0, date: todayLocal() })

watch(() => [props.projectId, projectBriefing.value?.id] as const, () => {
  for (const key of Object.keys(briefingAnswers)) delete briefingAnswers[key]
  if (projectBriefing.value) Object.assign(briefingAnswers, JSON.parse(JSON.stringify(projectBriefing.value.answers)) as Record<string, BriefingAnswer>)
  briefingError.value = ''
  briefingFeedback.value = ''
  briefingDirty.value = false
  briefingSavedAt.value = ''
  abaAtiva.value = 'resumo'
  openMaterialForm.value = false
  materialFeedback.value = ''
  materialError.value = ''
  secaoBriefingAtiva.value = projectBriefing.value?.sections[0]?.id ?? ''
}, { immediate: true })

function visibleQuestion(question: BriefingQuestionDefinition) { return isQuestionVisible(question, briefingAnswers, briefingQuestions.value) }
function scalarAnswer(questionId: string): string {
  const answer = briefingAnswers[questionId]
  return typeof answer === 'string' ? answer : ''
}
function setScalarAnswer(questionId: string, event: Event) {
  briefingAnswers[questionId] = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
  briefingDirty.value = true
  briefingFeedback.value = ''
}
function selectedAnswers(questionId: string): string[] {
  const answer = briefingAnswers[questionId]
  return Array.isArray(answer) ? answer : []
}
function toggleAnswer(questionId: string, option: string, checked: boolean) {
  const answers = new Set(selectedAnswers(questionId))
  if (checked) answers.add(option)
  else answers.delete(option)
  briefingAnswers[questionId] = [...answers]
  briefingDirty.value = true
  briefingFeedback.value = ''
}
function saveBriefing(continueToNext = false) {
  briefingError.value = ''
  if (!projectBriefing.value) { briefingError.value = 'Este projeto não tem um questionário vinculado.'; return }
  try {
    updateProjectBriefing(projectBriefing.value.id, { ...briefingAnswers })
    if (persistenceError.value) {
      briefingError.value = persistenceError.value
      briefingFeedback.value = ''
      return
    }
    briefingDirty.value = false
    briefingSavedAt.value = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
    briefingFeedback.value = `Respostas salvas com sucesso às ${briefingSavedAt.value}.` + (missingBriefingAnswers.value ? ` Ainda faltam ${missingBriefingAnswers.value} campo(s) obrigatório(s).` : '')
    if (continueToNext) {
      const sections = projectBriefing.value.sections
      const currentIndex = sections.findIndex(section => section.id === secaoBriefingAtiva.value)
      if (currentIndex >= 0 && currentIndex < sections.length - 1) secaoBriefingAtiva.value = sections[currentIndex + 1]!.id
    }
  } catch (cause) { briefingError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar as respostas.' }
}

function editProject() {
  if (!project.value) return
  Object.assign(projectForm, { name: project.value.name, client: project.value.client, serviceId: project.value.serviceId ?? '', status: project.value.status, deadline: project.value.deadline || todayLocal(), value: project.value.value })
  error.value = ''; feedback.value = ''; openProjectForm.value = true
}
function saveProject() {
  error.value = ''
  if (!project.value) return
  if (!projectForm.name.trim() || !projectForm.client.trim()) { error.value = 'Informe o nome do projeto e o cliente.'; return }
  try {
    updateProject(project.value.id, { name: projectForm.name.trim(), client: projectForm.client.trim(), serviceId: projectForm.serviceId || null, status: projectForm.status, deadline: projectForm.deadline, value: Number(projectForm.value) })
    feedback.value = persistenceError.value || 'Projeto atualizado e salvo neste dispositivo.'
    openProjectForm.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar o projeto.' }
}
function createTask() { editingTaskId.value = null; taskForm.title = ''; error.value = ''; openTaskForm.value = true }
function editTask(taskId: string) { const task = state.tasks.find(item => item.id === taskId); if (!task) return; editingTaskId.value = task.id; taskForm.title = task.title; error.value = ''; openTaskForm.value = true }
function saveTask() {
  error.value = ''
  try {
    if (editingTaskId.value) {
      const task = state.tasks.find(item => item.id === editingTaskId.value)
      if (!task) throw new Error('A tarefa não foi encontrada.')
      updateTask(task.id, { title: taskForm.title, done: task.done, projectId: props.projectId })
    } else addTask(taskForm.title, props.projectId)
    feedback.value = persistenceError.value || 'Tarefa salva neste dispositivo.'
    openTaskForm.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a tarefa.' }
}
function toggleTask(taskId: string, done: boolean) {
  const task = state.tasks.find(item => item.id === taskId)
  if (!task) return
  try { updateTask(task.id, { title: task.title, done, projectId: task.projectId }); feedback.value = persistenceError.value || 'Tarefa atualizada.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar a tarefa.' }
}
function createTransaction(kind: TransactionType) {
  editingTransactionId.value = null
  Object.assign(transactionForm, { description: '', kind, amount: 0, date: todayLocal() })
  error.value = ''; openTransactionForm.value = true
}
function editTransaction(transaction: Transaction) {
  editingTransactionId.value = transaction.id
  Object.assign(transactionForm, { description: transaction.description, kind: transaction.kind, amount: transaction.amount, date: transaction.date })
  error.value = ''; openTransactionForm.value = true
}
function saveTransaction() {
  error.value = ''
  try {
    const payload = { ...transactionForm, description: transactionForm.description.trim(), amount: Number(transactionForm.amount), date: transactionForm.date, projectId: props.projectId }
    if (editingTransactionId.value) updateTransaction(editingTransactionId.value, payload)
    else addTransaction(payload)
    feedback.value = persistenceError.value || 'Lançamento salvo neste dispositivo.'
    openTransactionForm.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o lançamento.' }
}
function createMaterial() {
  editingMaterialId.value = null
  Object.assign(materialForm, { name: '', category: 'referencia', url: '', notes: '' })
  materialError.value = ''
  materialFeedback.value = ''
  openMaterialForm.value = true
}
function editMaterial(material: ProjectMaterial) {
  editingMaterialId.value = material.id
  Object.assign(materialForm, { name: material.name, category: material.category, url: material.url, notes: material.notes })
  materialError.value = ''
  materialFeedback.value = ''
  openMaterialForm.value = true
}
function saveMaterial() {
  materialError.value = ''
  try {
    const input = { ...materialForm, projectId: props.projectId }
    if (editingMaterialId.value) updateProjectMaterial(editingMaterialId.value, input)
    else addProjectMaterial(input)
    if (persistenceError.value) {
      materialError.value = persistenceError.value
      return
    }
    materialFeedback.value = editingMaterialId.value ? 'Link atualizado e salvo neste projeto.' : 'Link adicionado e salvo neste projeto.'
    openMaterialForm.value = false
  } catch (cause) { materialError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o link.' }
}
function dropMaterial(material: ProjectMaterial) {
  if (!confirm(`Excluir o link “${material.name}” deste projeto?`)) return
  try {
    removeProjectMaterial(material.id, props.projectId)
    materialFeedback.value = persistenceError.value || 'Link removido deste projeto.'
  } catch (cause) { materialError.value = cause instanceof Error ? cause.message : 'Não foi possível excluir o link.' }
}
function dropTask(id: string) { if (confirm('Excluir esta tarefa?')) removeItem('tasks', id) }
function dropTransaction(id: string) { if (confirm('Excluir este lançamento?')) removeItem('transactions', id) }
</script>

<template>
  <div v-if="project" class="view-enter">
    <div class="page-intro detail-intro"><div><button class="back-link" @click="emit('go', 'projects')"><ArrowLeft :size="15"/> Todos os projetos</button><p class="eyebrow"><span class="eyebrow-line"></span> DETALHES DO PROJETO</p><h1>{{ project.name }}</h1><p class="page-subtitle">{{ project.client }} · prazo {{ dateBR(project.deadline) }} · <span class="pill" :class="project.status">{{ projectLabels[project.status] }}</span></p></div><button class="btn btn-outline" @click="editProject"><Pencil :size="16"/> Editar projeto</button></div>
    <p v-if="notice || feedback" class="inline-notice" role="status">{{ feedback || notice }}</p><p v-if="error && !openProjectForm && !openTaskForm && !openTransactionForm" class="form-error" role="alert">{{ error }}</p>
    <div class="project-value-grid">
      <article class="surface project-value-card"><span>PREÇO COMBINADO</span><strong>{{ brl(project.value) }}</strong><small>Valor do projeto; não representa recebimento.</small></article>
      <article class="surface project-value-card"><span>RECEBIDO</span><strong class="positive">{{ brl(received) }}</strong><small>{{ transactions.filter(item => item.kind === 'entrada').length }} entrada(s) vinculada(s)</small></article>
      <article class="surface project-value-card"><span>DESPESAS</span><strong class="negative">{{ brl(spent) }}</strong><small>{{ transactions.filter(item => item.kind === 'saida').length }} saída(s) vinculada(s)</small></article>
      <article class="surface project-value-card"><span>AINDA A RECEBER</span><strong>{{ brl(valorAReceber) }}</strong><small>Preço combinado menos recebimentos; não é saldo em caixa.</small></article>
    </div>

    <div class="project-relations surface"><div><span class="section-kicker">OPORTUNIDADE DE ORIGEM</span><template v-if="sourceLead"><button class="table-link strong" @click="emit('openLead', sourceLead.id)">{{ sourceLead.name }} <ArrowRight :size="14"/></button><small>Estimativa do pipeline: {{ brl(sourceLead.value) }}</small></template><span v-else class="relation-empty">Projeto criado sem oportunidade vinculada.</span></div><div><span class="section-kicker">SERVIÇO</span><template v-if="service"><button class="table-link strong" @click="emit('openService', service.id)">Ver modelo: {{ service.name }} <ArrowRight :size="14"/></button><small>Referência simulada: {{ brl(serviceSuggestion(service)) }}</small></template><span v-else class="relation-empty">Nenhum serviço vinculado.</span></div></div>

    <nav class="project-tabs" aria-label="Áreas do projeto">
      <button class="project-tab" :class="{ ativo: abaAtiva === 'resumo' }" :aria-current="abaAtiva === 'resumo' ? 'page' : undefined" @click="abaAtiva = 'resumo'">Resumo</button>
      <button class="project-tab" :class="{ ativo: abaAtiva === 'briefing' }" :aria-current="abaAtiva === 'briefing' ? 'page' : undefined" @click="abaAtiva = 'briefing'">Briefing <span>{{ briefingProgressValue.complete }}/{{ briefingProgressValue.total }}</span></button>
      <button class="project-tab" :class="{ ativo: abaAtiva === 'tarefas' }" :aria-current="abaAtiva === 'tarefas' ? 'page' : undefined" @click="abaAtiva = 'tarefas'">Tarefas <span>{{ tarefasPendentes }} pendentes</span></button>
      <button class="project-tab" :class="{ ativo: abaAtiva === 'materiais' }" :aria-current="abaAtiva === 'materiais' ? 'page' : undefined" @click="abaAtiva = 'materiais'">Materiais <span>{{ materials.length }}</span></button>
      <button class="project-tab" :class="{ ativo: abaAtiva === 'financeiro' }" :aria-current="abaAtiva === 'financeiro' ? 'page' : undefined" @click="abaAtiva = 'financeiro'">Financeiro</button>
    </nav>

    <section v-if="abaAtiva === 'resumo'" class="project-overview" aria-label="Resumo e próximos passos">
      <div class="surface project-next-step">
        <p class="section-kicker">PRÓXIMA AÇÃO SUGERIDA</p>
        <template v-if="missingBriefingAnswers > 0">
          <h2>Complete o briefing</h2>
          <p>Faltam {{ missingBriefingAnswers }} resposta(s) obrigatória(s). O questionário já está preparado para este projeto.</p>
          <button class="btn btn-dark" @click="abaAtiva = 'briefing'">Continuar briefing</button>
        </template>
        <template v-else-if="tarefasPendentes > 0">
          <h2>Avance na produção</h2>
          <p>Você tem {{ tarefasPendentes }} tarefa(s) pendente(s) neste projeto.</p>
          <button class="btn btn-dark" @click="abaAtiva = 'tarefas'">Ver tarefas</button>
        </template>
        <template v-else-if="valorAReceber > 0">
          <h2>Acompanhe o pagamento</h2>
          <p>Há {{ brl(valorAReceber) }} do valor combinado ainda não registrado como recebido.</p>
          <button class="btn btn-dark" @click="abaAtiva = 'financeiro'">Ver financeiro</button>
        </template>
        <template v-else>
          <h2>Atividades em dia</h2>
          <p>Revise as informações do projeto e acompanhe a entrega.</p>
        </template>
      </div>
      <div class="project-overview-shortcuts">
        <button class="surface project-overview-option" @click="abaAtiva = 'briefing'"><b>Briefing</b><span>{{ briefingProgressValue.complete }} de {{ briefingProgressValue.total }} respostas obrigatórias</span><small>Abrir questionário →</small></button>
        <button class="surface project-overview-option" @click="abaAtiva = 'tarefas'"><b>Produção</b><span>{{ tasks.length - tarefasPendentes }} de {{ tasks.length }} tarefas concluídas</span><small>Abrir tarefas →</small></button>
        <button class="surface project-overview-option" @click="abaAtiva = 'financeiro'"><b>Financeiro</b><span>{{ brl(valorAReceber) }} a receber</span><small>Saldo realizado: {{ brl(received - spent) }} →</small></button>
      </div>
    </section>

    <section v-if="abaAtiva === 'briefing' && projectBriefing" class="surface project-briefing"><header class="project-briefing-header"><div><p class="section-kicker">BRIEFING DESTE PROJETO</p><h2>{{ projectBriefing.templateName }}</h2><p>{{ briefingProgressValue.complete }} de {{ briefingProgressValue.total }} campos obrigatórios respondidos</p></div><span class="brief-tag">{{ projectBriefing.sections.length }} seções</span></header>
      <nav class="briefing-sections-nav" aria-label="Seções do questionário">
        <button v-for="(secao, indice) in projectBriefing.sections" :key="secao.id" class="briefing-section-button" :class="{ ativo: secaoBriefingAtiva === secao.id }" :aria-current="secaoBriefingAtiva === secao.id ? 'step' : undefined" @click="secaoBriefingAtiva = secao.id">{{ indice + 1 }}. {{ secao.title }}</button>
      </nav>
      <form @submit.prevent="saveBriefing(false)"><section v-for="section in projectBriefing.sections" v-show="secaoBriefingAtiva === section.id" :key="section.id" class="project-briefing-section"><div class="project-briefing-section-heading"><h3>{{ section.title }}</h3><p v-if="section.description">{{ section.description }}</p></div><div class="project-briefing-questions">
        <template v-for="question in section.questions" :key="question.id"><fieldset v-if="visibleQuestion(question)" class="project-briefing-question"><legend>{{ question.label }} <span v-if="question.required" class="required-mark">Obrigatória</span></legend>
          <textarea v-if="question.type === 'long-text'" :id="`answer-${question.id}`" :value="scalarAnswer(question.id)" rows="3" @input="setScalarAnswer(question.id, $event)"/>
          <select v-else-if="question.type === 'single-choice' || question.type === 'yes-no'" :id="`answer-${question.id}`" :value="scalarAnswer(question.id)" @change="setScalarAnswer(question.id, $event)"><option value="">Selecione uma opção</option><option v-for="option in (question.type === 'yes-no' ? ['Sim', 'Não'] : question.options)" :key="option" :value="option">{{ option }}</option></select>
          <div v-else-if="question.type === 'multiple-choice'" class="briefing-answer-options"><label v-for="option in question.options" :key="option"><input type="checkbox" :checked="selectedAnswers(question.id).includes(option)" @change="toggleAnswer(question.id, option, ($event.target as HTMLInputElement).checked)"/>{{ option }}</label></div>
          <input v-else :id="`answer-${question.id}`" :type="question.type === 'short-text' ? 'text' : question.type" :value="scalarAnswer(question.id)" @input="setScalarAnswer(question.id, $event)"/>
          <small v-if="question.example" class="briefing-answer-example">{{ question.example }}</small>
        </fieldset></template>
      </div></section><p v-if="briefingError" class="form-error" role="alert">{{ briefingError }}</p><p v-if="briefingFeedback" class="inline-notice" role="status">{{ briefingFeedback }}</p><div class="project-briefing-actions"><small>{{ briefingDirty ? 'Alterações ainda não salvas. ' : briefingSavedAt ? `Salvo às ${briefingSavedAt}. ` : '' }}Rascunhos podem ser salvos antes de preencher todos os campos obrigatórios.</small><div class="row-actions"><button class="btn btn-outline" type="button" @click="saveBriefing(true)">Salvar e continuar</button><button class="btn btn-dark" type="submit">Salvar respostas</button></div></div></form>
    </section>
    <div v-else-if="abaAtiva === 'briefing'" class="surface empty compact"><ClipboardList :size="22"/><b>Briefing não encontrado</b><p>Confira o vínculo do projeto ou escolha um modelo em Serviços.</p></div>

    
    <section v-if="abaAtiva === 'materiais'" class="surface detail-section project-materials">
      <div class="section-top">
        <div><p class="section-kicker">LINKS DESTE PROJETO</p><h2>Materiais e ferramentas</h2></div>
        <button class="btn btn-outline btn-slim" type="button" @click="createMaterial"><Plus :size="15"/> Adicionar link</button>
      </div>
      <p class="project-materials-description">Organize questionários do Tally, referências, Figma, Canva, pastas do Drive, documentos e entregas. Esta área guarda links, não arquivos enviados.</p>
      <p v-if="materialFeedback" class="inline-notice" role="status">{{ materialFeedback }}</p>
      <p v-if="materialError" class="form-error" role="alert">{{ materialError }}</p>
      <div v-if="materials.length" class="project-materials-list">
        <article v-for="material in materials" :key="material.id" class="project-material-card">
          <div class="project-material-card-main"><span class="section-kicker">{{ materialCategoryName(material.category) }}</span><h3>{{ material.name }}</h3><p v-if="material.notes">{{ material.notes }}</p><small class="project-material-url">{{ material.url }}</small></div>
          <div class="row-actions project-material-actions">
            <a class="btn btn-outline btn-slim" :href="material.url" target="_blank" rel="noopener noreferrer" :aria-label="`Abrir link ${material.name} em outra aba`"><ExternalLink :size="15"/> Abrir link</a>
            <button type="button" class="icon-button" :aria-label="`Editar ${material.name}`" @click="editMaterial(material)"><Pencil :size="15"/></button>
            <button type="button" class="icon-button danger" :aria-label="`Excluir ${material.name}`" @click="dropMaterial(material)"><Trash2 :size="15"/></button>
          </div>
        </article>
      </div>
      <div v-else class="empty compact"><Link2 :size="25"/><b>Nenhum link cadastrado neste projeto</b><p>Adicione um questionário, pasta, referência ou link de entrega para encontrá-lo facilmente depois.</p><button type="button" class="btn btn-outline" @click="createMaterial">Adicionar primeiro link</button></div>
    </section>

    <div v-if="abaAtiva === 'tarefas' || abaAtiva === 'financeiro'" class="detail-grid project-tab-content">
      <section v-if="abaAtiva === 'tarefas'" class="surface detail-section"><div class="section-top"><div><p class="section-kicker">PRODUÇÃO</p><h2>Tarefas</h2></div><button class="btn btn-outline btn-slim" @click="createTask"><Plus :size="15"/> Nova tarefa</button></div>
        <div v-if="tasks.length" class="detail-list"><article v-for="task in tasks" :key="task.id" class="detail-row" :class="{ 'done-task': task.done }"><label><input :checked="task.done" type="checkbox" @change="toggleTask(task.id, ($event.target as HTMLInputElement).checked)"/><span>{{ task.title }}</span></label><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${task.title}`" @click="editTask(task.id)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${task.title}`" @click="dropTask(task.id)"><Trash2 :size="15"/></button></div></article></div><div v-else class="empty compact"><CheckCircle2 :size="22"/><b>Nenhuma tarefa vinculada</b><p>Crie a próxima ação deste projeto.</p></div>
      </section>
      <section v-if="abaAtiva === 'financeiro'" class="surface detail-section"><div class="section-top"><div><p class="section-kicker">FLUXO DE CAIXA</p><h2>Recebimentos e despesas</h2></div><div class="row-actions"><button class="btn btn-outline btn-slim" @click="createTransaction('entrada')"><ArrowDownLeft :size="15"/> Recebimento</button><button class="btn btn-outline btn-slim" @click="createTransaction('saida')"><ArrowUpRight :size="15"/> Despesa</button></div></div>
        <div v-if="transactions.length" class="detail-list"><article v-for="transaction in transactions" :key="transaction.id" class="detail-row"><div class="transaction-description"><span class="pill" :class="transaction.kind">{{ transaction.kind === 'entrada' ? 'Entrada' : 'Saída' }}</span><div><b>{{ transaction.description }}</b><small>{{ dateBR(transaction.date) }}</small></div></div><strong :class="transaction.kind === 'entrada' ? 'positive' : 'negative'">{{ brl(transaction.amount) }}</strong><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${transaction.description}`" @click="editTransaction(transaction)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${transaction.description}`" @click="dropTransaction(transaction.id)"><Trash2 :size="15"/></button></div></article></div><div v-else class="empty compact"><Wallet :size="22"/><b>Nenhum lançamento vinculado</b><p>Registre recebimentos ou despesas deste projeto.</p></div>
      </section>
    </div>

    <Teleport to="body"><div v-if="openMaterialForm" class="modal-backdrop" @click.self="openMaterialForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="material-modal-title">
      <div class="modal-head"><h2 id="material-modal-title">{{ editingMaterialId ? 'Editar material ou ferramenta' : 'Adicionar material ou ferramenta' }}</h2><button type="button" class="icon-button" aria-label="Fechar" @click="openMaterialForm = false">✕</button></div>
      <form @submit.prevent="saveMaterial">
        <div class="field"><label for="material-name">Nome *</label><input id="material-name" v-model="materialForm.name" maxlength="120" required autofocus placeholder="Ex.: Briefing do Tally"/></div>
        <div class="field"><label for="material-category">Categoria *</label><select id="material-category" v-model="materialForm.category"><option v-for="category in projectMaterialCategories" :key="category.value" :value="category.value">{{ category.label }}</option></select></div>
        <div class="field"><label for="material-url">Link (https://...) *</label><input id="material-url" v-model="materialForm.url" type="url" maxlength="2000" required placeholder="https://..."/><small>Use links acessíveis por HTTP ou HTTPS. Não cole senhas ou tokens nesta área.</small></div>
        <div class="field"><label for="material-notes">Observações</label><textarea id="material-notes" v-model="materialForm.notes" maxlength="1000" rows="3" placeholder="Descreva como este material será usado"/></div>
        <p v-if="materialError" class="form-error" role="alert">{{ materialError }}</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" @click="openMaterialForm = false">Cancelar</button><button type="submit" class="btn btn-dark">Salvar link</button></div>
      </form>
    </div></div></Teleport>

    <Teleport to="body"><div v-if="openProjectForm" class="modal-backdrop" @click.self="openProjectForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-project-title"><div class="modal-head"><h2 id="detail-project-title">Editar projeto</h2><button class="icon-button" aria-label="Fechar" @click="openProjectForm = false">✕</button></div><form @submit.prevent="saveProject"><div class="field"><label for="dp-name">Nome *</label><input id="dp-name" v-model="projectForm.name" required maxlength="140" autofocus/></div><div class="field"><label for="dp-client">Cliente *</label><input id="dp-client" v-model="projectForm.client" required maxlength="120"/></div><div class="field"><label for="dp-service">Serviço</label><select id="dp-service" v-model="projectForm.serviceId"><option value="">Sem vínculo de serviço</option><option v-for="item in state.services" :key="item.id" :value="item.id">{{ item.name }}</option></select><small>Alterar o serviço não substitui as tarefas nem as respostas já vinculadas ao projeto.</small></div><div class="form-row"><div class="field"><label for="dp-status">Status</label><select id="dp-status" v-model="projectForm.status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="revisao">Em revisão</option><option value="entregue">Entregue</option></select></div><div class="field"><label for="dp-deadline">Prazo</label><input id="dp-deadline" v-model="projectForm.deadline" type="date" required/></div></div><div class="field"><label for="dp-value">Preço combinado (R$)</label><input id="dp-value" v-model.number="projectForm.value" type="number" min="0" step="0.01" required/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openProjectForm = false">Cancelar</button><button class="btn btn-dark">Salvar alterações</button></div></form></div></div></Teleport>

    <Teleport to="body"><div v-if="openTaskForm" class="modal-backdrop" @click.self="openTaskForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-task-title"><div class="modal-head"><h2 id="detail-task-title">{{ editingTaskId ? 'Editar tarefa' : 'Nova tarefa do projeto' }}</h2><button class="icon-button" aria-label="Fechar" @click="openTaskForm = false">✕</button></div><form @submit.prevent="saveTask"><div class="field"><label for="dt-title">Tarefa *</label><input id="dt-title" v-model="taskForm.title" required maxlength="180" autofocus/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openTaskForm = false">Cancelar</button><button class="btn btn-dark">Salvar tarefa</button></div></form></div></div></Teleport>

    <Teleport to="body"><div v-if="openTransactionForm" class="modal-backdrop" @click.self="openTransactionForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-transaction-title"><div class="modal-head"><h2 id="detail-transaction-title">{{ editingTransactionId ? 'Editar lançamento' : transactionForm.kind === 'entrada' ? 'Novo recebimento' : 'Nova despesa' }}</h2><button class="icon-button" aria-label="Fechar" @click="openTransactionForm = false">✕</button></div><form @submit.prevent="saveTransaction"><div class="field"><label for="dt-description">Descrição *</label><input id="dt-description" v-model="transactionForm.description" required maxlength="150" autofocus/></div><div class="form-row"><div class="field"><label for="dt-kind">Tipo</label><select id="dt-kind" v-model="transactionForm.kind"><option value="entrada">Entrada / recebimento</option><option value="saida">Saída / despesa</option></select></div><div class="field"><label for="dt-amount">Valor (R$) *</label><input id="dt-amount" v-model.number="transactionForm.amount" type="number" min="0.01" step="0.01" required/></div></div><div class="field"><label for="dt-date">Data *</label><input id="dt-date" v-model="transactionForm.date" type="date" required/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openTransactionForm = false">Cancelar</button><button class="btn btn-dark">Salvar lançamento</button></div></form></div></div></Teleport>
  </div>
  <div v-else class="surface empty"><FolderKanban :size="27"/><b>Projeto não encontrado</b><p>Ele pode ter sido removido ou o backup importado não contém mais esse registro.</p><button class="btn btn-outline" @click="emit('go', 'projects')">Voltar aos projetos</button></div>
</template>
