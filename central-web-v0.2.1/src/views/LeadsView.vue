<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Trash2, MessageCircle, UsersRound, Search } from 'lucide-vue-next'
import { state, addLead, removeItem } from '../lib/store'
import { brl, leadLabels, whatsappHref } from '../lib/format'
import type { LeadStage } from '../lib/types'
const stages: LeadStage[] = ['novo','conversa','proposta','ganho','perdido']
const showForm = ref(false)
const search = ref('')
const form = reactive({ name: '', contact: '', service: '', stage: 'novo' as LeadStage, value: 0, notes: '' })
const filtered = computed(() => state.leads.filter(l => `${l.name} ${l.service}`.toLowerCase().includes(search.value.toLowerCase())))
function submit() {
  if (!form.name.trim() || !form.service.trim() || form.value < 0) return
  addLead({ name: form.name.trim(), contact: form.contact.trim(), service: form.service.trim(), stage: form.stage, value: Number(form.value), notes: form.notes.trim() })
  Object.assign(form, { name: '', contact: '', service: '', stage: 'novo', value: 0, notes: '' })
  showForm.value = false
}
function drop(id: string) { if (confirm('Excluir esta oportunidade?')) removeItem('leads', id) }
</script>
<template>
  <div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> RELACIONAMENTO</p><h1>Oportunidades</h1><p class="page-subtitle">Do primeiro contato até o fechamento. Simples e rastreável.</p></div><button class="btn btn-dark" @click="showForm = true"><Plus :size="17"/> Adicionar contato</button></div>
    <div class="surface"><div class="list-toolbar"><div class="search-field"><Search :size="17"/><input v-model="search" aria-label="Buscar oportunidades" placeholder="Buscar por cliente ou serviço..."/></div><span class="item-counter">{{ filtered.length }} contato(s)</span></div>
      <div class="table-wrap"><table v-if="filtered.length" class="data-table"><thead><tr><th>CONTATO</th><th>SERVIÇO</th><th>VALOR ESTIMADO</th><th>ETAPA</th><th>AÇÕES</th></tr></thead><tbody><tr v-for="lead in filtered" :key="lead.id"><td><div class="client-cell"><div class="initial-avatar">{{ lead.name[0]?.toUpperCase() }}</div><div><strong>{{ lead.name }}</strong><small>{{ lead.contact || 'Sem telefone' }}</small></div></div></td><td>{{ lead.service }}</td><td class="strong">{{ brl(lead.value) }}</td><td><select v-model="lead.stage" class="status-select" :class="lead.stage" :aria-label="`Etapa de ${lead.name}`"><option v-for="stage in stages" :key="stage" :value="stage">{{ leadLabels[stage] }}</option></select></td><td><div class="row-actions"><a v-if="whatsappHref(lead.contact)" :href="whatsappHref(lead.contact) || '#'" target="_blank" rel="noopener noreferrer" class="icon-button" :aria-label="`Conversar com ${lead.name} no WhatsApp`"><MessageCircle :size="17"/></a><button class="icon-button danger" :aria-label="`Excluir ${lead.name}`" @click="drop(lead.id)"><Trash2 :size="16"/></button></div></td></tr></tbody></table>
      <div v-else class="empty"><UsersRound :size="27"/><b>{{ search ? 'Nenhum resultado encontrado' : 'Ainda não há oportunidades' }}</b><p>{{ search ? 'Experimente outro termo.' : 'Comece cadastrando possíveis clientes, mesmo antes de receber pedidos.' }}</p><button v-if="!search" class="btn btn-outline" @click="showForm = true">Cadastrar primeiro contato</button></div></div>
    </div>
    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="lead-title"><div class="modal-head"><h2 id="lead-title">Nova oportunidade</h2><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div><form @submit.prevent="submit"><div class="field"><label for="l-name">Cliente ou negócio *</label><input id="l-name" v-model="form.name" maxlength="120" required autofocus placeholder="Ex.: Studio Bela"/></div><div class="field"><label for="l-contact">WhatsApp (com DDD)</label><input id="l-contact" v-model="form.contact" maxlength="30" placeholder="(00) 99999-9999"/></div><div class="field"><label for="l-service">Serviço de interesse *</label><input id="l-service" v-model="form.service" maxlength="120" required placeholder="Ex.: Site institucional"/></div><div class="form-row"><div class="field"><label for="l-stage">Etapa</label><select id="l-stage" v-model="form.stage"><option v-for="stage in stages" :key="stage" :value="stage">{{ leadLabels[stage] }}</option></select></div><div class="field"><label for="l-value">Estimativa (R$)</label><input id="l-value" v-model.number="form.value" type="number" min="0" step="0.01" required/></div></div><div class="field"><label for="l-notes">Observações</label><textarea id="l-notes" v-model="form.notes" rows="3" maxlength="1000" placeholder="Anotações sobre o contato..."/></div><div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button class="btn btn-dark" type="submit">Salvar contato</button></div></form></div></div>
  </div>
</template>
