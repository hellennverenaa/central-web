<script setup lang="ts">
import { computed, ref } from 'vue'
import { LayoutDashboard, UsersRound, FolderKanban, Wallet, CheckSquare2, DatabaseBackup, Menu, X, ArrowUpRight, Sparkles, LockKeyhole, CalendarRange, BadgeDollarSign, Megaphone, ClipboardList } from 'lucide-vue-next'
import DashboardView from './views/DashboardView.vue'
import LeadsView from './views/LeadsView.vue'
import ProjectsView from './views/ProjectsView.vue'
import FinanceView from './views/FinanceView.vue'
import TasksView from './views/TasksView.vue'
import DataView from './views/DataView.vue'
import PlanView from './views/PlanView.vue'
import ServicesView from './views/ServicesView.vue'
import PublicationsView from './views/PublicationsView.vue'
import BriefingView from './views/BriefingView.vue'
import ProjectDetailView from './views/ProjectDetailView.vue'
import { persistenceError, state } from './lib/store'

type MainPage = 'dashboard' | 'plan' | 'services' | 'leads' | 'projects' | 'finance' | 'publications' | 'briefing' | 'tasks' | 'data'
type Page = MainPage | 'project-detail'
const page = ref<Page>('dashboard')
const mobileNav = ref(false)
const selectedProjectId = ref('')
const projectNotice = ref('')
const focusedLeadId = ref('')
const focusedServiceId = ref('')
const nav = [
  { id: 'dashboard' as MainPage, text: 'Visão geral', icon: LayoutDashboard },
  { id: 'plan' as MainPage, text: 'Plano de lançamento', icon: CalendarRange },
  { id: 'services' as MainPage, text: 'Serviços e preços', icon: BadgeDollarSign },
  { id: 'leads' as MainPage, text: 'Oportunidades', icon: UsersRound },
  { id: 'projects' as MainPage, text: 'Projetos', icon: FolderKanban },
  { id: 'finance' as MainPage, text: 'Financeiro', icon: Wallet },
  { id: 'publications' as MainPage, text: 'Publicações', icon: Megaphone },
  { id: 'briefing' as MainPage, text: 'Briefing', icon: ClipboardList },
  { id: 'tasks' as MainPage, text: 'Tarefas', icon: CheckSquare2 },
  { id: 'data' as MainPage, text: 'Dados & backup', icon: DatabaseBackup },
]
const title = computed(() => page.value === 'project-detail' ? state.projects.find(project => project.id === selectedProjectId.value)?.name || 'Detalhe do projeto' : nav.find(item => item.id === page.value)?.text || 'Central')
const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
function navigate(next: MainPage) { page.value = next; mobileNav.value = false }
function openProject(id: string, notice = '') { selectedProjectId.value = id; projectNotice.value = notice; page.value = 'project-detail'; mobileNav.value = false }
function openLead(id: string) { focusedLeadId.value = id; page.value = 'leads'; mobileNav.value = false }
function openService(id: string) { focusedServiceId.value = id; page.value = 'services'; mobileNav.value = false }
</script>

<template>
  <div class="app-shell">
    <div v-if="mobileNav" class="scrim" @click="mobileNav = false"></div>
    <aside class="sidebar" :class="{ 'sidebar-open': mobileNav }">
      <div class="brand">
        <div class="brand-icon"><Sparkles :size="19" :stroke-width="2.5" /></div>
        <div><strong>central<span class="brand-dot">.</span></strong><small>WORKSPACE / 01</small></div>
        <button class="icon-button close-mobile" aria-label="Fechar menu" @click="mobileNav = false"><X :size="19"/></button>
      </div>
      <p class="nav-eyebrow">MENU PRINCIPAL</p>
      <nav aria-label="Navegação principal" class="nav">
        <button v-for="item in nav" :key="item.id" class="nav-item" :class="{ selected: page === item.id }" :aria-current="page === item.id ? 'page' : undefined" @click="navigate(item.id)">
          <component :is="item.icon" :size="18" :stroke-width="1.9" /> <span>{{ item.text }}</span>
          <span v-if="page === item.id" class="nav-marker"></span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-quote"><div class="tiny-icon"><ArrowUpRight :size="16" /></div><b>Do código ao negócio.</b><p>Um espaço só seu para organizar o que está construindo.</p></div>
        <div class="personal"><div class="avatar">DEV</div><div><b>Meu estúdio</b><small>Ambiente privado • protótipo</small></div><span class="online-dot"></span></div>
      </div>
    </aside>

    <div class="main-pane">
      <header class="topbar">
        <div class="topbar-left"><button class="icon-button menu-mobile" aria-label="Abrir menu" @click="mobileNav = true"><Menu :size="21" /></button><span class="breadcrumbs">Workspace <span>/</span> <b>{{ title }}</b></span></div>
        <div class="topbar-right"><span class="date-label">{{ date }}</span><span class="demo-tag"><LockKeyhole :size="12" /> LOCAL / DEMO</span></div>
      </header>
      <main class="main-content">
        <p v-if="persistenceError" class="storage-error" role="alert">{{ persistenceError }}</p>
        <DashboardView v-if="page === 'dashboard'" @go="navigate" @open-project="openProject" />
        <PlanView v-else-if="page === 'plan'" />
        <ServicesView v-else-if="page === 'services'" :focus-service-id="focusedServiceId" />
        <LeadsView v-else-if="page === 'leads'" :focus-lead-id="focusedLeadId" @open-project="openProject" @open-service="openService" />
        <ProjectDetailView v-else-if="page === 'project-detail'" :project-id="selectedProjectId" :notice="projectNotice" @go="navigate" @open-lead="openLead" @open-service="openService" />
        <ProjectsView v-else-if="page === 'projects'" @open-project="openProject" />
        <FinanceView v-else-if="page === 'finance'" @open-project="openProject" />
        <PublicationsView v-else-if="page === 'publications'" />
        <BriefingView v-else-if="page === 'briefing'" />
        <TasksView v-else-if="page === 'tasks'" @open-project="openProject" />
        <DataView v-else />
      </main>
      <footer class="footer"><span>Central Workspace · Protótipo v0.2</span><span>Feito para construir com calma. ✳</span></footer>
    </div>
  </div>
</template>
