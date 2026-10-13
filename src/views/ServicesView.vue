<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { ArrowLeft, Calculator, ClipboardList, Info, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { state, addService, persistenceError, removeItem, updateService } from '../lib/store'
import { brl } from '../lib/format'
import { serviceFloor, serviceSuggestion } from '../lib/pricing'
import { confirmAction } from '../lib/confirmation'
import type { Service } from '../lib/types'

const props = defineProps<{ focusServiceId?: string | null; originLabel?: string }>()
const emit = defineEmits<{ back: [] }>()
const showForm = ref(false)
const editingId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const form = reactive({
  name: '', hours: 4, hourlyRate: 30, extras: 0, contingency: 0.15, scope: '', exclusions: '',
  availability: 'Oferecer já', taskTemplatesText: 'Confirmar escopo e materiais com o cliente\nPreparar primeira versão\nRevisar ajustes e combinar a entrega', briefingTemplateId: '',
})
const relatedCount = (id: string) => state.leads.filter(lead => lead.serviceId === id).length + state.projects.filter(project => project.serviceId === id).length
const templateName = (id: string | null) => state.briefingTemplates.find(template => template.id === id)?.name ?? 'Modelo geral'

function reset() {
  Object.assign(form, {
    name: '', hours: 4, hourlyRate: 30, extras: 0, contingency: 0.15, scope: '', exclusions: '', availability: 'Oferecer já',
    taskTemplatesText: 'Confirmar escopo e materiais com o cliente\nPreparar primeira versão\nRevisar ajustes e combinar a entrega',
    briefingTemplateId: state.briefingTemplates[0]?.id ?? '',
  })
  editingId.value = null
  error.value = ''
}
function create() { reset(); feedback.value = ''; showForm.value = true }
function edit(service: Service) {
  editingId.value = service.id
  Object.assign(form, {
    name: service.name, hours: service.hours, hourlyRate: service.hourlyRate, extras: service.extras,
    contingency: service.contingency, scope: service.scope, exclusions: service.exclusions,
    availability: service.availability, taskTemplatesText: service.taskTemplates.join('\n'),
    briefingTemplateId: service.briefingTemplateId ?? '',
  })
  error.value = ''; feedback.value = ''; showForm.value = true
}
function submit() {
  error.value = ''
  const values = [form.hours, form.hourlyRate, form.extras, form.contingency]
  const taskTemplates = form.taskTemplatesText.split('\n').map(title => title.trim()).filter(Boolean)
  if (!form.name.trim()) { error.value = 'Informe o nome do serviço.'; return }
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0) || form.contingency > 3) { error.value = 'Revise horas, custos e reserva.'; return }
  if (!taskTemplates.length) { error.value = 'Inclua ao menos uma tarefa no modelo do serviço.'; return }
  try {
    const input = {
      name: form.name.trim(), hours: Number(form.hours), hourlyRate: Number(form.hourlyRate),
      extras: Number(form.extras), contingency: Number(form.contingency), scope: form.scope,
      exclusions: form.exclusions, availability: form.availability, taskTemplates,
      briefingTemplateId: form.briefingTemplateId || null,
    }
    if (editingId.value) updateService(editingId.value, input)
    else addService(input)
    feedback.value = persistenceError.value || (editingId.value ? 'Modelo de serviço atualizado.' : 'Modelo de serviço salvo nesta biblioteca.')
    showForm.value = false
    reset()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o modelo de serviço.' }
}
async function drop(service: Service) {
  const references = relatedCount(service.id)
  const message = references
    ? `Este modelo está vinculado a ${references} oportunidade(s) ou projeto(s). Os projetos mantêm seu briefing e tarefas atuais. Excluir o vínculo do catálogo?`
    : 'Excluir este modelo de serviço da biblioteca?'
  if (await confirmAction({ title: 'Excluir modelo de serviço?', message, confirmLabel: 'Excluir modelo', tone: 'danger' })) removeItem('services', service.id)
}
function focusService(id?: string | null) { if (id) void nextTick(() => document.getElementById(`service-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
watch(() => props.focusServiceId, focusService, { immediate: true })
</script>

<template>
  <div class="view-enter">
    <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> BIBLIOTECA DE MODELOS</p><h1>Serviços e preços</h1><p class="page-subtitle">Reutilize escopo, referência de preço, tarefas iniciais e questionário ao cadastrar uma oportunidade.</p></div><button class="btn btn-dark" @click="create"><Plus :size="17"/> Novo modelo</button></div>
    <p v-if="props.originLabel" class="service-return"><button type="button" class="back-link" @click="emit('back')"><ArrowLeft :size="15"/> {{ props.originLabel }}</button><span>Você está consultando um modelo reutilizável, não um projeto contratado.</span></p>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="notice-box subtle-notice"><Info :size="22"/><div><b>Biblioteca de modelos reutilizáveis.</b><p>Editar um modelo altera suas próximas utilizações, mas não substitui tarefas, respostas ou valores já definidos em projetos existentes. Piso = horas × valor da hora × (1 + reserva) + custos extras. A referência ajuda a montar a proposta; preço contratado e recebimentos continuam separados.</p></div></div>
    <div v-if="state.services.length" class="service-grid">
      <article v-for="service in state.services" :id="`service-${service.id}`" :key="service.id" class="surface service-card" :class="{ 'service-model-focused': focusServiceId === service.id }">
        <p v-if="focusServiceId === service.id" class="service-focus-caption">MODELO DO SERVIÇO CONSULTADO</p>
        <header><div><p class="section-kicker">{{ service.availability }}</p><h2>{{ service.name }}</h2><p class="item-counter">{{ relatedCount(service.id) }} oportunidade(s) e projeto(s) vinculados</p></div><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${service.name}`" @click="edit(service)"><Pencil :size="16"/></button><button class="icon-button danger" :aria-label="`Excluir ${service.name}`" @click="drop(service)"><Trash2 :size="16"/></button></div></header>
        <div class="price-result"><span>Referência arredondada</span><strong>{{ brl(serviceSuggestion(service)) }}</strong><small>Piso calculado: {{ brl(serviceFloor(service)) }}</small></div>
        <div class="service-facts"><span><b>{{ service.hours }}</b> horas</span><span><b>{{ brl(service.hourlyRate) }}</b> por hora</span><span><b>{{ brl(service.extras) }}</b> custos extras</span><span><b>{{ Math.round(service.contingency * 100) }}%</b> de reserva</span></div>
        <div><p class="section-kicker">INCLUI</p><p class="service-copy">{{ service.scope || 'Sem escopo descrito.' }}</p></div><div><p class="section-kicker">FORA DO ESCOPO</p><p class="service-copy">{{ service.exclusions || 'Não definido.' }}</p></div>
        <div class="service-model-meta"><span><ClipboardList :size="15"/> {{ service.taskTemplates.length }} tarefas iniciais</span><span>{{ templateName(service.briefingTemplateId) }}</span></div>
        <ul class="service-task-preview"><li v-for="task in service.taskTemplates.slice(0, 3)" :key="task">{{ task }}</li><li v-if="service.taskTemplates.length > 3">+{{ service.taskTemplates.length - 3 }} tarefa(s)</li></ul>
      </article>
    </div>
    <div v-else class="surface empty"><Calculator :size="26"/><b>Sem modelos cadastrados</b><p>Cadastre serviços para reaproveitar escopo, tarefas e briefings nas próximas oportunidades.</p><button class="btn btn-outline" @click="create">Criar modelo</button></div>

    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="serv-modal"><div class="modal-head"><div><p class="section-kicker">BIBLIOTECA REUTILIZÁVEL</p><h2 id="serv-modal">{{ editingId ? 'Editar modelo' : 'Novo modelo de serviço' }}</h2></div><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="s-name">Nome do serviço *</label><input id="s-name" v-model="form.name" maxlength="150" autofocus required placeholder="Ex.: Landing page para negócios locais"/></div>
        <div class="form-row"><div class="field"><label for="s-hours">Horas previstas</label><input id="s-hours" v-model.number="form.hours" type="number" min="0" step="0.5" placeholder="Ex.: 12"/></div><div class="field"><label for="s-rate">Valor por hora (R$)</label><input id="s-rate" v-model.number="form.hourlyRate" type="number" min="0" step="0.01" placeholder="Ex.: 60"/></div></div>
        <div class="form-row"><div class="field"><label for="s-extras">Custos extras (R$)</label><input id="s-extras" v-model.number="form.extras" type="number" min="0" step="0.01" placeholder="Ex.: 80"/></div><div class="field"><label for="s-reserve">Reserva</label><select id="s-reserve" v-model.number="form.contingency"><option :value="0">0%</option><option :value="0.1">10%</option><option :value="0.15">15%</option><option :value="0.2">20%</option><option :value="0.25">25%</option><option :value="0.3">30%</option><option :value="0.4">40%</option><option :value="0.5">50%</option></select></div></div>
        <div class="field"><label for="s-scope">Inclui</label><textarea id="s-scope" v-model="form.scope" rows="3" maxlength="1000" placeholder="Ex.: Página responsiva, formulário de contato e link do WhatsApp"/></div><div class="field"><label for="s-exclusions">Fora do escopo</label><textarea id="s-exclusions" v-model="form.exclusions" rows="3" maxlength="1000" placeholder="Ex.: Hospedagem e produção de fotos"/></div>
        <div class="form-row"><div class="field"><label for="s-availability">Disponibilidade</label><select id="s-availability" v-model="form.availability"><option>Oferecer já</option><option>Fase 2</option><option>Sob consulta</option><option>Indisponível</option></select></div><div class="field"><label for="s-briefing">Questionário para novos projetos</label><select id="s-briefing" v-model="form.briefingTemplateId"><option value="">Modelo geral</option><option v-for="template in state.briefingTemplates" :key="template.id" :value="template.id">{{ template.name }}</option></select></div></div>
        <div class="field"><label for="s-tasks">Tarefas iniciais (uma por linha) *</label><textarea id="s-tasks" v-model="form.taskTemplatesText" rows="6" maxlength="1600" required placeholder="Reunir referências&#10;Criar o layout&#10;Validar com o cliente&#10;Publicar a página"/><small>Ao criar um projeto com este modelo, cada tarefa será adicionada ao projeto. Projetos existentes mantêm suas tarefas atuais.</small></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button class="btn btn-outline" type="button" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">{{ editingId ? 'Salvar alterações' : 'Salvar modelo' }}</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
