<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, ListTodo, RefreshCcw, UsersRound, Wallet } from 'lucide-vue-next'
import { state } from '../lib/store'
import { todayLocal } from '../lib/format'
import { buildTodayActions, type TodayAction, type TodayPriority, type TodayProjectTab } from '../lib/todayActions'

const emit = defineEmits<{
  openProject: [id: string, tab: TodayProjectTab]
  resumeAttendance: [id: string]
  openTasks: []
  newAttendance: []
}>()

const date = ref(todayLocal())
const filter = ref<'todos' | TodayPriority>('todos')
const actions = computed(() => buildTodayActions(state, date.value))
const visibleActions = computed(() => actions.value.filter(action => filter.value === 'todos' || action.priority === filter.value))
const urgent = computed(() => actions.value.filter(action => action.priority === 'urgente').length)
const next = computed(() => actions.value.filter(action => action.priority === 'proximo').length)
const followups = computed(() => actions.value.filter(action => action.priority === 'acompanhar').length)
const dateLabel = computed(() => {
  const [year, month, day] = date.value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(year!, month! - 1, day))
})
const priorityLabels: Record<TodayPriority, string> = {
  urgente: 'Precisa de atenção', proximo: 'Próximo passo', acompanhar: 'Acompanhar',
}
const kinds = {
  prazo: CalendarClock,
  briefing: ClipboardList,
  producao: ListTodo,
  financeiro: Wallet,
  comercial: UsersRound,
  avulsa: CheckCircle2,
}
function openAction(action: TodayAction) {
  if (action.target === 'project') emit('openProject', action.entityId, action.tab)
  else if (action.target === 'lead') emit('resumeAttendance', action.entityId)
  else emit('openTasks')
}
function updateToday() { date.value = todayLocal() }
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { updateToday(); timer = setInterval(updateToday, 60_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="view-enter">
    <div class="page-intro today-intro">
      <div><p class="eyebrow"><span class="eyebrow-line"></span> ACOMPANHAMENTO DO ESTÚDIO</p><h1>Hoje</h1><p class="page-subtitle">{{ dateLabel }} · Próximos passos calculados a partir dos seus registros.</p></div>
      <button type="button" class="btn btn-outline" @click="updateToday"><RefreshCcw :size="16"/> Atualizar</button>
    </div>
    <div class="today-overview">
      <button type="button" class="surface today-overview-card" :aria-pressed="filter === 'urgente'" @click="filter = filter === 'urgente' ? 'todos' : 'urgente'"><span>PRECISAM DE ATENÇÃO</span><strong>{{ urgent }}</strong><small>Prazos vencidos ou para hoje e pendências especiais</small></button>
      <button type="button" class="surface today-overview-card" :aria-pressed="filter === 'proximo'" @click="filter = filter === 'proximo' ? 'todos' : 'proximo'"><span>PRÓXIMOS PASSOS</span><strong>{{ next }}</strong><small>Briefings, produção e prazos próximos</small></button>
      <button type="button" class="surface today-overview-card" :aria-pressed="filter === 'acompanhar'" @click="filter = filter === 'acompanhar' ? 'todos' : 'acompanhar'"><span>ACOMPANHAR</span><strong>{{ followups }}</strong><small>Negociações, tarefas pessoais e valores a conferir</small></button>
    </div>

    <div class="today-list-header"><div><h2>{{ filter === 'todos' ? 'Suas próximas ações' : priorityLabels[filter] }}</h2><p>Um próximo passo principal por projeto, atualizado conforme briefing, tarefas, prazo e registros financeiros mudam.</p></div><button v-if="filter !== 'todos'" type="button" class="text-link" @click="filter = 'todos'">Ver todas as ações</button></div>
    <div v-if="visibleActions.length" class="today-action-list">
      <article v-for="action in visibleActions" :key="action.id" class="surface today-action-card">
        <div class="today-action-icon"><component :is="kinds[action.kind]" :size="21"/></div>
        <div class="today-action-main">
          <p class="today-action-meta">{{ priorityLabels[action.priority] }} · {{ action.target === 'project' ? 'Projeto' : action.target === 'lead' ? 'Oportunidade' : 'Tarefa avulsa' }}</p>
          <h3>{{ action.title }}</h3><strong>{{ action.subject }}</strong><p>{{ action.description }}</p>
        </div>
        <button class="btn btn-outline btn-slim today-action-link" type="button" @click="openAction(action)">{{ action.cta }} <ArrowRight :size="15"/></button>
      </article>
    </div>
    <div v-else class="surface empty today-empty">
      <CheckCircle2 :size="29"/><b>{{ actions.length ? 'Nada nesta categoria por enquanto' : 'Nenhuma pendência identificada' }}</b>
      <p>{{ actions.length ? 'Experimente ver todas as ações para continuar acompanhando os outros projetos.' : 'Não há oportunidades abertas, tarefas pendentes ou projetos com próximos passos identificáveis nos registros atuais.' }}</p>
      <button v-if="actions.length" class="btn btn-outline" type="button" @click="filter = 'todos'">Ver todas as ações</button>
      <button v-else class="btn btn-outline" type="button" @click="emit('newAttendance')">Iniciar atendimento</button>
    </div>
    <p class="today-footer-note">“Hoje” é uma lista de acompanhamento, não uma agenda com datas inventadas. A Central não cria tarefas, cobra clientes nem registra pagamentos automaticamente.</p>
  </div>
</template>
