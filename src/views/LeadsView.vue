<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ArrowRight, FolderKanban, MessageCircle, Pencil, Plus, Search, Trash2, UsersRound, ListChecks } from 'lucide-vue-next'
import { state, addLead, convertLeadToProject, persistenceError, removeItem, updateLead } from '../lib/store'
import { brl, leadLabels, todayLocal, whatsappHref } from '../lib/format'
import { initialConversionPrice, serviceSuggestion } from '../lib/pricing'
import type { Lead, LeadStage, ProjectStatus } from '../lib/types'

const props = defineProps<{ focusLeadId?: string | null }>()
const emit = defineEmits<{ openProject: [id: string, notice?: string]; openService: [id: string, leadId: string]; resumeAttendance: [id: string] }>()
const stages: LeadStage[] = ['novo', 'conversa', 'proposta', 'ganho', 'perdido']
const showForm = ref(false)
const showConversion = ref(false)
const search = ref('')
const editingId = ref<string | null>(null)
const convertingLead = ref<Lead | null>(null)
const error = ref('')
const feedback = ref('')
const form = reactive({ name: '', contact: '', service: '', serviceId: '', stage: 'novo' as LeadStage, value: 0, notes: '' })
const conversion = reactive({ name: '', client: '', status: 'planejado' as ProjectStatus, deadline: todayLocal(), value: 0 })
const conversionService = computed(() => {
  const lead = convertingLead.value
  if (!lead) return null
  return state.services.find(service => service.id === lead.serviceId) ??
    state.services.find(service => service.name.trim().toLocaleLowerCase('pt-BR') === lead.service.trim().toLocaleLowerCase('pt-BR')) ?? null
})
const filtered = computed(() => state.leads.filter(lead => `${lead.name} ${lead.service}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))

function resetForm() {
  Object.assign(form, { name: '', contact: '', service: '', serviceId: '', stage: 'novo', value: 0, notes: '' })
  editingId.value = null
  error.value = ''
}
function openCreate() { resetForm(); feedback.value = ''; showForm.value = true }
function edit(lead: Lead) {
  editingId.value = lead.id
  Object.assign(form, { name: lead.name, contact: lead.contact, service: lead.service, serviceId: lead.serviceId ?? '', stage: lead.stage, value: lead.value, notes: lead.notes })
  error.value = ''
  feedback.value = ''
  showForm.value = true
}
function submit() {
  error.value = ''
  const name = form.name.trim()
  const selectedService = state.services.find(service => service.id === form.serviceId)
  const serviceName = selectedService?.name ?? form.service.trim()
  if (!name || !serviceName) { error.value = 'Informe o nome e o serviço de interesse.'; return }
  try {
    const input = { name, contact: form.contact.trim(), service: serviceName, serviceId: selectedService?.id ?? null, stage: form.stage, value: Number(form.value), notes: form.notes.trim() }
    if (!Number.isFinite(input.value) || input.value < 0) throw new Error('A estimativa deve ser um valor igual ou maior que zero.')
    if (editingId.value) updateLead(editingId.value, input)
    else addLead(input)
    feedback.value = persistenceError.value || (editingId.value ? 'Oportunidade atualizada e salva neste dispositivo.' : 'Oportunidade cadastrada e salva neste dispositivo.')
    showForm.value = false
    resetForm()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a oportunidade.' }
}
function beginConversion(lead: Lead) {
  if (lead.convertedProjectId) { emit('openProject', lead.convertedProjectId); return }
  convertingLead.value = lead
  const service = state.services.find(item => item.id === lead.serviceId) ?? state.services.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === lead.service.trim().toLocaleLowerCase('pt-BR'))
  Object.assign(conversion, { name: `${lead.service} — ${lead.name}`, client: lead.name, status: 'planejado', deadline: todayLocal(), value: initialConversionPrice(lead.value, service ?? null) })
  error.value = ''
  feedback.value = ''
  showConversion.value = true
}
function submitConversion() {
  error.value = ''
  if (!convertingLead.value) return
  try {
    const project = convertLeadToProject(convertingLead.value.id, { ...conversion, name: conversion.name.trim(), client: conversion.client.trim(), value: Number(conversion.value) })
    feedback.value = persistenceError.value || 'Projeto criado e salvo neste dispositivo.'
    showConversion.value = false
    convertingLead.value = null
    emit('openProject', project.id, feedback.value)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível converter a oportunidade.' }
}
function drop(id: string) {
  const linkedProject = state.projects.find(project => project.sourceLeadId === id)
  const prompt = linkedProject ? `Excluir esta oportunidade? O projeto “${linkedProject.name}” permanecerá, mas perderá o vínculo com a oportunidade.` : 'Excluir esta oportunidade?'
  if (confirm(prompt)) removeItem('leads', id)
}
function openLinkedProject(lead: Lead) { if (lead.convertedProjectId) emit('openProject', lead.convertedProjectId) }
function announceStageSaved() { feedback.value = persistenceError.value || 'Etapa atualizada.' }
function jumpToLead(id?: string | null) {
  if (!id) return
  void nextTick(() => document.getElementById(`lead-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
watch(() => props.focusLeadId, jumpToLead, { immediate: true })
</script>

<template>
  <div class="view-enter">
    <div class="page-intro">
      <div><p class="eyebrow"><span class="eyebrow-line"></span> RELACIONAMENTO</p><h1>Oportunidades</h1><p class="page-subtitle">Acompanhe contatos, serviços de interesse e conversões em projeto.</p></div>
      <button class="btn btn-dark" @click="openCreate"><Plus :size="17"/> Adicionar oportunidade</button>
    </div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="surface">
      <div class="list-toolbar"><div class="search-field"><Search :size="17"/><input v-model="search" aria-label="Buscar oportunidades" placeholder="Buscar por cliente ou serviço..."/></div><span class="item-counter">{{ filtered.length }} oportunidade(s)</span></div>
      <div class="table-wrap">
        <table v-if="filtered.length" class="data-table"><thead><tr><th>CLIENTE</th><th>SERVIÇO</th><th>ESTIMATIVA</th><th>ETAPA</th><th>AÇÕES</th></tr></thead><tbody>
          <tr v-for="lead in filtered" :id="`lead-${lead.id}`" :key="lead.id">
            <td><div class="client-cell"><div class="initial-avatar">{{ lead.name[0]?.toUpperCase() }}</div><div><strong>{{ lead.name }}</strong><small>{{ lead.contact || 'Sem contato informado' }}</small></div></div></td>
            <td><button v-if="lead.serviceId" class="table-link" :aria-label="`Ver modelo do serviço ${lead.service}`" title="Ver modelo do serviço" @click="emit('openService', lead.serviceId, lead.id)">{{ state.services.find(service => service.id === lead.serviceId)?.name ?? lead.service }} <small class="model-link-hint">Ver modelo do serviço</small><ArrowRight :size="13"/></button><span v-else>{{ lead.service }}</span></td>
            <td class="strong">{{ brl(lead.value) }}</td>
            <td><select v-model="lead.stage" class="status-select" :class="lead.stage" :aria-label="`Etapa de ${lead.name}`" @change="announceStageSaved"><option v-for="stage in stages" :key="stage" :value="stage">{{ leadLabels[stage] }}</option></select></td>
            <td><div class="row-actions">
              <a v-if="whatsappHref(lead.contact)" :href="whatsappHref(lead.contact) || '#'" target="_blank" rel="noopener noreferrer" class="icon-button" :aria-label="`Conversar com ${lead.name} no WhatsApp`"><MessageCircle :size="17"/></a>
              <button v-if="lead.convertedProjectId" class="icon-button" :aria-label="`Abrir projeto de ${lead.name}`" title="Abrir projeto" @click="openLinkedProject(lead)"><FolderKanban :size="16"/></button>
              <template v-else><button class="icon-button" :aria-label="`Retomar atendimento de ${lead.name}`" title="Retomar no assistente" @click="emit('resumeAttendance', lead.id)"><ListChecks :size="16"/></button><button class="icon-button" :aria-label="`Converter ${lead.name} em projeto`" title="Converter rapidamente em projeto" @click="beginConversion(lead)"><ArrowRight :size="16"/></button></template>
              <button class="icon-button" :aria-label="`Editar ${lead.name}`" @click="edit(lead)"><Pencil :size="16"/></button>
              <button class="icon-button danger" :aria-label="`Excluir ${lead.name}`" @click="drop(lead.id)"><Trash2 :size="16"/></button>
            </div></td>
          </tr>
        </tbody></table>
        <div v-else class="empty"><UsersRound :size="27"/><b>{{ search ? 'Nenhum resultado encontrado' : 'Ainda não há oportunidades' }}</b><p>{{ search ? 'Experimente outro termo.' : 'Cadastre uma oportunidade e acompanhe o caminho até o projeto.' }}</p><button v-if="!search" class="btn btn-outline" @click="openCreate">Cadastrar primeira oportunidade</button></div>
      </div>
    </div>

    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="lead-title"><div class="modal-head"><h2 id="lead-title">{{ editingId ? 'Editar oportunidade' : 'Nova oportunidade' }}</h2><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="l-name">Cliente ou negócio *</label><input id="l-name" v-model="form.name" maxlength="120" required autofocus placeholder="Nome do cliente ou negócio"/></div>
        <div class="field"><label for="l-contact">Contato</label><input id="l-contact" v-model="form.contact" maxlength="100" placeholder="Contato de trabalho (opcional)"/></div>
        <div class="field"><label for="l-service-id">Serviço do catálogo</label><select id="l-service-id" v-model="form.serviceId"><option value="">Serviço fora do catálogo</option><option v-for="service in state.services" :key="service.id" :value="service.id">{{ service.name }}</option></select></div>
        <div v-if="!form.serviceId" class="field"><label for="l-service">Serviço de interesse *</label><input id="l-service" v-model="form.service" maxlength="120" required placeholder="Descreva o serviço"/></div>
        <div class="form-row"><div class="field"><label for="l-stage">Etapa</label><select id="l-stage" v-model="form.stage"><option v-for="stage in stages" :key="stage" :value="stage">{{ leadLabels[stage] }}</option></select></div><div class="field"><label for="l-value">Valor estimado (R$)</label><input id="l-value" v-model.number="form.value" type="number" min="0" step="0.01" required/></div></div>
        <div class="field"><label for="l-notes">Observações</label><textarea id="l-notes" v-model="form.notes" rows="3" maxlength="1000"/></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><p class="form-hint">A estimativa fica no pipeline; converter não define o valor contratado nem registra recebimento.</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">{{ editingId ? 'Salvar alterações' : 'Salvar oportunidade' }}</button></div>
      </form>
    </div></div></Teleport>

    <Teleport to="body"><div v-if="showConversion && convertingLead" class="modal-backdrop" @click.self="showConversion = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="convert-title"><div class="modal-head"><h2 id="convert-title">Converter em projeto</h2><button class="icon-button" aria-label="Fechar" @click="showConversion = false">✕</button></div>
      <form @submit.prevent="submitConversion"><div class="notice-box subtle-notice"><div><b>Estimativa do pipeline: {{ brl(convertingLead.value) }}</b><p>O valor informado na oportunidade é usado primeiro. A sugestão do catálogo é apenas uma referência; nenhum recebimento é registrado automaticamente.</p></div></div>
        <div class="field"><label for="c-name">Nome do projeto *</label><input id="c-name" v-model="conversion.name" maxlength="140" required autofocus/></div>
        <div class="field"><label for="c-client">Cliente *</label><input id="c-client" v-model="conversion.client" maxlength="120" required/></div>
        <div v-if="conversionService" class="conversion-price-reference"><span>Referência do catálogo: <b>{{ brl(serviceSuggestion(conversionService)) }}</b></span><button type="button" class="btn btn-outline btn-slim" @click="conversion.value = serviceSuggestion(conversionService)">Aplicar referência</button></div>
        <div class="conversion-generation-summary"><b>{{ conversionService?.name || convertingLead.service }}</b><span>{{ conversionService?.taskTemplates.length ?? 3 }} tarefa(s) iniciais e {{ state.briefingTemplates.find(template => template.id === conversionService?.briefingTemplateId)?.name || state.briefingTemplates[0]?.name || 'questionário geral' }}</span><small>O projeto ficará ligado à oportunidade original, com contato e observações preservados.</small></div>
        <div class="form-row"><div class="field"><label for="c-value">Preço combinado (R$) · confirme ou ajuste</label><input id="c-value" v-model.number="conversion.value" type="number" min="0" step="0.01" required/></div><div class="field"><label for="c-deadline">Prazo</label><input id="c-deadline" v-model="conversion.deadline" type="date" required/></div></div>
        <div class="field"><label for="c-status">Status inicial</label><select id="c-status" v-model="conversion.status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="revisao">Em revisão</option><option value="entregue">Entregue</option></select></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="showConversion = false">Cancelar</button><button class="btn btn-dark" type="submit">Criar projeto</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
