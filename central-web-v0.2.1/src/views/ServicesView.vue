<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Calculator, Plus, Trash2, Info } from 'lucide-vue-next'
import { state, addService, removeItem } from '../lib/store'
import { brl } from '../lib/format'
import { serviceFloor, serviceSuggestion } from '../lib/pricing'
const showForm = ref(false)
const form = reactive({name:'',hours:4,hourlyRate:30,extras:0,contingency:0.15,scope:'',exclusions:'',availability:'Oferecer já'})

function submit(){if(!form.name.trim())return;addService({...form,name:form.name.trim()});form.name='';form.scope='';form.exclusions='';showForm.value=false}
function drop(id:string){if(confirm('Excluir serviço do catálogo?'))removeItem('services',id)}
</script>
<template>
<div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> OFERTA COMERCIAL</p><h1>Serviços e preços</h1><p class="page-subtitle">Catálogo inicial da planilha com simulador baseado em horas, custo e reserva.</p></div><button class="btn btn-dark" @click="showForm=true"><Plus :size="17"/> Novo serviço</button></div>
  <div class="notice-box subtle-notice"><Info :size="22"/><div><b>Simulação, não tabela de mercado.</b><p>Piso = horas × valor da hora × (1 + reserva) + custos extras. Ajuste conforme esforço, tributos, riscos, domínio e hospedagem. O valor arredondado é apenas referência para orçamento.</p></div></div>
  <div class="service-grid"><article v-for="s in state.services" :key="s.id" class="surface service-card"><header><div><p class="section-kicker">{{s.availability}}</p><h2>{{s.name}}</h2></div><button class="icon-button danger" :aria-label="'Excluir '+s.name" @click="drop(s.id)"><Trash2 :size="16"/></button></header>
    <div class="price-result"><span>Referência arredondada</span><strong>{{brl(serviceSuggestion(s))}}</strong><small>Piso calculado: {{brl(serviceFloor(s))}}</small></div>
    <div class="form-row"><div class="field"><label :for="s.id+'-hrs'">Horas previstas</label><input :id="s.id+'-hrs'" v-model.number="s.hours" type="number" min="0" step="0.5" /></div><div class="field"><label :for="s.id+'-rate'">R$/hora</label><input :id="s.id+'-rate'" v-model.number="s.hourlyRate" type="number" min="0" step="1" /></div></div>
    <div class="form-row"><div class="field"><label :for="s.id+'-extra'">Custos extras (R$)</label><input :id="s.id+'-extra'" v-model.number="s.extras" type="number" min="0" step="1" /></div><div class="field"><label :for="s.id+'-margin'">Reserva (%)</label><select :id="s.id+'-margin'" v-model.number="s.contingency"><option :value="0">0%</option><option :value="0.1">10%</option><option :value="0.15">15%</option><option :value="0.2">20%</option><option :value="0.25">25%</option><option :value="0.3">30%</option><option :value="0.4">40%</option><option :value="0.5">50%</option></select></div></div>
    <div class="field"><label :for="s.id+'-scope'">Inclui</label><textarea :id="s.id+'-scope'" v-model="s.scope" rows="2" maxlength="600" /></div><div class="field"><label :for="s.id+'-exclude'">Fora do escopo</label><textarea :id="s.id+'-exclude'" v-model="s.exclusions" rows="2" maxlength="600" /></div><div class="field"><label :for="s.id+'-stage'">Disponibilidade</label><select :id="s.id+'-stage'" v-model="s.availability"><option>Oferecer já</option><option>Fase 2</option><option>Sob consulta</option><option>Indisponível</option></select></div>
  </article></div>
  <div v-if="!state.services.length" class="surface empty"><Calculator :size="26"/><b>Sem serviços cadastrados</b><p>Comece pelo seu primeiro convite.</p></div>
  <div v-if="showForm" class="modal-backdrop" @click.self="showForm=false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="serv-modal"><div class="modal-head"><h2 id="serv-modal">Novo serviço</h2><button class="icon-button" aria-label="Fechar" @click="showForm=false">✕</button></div><form @submit.prevent="submit"><div class="field"><label>Nome *</label><input v-model="form.name" maxlength="150" autofocus required/></div><div class="form-row"><div class="field"><label>Horas</label><input v-model.number="form.hours" type="number" min="0" step="0.5" /></div><div class="field"><label>R$/hora</label><input v-model.number="form.hourlyRate" type="number" min="0" /></div></div><div class="field"><label>O que inclui</label><textarea v-model="form.scope" rows="2"/></div><div class="field"><label>Fora do escopo</label><textarea v-model="form.exclusions" rows="2"/></div><div class="modal-actions"><button class="btn btn-outline" type="button" @click="showForm=false">Cancelar</button><button class="btn btn-dark">Criar serviço</button></div></form></div></div>
</div>
</template>
