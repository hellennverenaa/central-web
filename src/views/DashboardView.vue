<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, ArrowDownRight, UsersRound, FolderKanban, Wallet, TrendingUp, ChevronRight, CircleDot, CheckCircle2 } from 'lucide-vue-next'
import { state, metrics } from '../lib/store'
import { brl, dateBR, leadLabels, projectLabels } from '../lib/format'
import type { LeadStage, ProjectStatus } from '../lib/types'

defineEmits<{ go: [page: 'dashboard' | 'leads' | 'projects' | 'finance' | 'tasks' | 'data' | 'plan' | 'services' | 'publications' | 'briefing']; openProject: [id: string] }>()
const openProjects = computed(() => state.projects.filter(p => p.status !== 'entregue').slice(0, 4))
const freshLeads = computed(() => state.leads.filter(l => l.stage !== 'perdido').slice(0, 4))
const nextPlan = computed(() => state.plan.filter(t => t.status !== 'concluido').slice(0,3))
const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'
</script>

<template>
  <div class="view-enter">
    <div class="page-intro overview-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> PAINEL DE CONTROLE</p><h1>{{ greeting }} <span class="wave">✳</span></h1><p class="page-subtitle">Tudo o que importa para o seu estúdio, em um só lugar.</p></div><button class="btn btn-dark" @click="$emit('go','leads')">Nova oportunidade <ArrowUpRight :size="17"/></button></div>
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-head"><span>Oportunidades abertas</span><div class="stat-icon tint-purple"><UsersRound :size="18" /></div></div><div class="stat-val">{{ metrics.leads.toString().padStart(2, '0') }}</div><small>Contatos em negociação</small></article>
      <article class="stat-card"><div class="stat-head"><span>Projetos ativos</span><div class="stat-icon tint-blue"><FolderKanban :size="18" /></div></div><div class="stat-val">{{ metrics.activeProjects.toString().padStart(2, '0') }}</div><small>Em planejamento ou execução</small></article>
      <article class="stat-card"><div class="stat-head"><span>Recebimentos</span><div class="stat-icon tint-green"><Wallet :size="18" /></div></div><div class="stat-val money-val">{{ brl(metrics.income) }}</div><small>Entradas registradas</small></article>
      <article class="stat-card"><div class="stat-head"><span>Saldo registrado</span><div class="stat-icon tint-yellow"><TrendingUp :size="18" /></div></div><div class="stat-val money-val">{{ brl(metrics.balance) }}</div><small>Entradas − saídas (histórico total)</small></article>
    </div>
    <div class="summary-strip">
      <button class="surface summary-link" @click="$emit('go','plan')"><span>PLANO DE LANÇAMENTO</span><strong>{{ metrics.planDone }} / {{ metrics.planTotal }}</strong><small>Ações concluídas · abrir roteiro →</small></button>
      <button class="surface summary-link" @click="$emit('go','services')"><span>CATÁLOGO DE SERVIÇOS</span><strong>{{ metrics.serviceCount }}</strong><small>Pacotes com preço simulável →</small></button>
      <button class="surface summary-link" @click="$emit('go','publications')"><span>CONTEÚDOS PENDENTES</span><strong>{{ metrics.scheduledPosts }}</strong><small>Ideias para publicar →</small></button>
    </div>
    <div class="dashboard-grid">
      <section class="surface surface-main"><div class="section-top"><div><p class="section-kicker">ACOMPANHAMENTO</p><h2>Projetos em andamento</h2></div><button class="text-link" @click="$emit('go','projects')">Ver todos <ChevronRight :size="16" /></button></div>
        <div v-if="openProjects.length" class="stack-list"><div v-for="project in openProjects" :key="project.id" class="project-row"><div class="project-avatar"><FolderKanban :size="18"/></div><div class="project-meta"><button class="dashboard-row-link" @click="$emit('openProject', project.id)">{{ project.name }}</button><span>{{ project.client }} · prazo {{ dateBR(project.deadline) }}</span></div><span class="pill" :class="project.status">{{ projectLabels[project.status as ProjectStatus] }}</span></div></div>
        <div v-else class="empty compact"><CircleDot :size="23"/><b>Seu primeiro projeto começa aqui.</b><p>Cadastre um trabalho em andamento para acompanhar prazos e entregas.</p><button class="btn btn-outline" @click="$emit('go','projects')">Adicionar projeto</button></div>
      </section>
      <section class="surface"><div class="section-top"><div><p class="section-kicker">PIPELINE COMERCIAL</p><h2>Novos contatos</h2></div><button class="text-link" @click="$emit('go','leads')">Ver CRM <ChevronRight :size="16" /></button></div>
        <div v-if="freshLeads.length" class="stack-list"><div v-for="lead in freshLeads" :key="lead.id" class="lead-row"><div class="initial-avatar">{{ lead.name.slice(0,1).toUpperCase() }}</div><div class="project-meta"><b>{{ lead.name }}</b><span>{{ lead.service }}</span></div><span class="pill" :class="lead.stage">{{ leadLabels[lead.stage as LeadStage] }}</span></div></div>
        <div v-else class="empty compact"><UsersRound :size="23"/><b>Seu pipeline está pronto.</b><p>Salve pessoas e negócios que você pretende abordar.</p><button class="btn btn-outline" @click="$emit('go','leads')">Novo contato</button></div>
      </section>
      <section class="surface task-highlight"><div class="section-top"><div><p class="section-kicker">PRÓXIMAS AÇÕES DO LANÇAMENTO</p><h2>Seu roteiro</h2></div><button class="text-link" @click="$emit('go','plan')">Ver plano <ChevronRight :size="16" /></button></div>
        <div v-if="nextPlan.length" class="task-preview"><div v-for="task in nextPlan" :key="task.id"><span class="task-circle"></span><span>{{ task.title }} <small>({{task.week}})</small></span></div></div>
        <div v-else class="empty compact"><CheckCircle2 :size="23"/><b>Roteiro concluído!</b><p>Revise os próximos passos e acompanhe seus clientes.</p></div>
      </section>
      <section class="insight-box"><div class="insight-top"><span>EM NEGOCIAÇÃO</span><ArrowUpRight :size="18"/></div><div class="insight-amount">{{ brl(metrics.pipeline) }}</div><p>Valor estimado das propostas e oportunidades abertas. <b>Não representa faturamento confirmado.</b></p><div class="insight-divider"></div><div class="insight-bottom"><span>Despesas registradas</span><span><ArrowDownRight :size="14"/> {{ brl(metrics.expenses) }}</span></div></section>
    </div>
  </div>
</template>
