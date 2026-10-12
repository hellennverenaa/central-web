<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, FolderKanban, Pencil, Plus, Trash2, Wallet } from 'lucide-vue-next'
import { state, addTask, addTransaction, persistenceError, removeItem, updateProject, updateTask, updateTransaction } from '../lib/store'
import { brl, dateBR, projectLabels, todayLocal } from '../lib/format'
import { serviceSuggestion } from '../lib/pricing'
import type { ProjectStatus, Transaction, TransactionType } from '../lib/types'

type MainPage = 'projects' | 'leads' | 'services' | 'finance' | 'tasks'
const props = defineProps<{ projectId: string; notice?: string }>()
const emit = defineEmits<{ go: [page: MainPage]; openLead: [id: string]; openService: [id: string] }>()
const project = computed(() => state.projects.find(item => item.id === props.projectId) ?? null)
const sourceLead = computed(() => project.value?.sourceLeadId ? state.leads.find(lead => lead.id === project.value?.sourceLeadId) ?? null : null)
const service = computed(() => project.value?.serviceId ? state.services.find(item => item.id === project.value?.serviceId) ?? null : null)
const tasks = computed(() => state.tasks.filter(task => task.projectId === props.projectId))
const transactions = computed(() => state.transactions.filter(item => item.projectId === props.projectId))
const received = computed(() => transactions.value.filter(item => item.kind === 'entrada').reduce((sum, item) => sum + item.amount, 0))
const spent = computed(() => transactions.value.filter(item => item.kind === 'saida').reduce((sum, item) => sum + item.amount, 0))
const openProjectForm = ref(false)
const openTaskForm = ref(false)
const openTransactionForm = ref(false)
const editingTaskId = ref<string | null>(null)
const editingTransactionId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const projectForm = reactive({ name: '', client: '', serviceId: '', status: 'planejado' as ProjectStatus, deadline: todayLocal(), value: 0 })
const taskForm = reactive({ title: '' })
const transactionForm = reactive({ description: '', kind: 'entrada' as TransactionType, amount: 0, date: todayLocal() })

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
      <article class="surface project-value-card"><span>SALDO DO PROJETO</span><strong :class="received - spent < 0 ? 'negative' : 'positive'">{{ brl(received - spent) }}</strong><small>Recebimentos menos despesas registradas.</small></article>
    </div>

    <div class="project-relations surface"><div><span class="section-kicker">OPORTUNIDADE DE ORIGEM</span><template v-if="sourceLead"><button class="table-link strong" @click="emit('openLead', sourceLead.id)">{{ sourceLead.name }} <ArrowRight :size="14"/></button><small>Estimativa do pipeline: {{ brl(sourceLead.value) }}</small></template><span v-else class="relation-empty">Projeto criado sem oportunidade vinculada.</span></div><div><span class="section-kicker">SERVIÇO</span><template v-if="service"><button class="table-link strong" @click="emit('openService', service.id)">{{ service.name }} <ArrowRight :size="14"/></button><small>Referência simulada: {{ brl(serviceSuggestion(service)) }}</small></template><span v-else class="relation-empty">Nenhum serviço vinculado.</span></div></div>

    <div class="detail-grid">
      <section class="surface detail-section"><div class="section-top"><div><p class="section-kicker">PRODUÇÃO</p><h2>Tarefas</h2></div><button class="btn btn-outline btn-slim" @click="createTask"><Plus :size="15"/> Nova tarefa</button></div>
        <div v-if="tasks.length" class="detail-list"><article v-for="task in tasks" :key="task.id" class="detail-row" :class="{ 'done-task': task.done }"><label><input :checked="task.done" type="checkbox" @change="toggleTask(task.id, ($event.target as HTMLInputElement).checked)"/><span>{{ task.title }}</span></label><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${task.title}`" @click="editTask(task.id)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${task.title}`" @click="dropTask(task.id)"><Trash2 :size="15"/></button></div></article></div><div v-else class="empty compact"><CheckCircle2 :size="22"/><b>Nenhuma tarefa vinculada</b><p>Crie a próxima ação deste projeto.</p></div>
      </section>
      <section class="surface detail-section"><div class="section-top"><div><p class="section-kicker">FLUXO DE CAIXA</p><h2>Recebimentos e despesas</h2></div><div class="row-actions"><button class="btn btn-outline btn-slim" @click="createTransaction('entrada')"><ArrowDownLeft :size="15"/> Recebimento</button><button class="btn btn-outline btn-slim" @click="createTransaction('saida')"><ArrowUpRight :size="15"/> Despesa</button></div></div>
        <div v-if="transactions.length" class="detail-list"><article v-for="transaction in transactions" :key="transaction.id" class="detail-row"><div class="transaction-description"><span class="pill" :class="transaction.kind">{{ transaction.kind === 'entrada' ? 'Entrada' : 'Saída' }}</span><div><b>{{ transaction.description }}</b><small>{{ dateBR(transaction.date) }}</small></div></div><strong :class="transaction.kind === 'entrada' ? 'positive' : 'negative'">{{ brl(transaction.amount) }}</strong><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${transaction.description}`" @click="editTransaction(transaction)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${transaction.description}`" @click="dropTransaction(transaction.id)"><Trash2 :size="15"/></button></div></article></div><div v-else class="empty compact"><Wallet :size="22"/><b>Nenhum lançamento vinculado</b><p>Registre recebimentos ou despesas deste projeto.</p></div>
      </section>
    </div>

    <Teleport to="body"><div v-if="openProjectForm" class="modal-backdrop" @click.self="openProjectForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-project-title"><div class="modal-head"><h2 id="detail-project-title">Editar projeto</h2><button class="icon-button" aria-label="Fechar" @click="openProjectForm = false">✕</button></div><form @submit.prevent="saveProject"><div class="field"><label for="dp-name">Nome *</label><input id="dp-name" v-model="projectForm.name" required maxlength="140" autofocus/></div><div class="field"><label for="dp-client">Cliente *</label><input id="dp-client" v-model="projectForm.client" required maxlength="120"/></div><div class="field"><label for="dp-service">Serviço</label><select id="dp-service" v-model="projectForm.serviceId"><option value="">Sem vínculo de serviço</option><option v-for="item in state.services" :key="item.id" :value="item.id">{{ item.name }}</option></select></div><div class="form-row"><div class="field"><label for="dp-status">Status</label><select id="dp-status" v-model="projectForm.status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="revisao">Em revisão</option><option value="entregue">Entregue</option></select></div><div class="field"><label for="dp-deadline">Prazo</label><input id="dp-deadline" v-model="projectForm.deadline" type="date" required/></div></div><div class="field"><label for="dp-value">Preço combinado (R$)</label><input id="dp-value" v-model.number="projectForm.value" type="number" min="0" step="0.01" required/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openProjectForm = false">Cancelar</button><button class="btn btn-dark">Salvar alterações</button></div></form></div></div></Teleport>

    <Teleport to="body"><div v-if="openTaskForm" class="modal-backdrop" @click.self="openTaskForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-task-title"><div class="modal-head"><h2 id="detail-task-title">{{ editingTaskId ? 'Editar tarefa' : 'Nova tarefa do projeto' }}</h2><button class="icon-button" aria-label="Fechar" @click="openTaskForm = false">✕</button></div><form @submit.prevent="saveTask"><div class="field"><label for="dt-title">Tarefa *</label><input id="dt-title" v-model="taskForm.title" required maxlength="180" autofocus/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openTaskForm = false">Cancelar</button><button class="btn btn-dark">Salvar tarefa</button></div></form></div></div></Teleport>

    <Teleport to="body"><div v-if="openTransactionForm" class="modal-backdrop" @click.self="openTransactionForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-transaction-title"><div class="modal-head"><h2 id="detail-transaction-title">{{ editingTransactionId ? 'Editar lançamento' : transactionForm.kind === 'entrada' ? 'Novo recebimento' : 'Nova despesa' }}</h2><button class="icon-button" aria-label="Fechar" @click="openTransactionForm = false">✕</button></div><form @submit.prevent="saveTransaction"><div class="field"><label for="dt-description">Descrição *</label><input id="dt-description" v-model="transactionForm.description" required maxlength="150" autofocus/></div><div class="form-row"><div class="field"><label for="dt-kind">Tipo</label><select id="dt-kind" v-model="transactionForm.kind"><option value="entrada">Entrada / recebimento</option><option value="saida">Saída / despesa</option></select></div><div class="field"><label for="dt-amount">Valor (R$) *</label><input id="dt-amount" v-model.number="transactionForm.amount" type="number" min="0.01" step="0.01" required/></div></div><div class="field"><label for="dt-date">Data *</label><input id="dt-date" v-model="transactionForm.date" type="date" required/></div><p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="openTransactionForm = false">Cancelar</button><button class="btn btn-dark">Salvar lançamento</button></div></form></div></div></Teleport>
  </div>
  <div v-else class="surface empty"><FolderKanban :size="27"/><b>Projeto não encontrado</b><p>Ele pode ter sido removido ou o backup importado não contém mais esse registro.</p><button class="btn btn-outline" @click="emit('go', 'projects')">Voltar aos projetos</button></div>
</template>
