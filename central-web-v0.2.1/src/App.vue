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

type Page = 'dashboard' | 'plan' | 'services' | 'leads' | 'projects' | 'finance' | 'publications' | 'briefing' | 'tasks' | 'data'
const page = ref<Page>('dashboard')
const mobileNav = ref(false)
const nav = [
  { id: 'dashboard' as Page, text: 'Visão geral', icon: LayoutDashboard },
  { id: 'plan' as Page, text: 'Plano de lançamento', icon: CalendarRange },
  { id: 'services' as Page, text: 'Serviços e preços', icon: BadgeDollarSign },
  { id: 'leads' as Page, text: 'Oportunidades', icon: UsersRound },
  { id: 'projects' as Page, text: 'Projetos', icon: FolderKanban },
  { id: 'finance' as Page, text: 'Financeiro', icon: Wallet },
  { id: 'publications' as Page, text: 'Publicações', icon: Megaphone },
  { id: 'briefing' as Page, text: 'Briefing', icon: ClipboardList },
  { id: 'tasks' as Page, text: 'Minha rotina', icon: CheckSquare2 },
  { id: 'data' as Page, text: 'Dados & backup', icon: DatabaseBackup },
]
const title = computed(() => nav.find(item => item.id === page.value)?.text || 'Central')
const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
function navigate(next: Page) { page.value = next; mobileNav.value = false }
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
        <DashboardView v-if="page === 'dashboard'" @go="navigate" />
        <PlanView v-else-if="page === 'plan'" />
        <ServicesView v-else-if="page === 'services'" />
        <LeadsView v-else-if="page === 'leads'" />
        <ProjectsView v-else-if="page === 'projects'" />
        <FinanceView v-else-if="page === 'finance'" />
        <PublicationsView v-else-if="page === 'publications'" />
        <BriefingView v-else-if="page === 'briefing'" />
        <TasksView v-else-if="page === 'tasks'" />
        <DataView v-else />
      </main>
      <footer class="footer"><span>Central Workspace · Protótipo v0.2</span><span>Feito para construir com calma. ✳</span></footer>
    </div>
  </div>
</template>
