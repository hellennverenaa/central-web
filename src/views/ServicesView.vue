<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { Calculator, Info, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { state, addService, persistenceError, removeItem, updateService } from '../lib/store'
import { brl } from '../lib/format'
import { serviceFloor, serviceSuggestion } from '../lib/pricing'
import type { Service } from '../lib/types'

const props = defineProps<{ focusServiceId?: string | null }>()
const showForm = ref(false)
const editingId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const form = reactive({ name: '', hours: 4, hourlyRate: 30, extras: 0, contingency: 0.15, scope: '', exclusions: '', availability: 'Oferecer já' })
const relatedCount = (id: string) => state.leads.filter(lead => lead.serviceId === id).length + state.projects.filter(project => project.serviceId === id).length

function reset() { Object.assign(form, { name: '', hours: 4, hourlyRate: 30, extras: 0, contingency: 0.15, scope: '', exclusions: '', availability: 'Oferecer já' }); editingId.value = null; error.value = '' }
function create() { reset(); feedback.value = ''; showForm.value = true }
function edit(service: Service) { editingId.value = service.id; Object.assign(form, service); error.value = ''; feedback.value = ''; showForm.value = true }
function submit() {
  error.value = ''
  const values = [form.hours, form.hourlyRate, form.extras, form.contingency]
  if (!form.name.trim()) { error.value = 'Informe o nome do serviço.'; return }
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0) || form.contingency > 3) { error.value = 'Revise horas, custos e reserva.'; return }
  try {
    const input = { ...form, name: form.name.trim(), hours: Number(form.hours), hourlyRate: Number(form.hourlyRate), extras: Number(form.extras), contingency: Number(form.contingency) }
    if (editingId.value) updateService(editingId.value, input)
    else addService(input)
    feedback.value = persistenceError.value || (editingId.value ? 'Serviço atualizado e salvo neste dispositivo.' : 'Serviço cadastrado e salvo neste dispositivo.')
    showForm.value = false
    reset()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o serviço.' }
}
function drop(service: Service) {
  const references = relatedCount(service.id)
  const message = references ? `Este serviço está vinculado a ${references} oportunidade(s) ou projeto(s). Excluir remove os vínculos, preservando os registros. Continuar?` : 'Excluir serviço do catálogo?'
  if (confirm(message)) removeItem('services', service.id)
}
function focusService(id?: string | null) { if (id) void nextTick(() => document.getElementById(`service-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
watch(() => props.focusServiceId, focusService, { immediate: true })
</script>

<template>
  <div class="view-enter">
    <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> OFERTA COMERCIAL</p><h1>Serviços e preços</h1><p class="page-subtitle">Catálogo e simulação para vincular serviços a oportunidades e projetos.</p></div><button class="btn btn-dark" @click="create"><Plus :size="17"/> Novo serviço</button></div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="notice-box subtle-notice"><Info :size="22"/><div><b>Simulação, não tabela de mercado.</b><p>Piso = horas × valor da hora × (1 + reserva) + custos extras. Estimativa comercial, valor contratado e recebimentos são dados separados.</p></div></div>
    <div v-if="state.services.length" class="service-grid">
      <article v-for="service in state.services" :id="`service-${service.id}`" :key="service.id" class="surface service-card">
        <header><div><p class="section-kicker">{{ service.availability }}</p><h2>{{ service.name }}</h2><p class="item-counter">{{ relatedCount(service.id) }} vínculo(s) com oportunidades e projetos</p></div><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${service.name}`" @click="edit(service)"><Pencil :size="16"/></button><button class="icon-button danger" :aria-label="`Excluir ${service.name}`" @click="drop(service)"><Trash2 :size="16"/></button></div></header>
        <div class="price-result"><span>Referência arredondada</span><strong>{{ brl(serviceSuggestion(service)) }}</strong><small>Piso calculado: {{ brl(serviceFloor(service)) }}</small></div>
        <div class="service-facts"><span><b>{{ service.hours }}</b> horas</span><span><b>{{ brl(service.hourlyRate) }}</b> por hora</span><span><b>{{ brl(service.extras) }}</b> custos extras</span><span><b>{{ Math.round(service.contingency * 100) }}%</b> de reserva</span></div>
        <div><p class="section-kicker">INCLUI</p><p class="service-copy">{{ service.scope || 'Sem escopo descrito.' }}</p></div><div><p class="section-kicker">FORA DO ESCOPO</p><p class="service-copy">{{ service.exclusions || 'Não definido.' }}</p></div>
      </article>
    </div>
    <div v-else class="surface empty"><Calculator :size="26"/><b>Sem serviços cadastrados</b><p>Cadastre seus serviços para vinculá-los às oportunidades e projetos.</p><button class="btn btn-outline" @click="create">Criar serviço</button></div>

    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="serv-modal"><div class="modal-head"><h2 id="serv-modal">{{ editingId ? 'Editar serviço' : 'Novo serviço' }}</h2><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="s-name">Nome *</label><input id="s-name" v-model="form.name" maxlength="150" autofocus required/></div>
        <div class="form-row"><div class="field"><label for="s-hours">Horas previstas</label><input id="s-hours" v-model.number="form.hours" type="number" min="0" step="0.5"/></div><div class="field"><label for="s-rate">Valor por hora (R$)</label><input id="s-rate" v-model.number="form.hourlyRate" type="number" min="0" step="0.01"/></div></div>
        <div class="form-row"><div class="field"><label for="s-extras">Custos extras (R$)</label><input id="s-extras" v-model.number="form.extras" type="number" min="0" step="0.01"/></div><div class="field"><label for="s-reserve">Reserva</label><select id="s-reserve" v-model.number="form.contingency"><option :value="0">0%</option><option :value="0.1">10%</option><option :value="0.15">15%</option><option :value="0.2">20%</option><option :value="0.25">25%</option><option :value="0.3">30%</option><option :value="0.4">40%</option><option :value="0.5">50%</option></select></div></div>
        <div class="field"><label for="s-scope">Inclui</label><textarea id="s-scope" v-model="form.scope" rows="3" maxlength="1000"/></div><div class="field"><label for="s-exclusions">Fora do escopo</label><textarea id="s-exclusions" v-model="form.exclusions" rows="3" maxlength="1000"/></div>
        <div class="field"><label for="s-availability">Disponibilidade</label><select id="s-availability" v-model="form.availability"><option>Oferecer já</option><option>Fase 2</option><option>Sob consulta</option><option>Indisponível</option></select></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button class="btn btn-outline" type="button" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">{{ editingId ? 'Salvar alterações' : 'Salvar serviço' }}</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
