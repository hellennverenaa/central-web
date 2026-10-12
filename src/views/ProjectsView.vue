<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ArrowRight, FolderKanban, Plus, Trash2 } from 'lucide-vue-next'
import { state, addProject, persistenceError, removeItem } from '../lib/store'
import { brl, dateBR, projectLabels, todayLocal } from '../lib/format'
import type { ProjectStatus } from '../lib/types'

const emit = defineEmits<{ openProject: [id: string, notice?: string] }>()
const statuses: ProjectStatus[] = ['planejado', 'andamento', 'revisao', 'entregue']
const showForm = ref(false)
const error = ref('')
const feedback = ref('')
const form = reactive({ name: '', client: '', serviceId: '', status: 'planejado' as ProjectStatus, deadline: todayLocal(), value: 0 })
function create() { Object.assign(form, { name: '', client: '', serviceId: '', status: 'planejado', deadline: todayLocal(), value: 0 }); error.value = ''; feedback.value = ''; showForm.value = true }
function submit() {
  error.value = ''
  if (!form.name.trim() || !form.client.trim()) { error.value = 'Informe o nome do projeto e o cliente.'; return }
  if (!Number.isFinite(Number(form.value)) || Number(form.value) < 0) { error.value = 'O valor combinado deve ser igual ou maior que zero.'; return }
  try {
    const project = addProject({ name: form.name.trim(), client: form.client.trim(), serviceId: form.serviceId || null, status: form.status, deadline: form.deadline, value: Number(form.value) })
    feedback.value = persistenceError.value || 'Projeto cadastrado e salvo neste dispositivo.'
    showForm.value = false
    emit('openProject', project.id, feedback.value)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o projeto.' }
}
function drop(id: string) { if (confirm('Excluir este projeto? Tarefas e lançamentos serão preservados e ficarão sem projeto.')) removeItem('projects', id) }
function announceStatus() { feedback.value = persistenceError.value || 'Status atualizado.' }
</script>

<template>
  <div class="view-enter">
    <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> PRODUÇÃO</p><h1>Projetos</h1><p class="page-subtitle">Acompanhe escopo, prazo, tarefas e movimentações de cada trabalho.</p></div><button class="btn btn-dark" @click="create"><Plus :size="17"/> Novo projeto</button></div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="surface"><div class="list-toolbar"><h2>Todos os projetos</h2><span class="item-counter">{{ state.projects.length }} projeto(s)</span></div>
      <div class="table-wrap"><table v-if="state.projects.length" class="data-table"><thead><tr><th>PROJETO</th><th>CLIENTE</th><th>SERVIÇO</th><th>PRAZO</th><th>PREÇO COMBINADO</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>
        <tr v-for="project in state.projects" :key="project.id"><td><button class="table-link strong" @click="emit('openProject', project.id)">{{ project.name }} <ArrowRight :size="14"/></button></td><td>{{ project.client }}</td><td>{{ state.services.find(service => service.id === project.serviceId)?.name || '—' }}</td><td>{{ dateBR(project.deadline) }}</td><td>{{ brl(project.value) }}</td><td><select v-model="project.status" class="status-select" :class="project.status" :aria-label="`Status de ${project.name}`" @change="announceStatus"><option v-for="status in statuses" :key="status" :value="status">{{ projectLabels[status] }}</option></select></td><td><div class="row-actions"><button class="icon-button" :aria-label="`Abrir detalhes de ${project.name}`" @click="emit('openProject', project.id)"><ArrowRight :size="16"/></button><button class="icon-button danger" :aria-label="`Excluir ${project.name}`" @click="drop(project.id)"><Trash2 :size="16"/></button></div></td></tr>
      </tbody></table><div v-else class="empty"><FolderKanban :size="27"/><b>Sem projetos cadastrados</b><p>Converta uma oportunidade ou cadastre um projeto para acompanhar a execução.</p><button class="btn btn-outline" @click="create">Adicionar primeiro projeto</button></div></div>
    </div>
    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="project-title"><div class="modal-head"><h2 id="project-title">Novo projeto</h2><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="p-name">Nome do projeto *</label><input id="p-name" v-model="form.name" required maxlength="140" autofocus/></div><div class="field"><label for="p-client">Cliente *</label><input id="p-client" v-model="form.client" required maxlength="120"/></div>
        <div class="field"><label for="p-service">Serviço vinculado</label><select id="p-service" v-model="form.serviceId"><option value="">Sem vínculo de serviço</option><option v-for="service in state.services" :key="service.id" :value="service.id">{{ service.name }}</option></select></div>
        <div class="form-row"><div class="field"><label for="p-deadline">Prazo previsto</label><input id="p-deadline" v-model="form.deadline" type="date" required/></div><div class="field"><label for="p-value">Preço combinado (R$)</label><input id="p-value" v-model.number="form.value" type="number" min="0" step="0.01" required/></div></div>
        <div class="field"><label for="p-status">Status inicial</label><select id="p-status" v-model="form.status"><option v-for="status in statuses" :key="status" :value="status">{{ projectLabels[status] }}</option></select></div>
        <p class="form-hint">Preço combinado é independente da estimativa comercial e de recebimentos registrados.</p><p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">Salvar projeto</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
