<script setup lang="ts">
import { computed, ref } from 'vue'
import { LayoutDashboard, CalendarCheck2, UsersRound, FolderKanban, Wallet, CheckSquare2, DatabaseBackup, Menu, X, ArrowUpRight, Sparkles, LockKeyhole, CalendarRange, BadgeDollarSign, Megaphone, ClipboardList, Plus } from 'lucide-vue-next'
import DashboardView from './views/DashboardView.vue'
import TodayView from './views/TodayView.vue'
import type { TodayProjectTab } from './lib/todayActions'
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
import NewAttendanceWizard from './views/NewAttendanceWizard.vue'
import ConfirmationDialog from './views/ConfirmationDialog.vue'
import { persistenceError, state } from './lib/store'

type MainPage = 'dashboard' | 'today' | 'plan' | 'services' | 'leads' | 'projects' | 'finance' | 'publications' | 'briefing' | 'tasks' | 'data'
type Page = MainPage | 'project-detail'
const page = ref<Page>('dashboard')
const mobileNav = ref(false)
const selectedProjectId = ref('')
const selectedProjectTab = ref<TodayProjectTab>('resumo')
const projectNotice = ref('')
const focusedLeadId = ref('')
const focusedServiceId = ref('')
const serviceOrigin = ref<{ type: 'lead' | 'project'; id: string } | null>(null)
const serviceOriginLabel = computed(() => serviceOrigin.value?.type === 'lead' ? 'Voltar à oportunidade' : serviceOrigin.value?.type === 'project' ? 'Voltar ao projeto' : '')
const attendanceWizardOpen = ref(false)
const attendanceLeadId = ref<string | null>(null)
const requestNewDirectProject = ref(0)
const nav = [
  { id: 'dashboard' as MainPage, text: 'Visão geral', icon: LayoutDashboard },
  { id: 'today' as MainPage, text: 'Hoje', icon: CalendarCheck2 },
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
const gruposMenu = [
  { titulo: 'ACOMPANHAR', itens: nav.filter(item => ['dashboard', 'today', 'plan'].includes(item.id)) },
  { titulo: 'ATENDER E PRODUZIR', itens: nav.filter(item => ['leads', 'projects', 'tasks'].includes(item.id)) },
  { titulo: 'ORGANIZAR O NEGÓCIO', itens: nav.filter(item => ['finance', 'publications'].includes(item.id)) },
  { titulo: 'MODELOS E DADOS', itens: nav.filter(item => ['services', 'briefing', 'data'].includes(item.id)) },
]
const title = computed(() => page.value === 'project-detail' ? state.projects.find(project => project.id === selectedProjectId.value)?.name || 'Detalhe do projeto' : nav.find(item => item.id === page.value)?.text || 'Central')
const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
function navigate(next: MainPage) { page.value = next; mobileNav.value = false; serviceOrigin.value = null; focusedServiceId.value = '' }
function iniciarAtendimento() { attendanceLeadId.value = null; attendanceWizardOpen.value = true; mobileNav.value = false }
function resumeAttendance(id: string) { attendanceLeadId.value = id; attendanceWizardOpen.value = true; mobileNav.value = false }
function wizardOpenLead(id: string) { attendanceWizardOpen.value = false; openLead(id) }
function wizardOpenProject(id: string, notice = '') { attendanceWizardOpen.value = false; openProject(id, notice) }
function wizardDirectProject() { attendanceWizardOpen.value = false; requestNewDirectProject.value += 1; navigate('projects') }
function openProject(id: string, notice = '', tab: TodayProjectTab = 'resumo') { selectedProjectId.value = id; selectedProjectTab.value = tab; projectNotice.value = notice; page.value = 'project-detail'; mobileNav.value = false; serviceOrigin.value = null }
function openProjectFromToday(id: string, tab: TodayProjectTab) { openProject(id, '', tab) }
function openLead(id: string) { focusedLeadId.value = id; page.value = 'leads'; mobileNav.value = false; serviceOrigin.value = null }
function openService(id: string) { focusedServiceId.value = id; page.value = 'services'; mobileNav.value = false }
function openLeadService(id: string, leadId: string) { serviceOrigin.value = { type: 'lead', id: leadId }; openService(id) }
function openProjectService(id: string) { serviceOrigin.value = { type: 'project', id: selectedProjectId.value }; openService(id) }
function returnFromService() { const origin = serviceOrigin.value; if (!origin) return; if (origin.type === 'lead') openLead(origin.id); else openProject(origin.id) }
</script>

<template>
  <div class="app-shell">
    <ConfirmationDialog />
    <NewAttendanceWizard v-if="attendanceWizardOpen" :initial-lead-id="attendanceLeadId" @close="attendanceWizardOpen = false" @open-lead="wizardOpenLead" @open-project="wizardOpenProject" @create-direct-project="wizardDirectProject" />
    <div v-if="mobileNav" class="scrim" @click="mobileNav = false"></div>
    <aside class="sidebar" :class="{ 'sidebar-open': mobileNav }">
      <div class="brand">
        <div class="brand-icon"><Sparkles :size="19" :stroke-width="2.5" /></div>
        <div><strong>central<span class="brand-dot">.</span></strong><small>WORKSPACE / 01</small></div>
        <button class="icon-button close-mobile" aria-label="Fechar menu" @click="mobileNav = false"><X :size="19"/></button>
      </div>
      <button class="btn btn-dark sidebar-primary-action" @click="iniciarAtendimento"><Plus :size="17"/> Novo atendimento</button>
      <nav aria-label="Navegação principal" class="nav">
        <div v-for="grupo in gruposMenu" :key="grupo.titulo" class="nav-group">
          <p class="nav-group-label">{{ grupo.titulo }}</p>
          <button v-for="item in grupo.itens" :key="item.id" class="nav-item" :class="{ selected: page === item.id || (page === 'project-detail' && item.id === 'projects') }" :aria-current="page === item.id ? 'page' : undefined" @click="navigate(item.id)">
            <component :is="item.icon" :size="18" :stroke-width="1.9" /> <span>{{ item.text }}</span>
            <span v-if="page === item.id" class="nav-marker"></span>
          </button>
        </div>
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
        <DashboardView v-if="page === 'dashboard'" @go="navigate" @open-project="openProject" @iniciar-atendimento="iniciarAtendimento" />
        <TodayView v-else-if="page === 'today'" @open-project="openProjectFromToday" @resume-attendance="resumeAttendance" @open-tasks="navigate('tasks')" @new-attendance="iniciarAtendimento" />
        <PlanView v-else-if="page === 'plan'" />
        <ServicesView v-else-if="page === 'services'" :focus-service-id="focusedServiceId" :origin-label="serviceOriginLabel" @back="returnFromService" />
        <LeadsView v-else-if="page === 'leads'" :focus-lead-id="focusedLeadId" @open-project="openProject" @open-service="openLeadService" @resume-attendance="resumeAttendance" />
        <ProjectDetailView v-else-if="page === 'project-detail'" :project-id="selectedProjectId" :initial-tab="selectedProjectTab" :notice="projectNotice" @go="navigate" @open-lead="openLead" @open-service="openProjectService" />
        <ProjectsView v-else-if="page === 'projects'" :request-new-project="requestNewDirectProject" @open-project="openProject" />
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
