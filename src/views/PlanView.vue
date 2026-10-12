<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { CalendarRange, Plus, Trash2, Target, CheckCircle2 } from 'lucide-vue-next'
import { state, metrics, addPlan, removeItem } from '../lib/store'
import type { PlanStatus } from '../lib/types'
const week = ref('Todas')
const showForm = ref(false)
const form = reactive({week:'Semana 1', title:'', goal:'', priority:'Média', status:'nao-iniciado' as PlanStatus, hours:1, nextStep:'', notes:''})
const weeks = ['Todas','Semana 1','Semana 2','Semana 3','Semana 4','Extras']
const visible = computed(() => state.plan.filter(p=>week.value === 'Todas' || p.week === week.value))
const percent = computed(() => metrics.value.planTotal ? Math.round(100*metrics.value.planDone/metrics.value.planTotal) : 0)
function submit(){ if(!form.title.trim())return; addPlan({...form,title:form.title.trim(),hours:Number(form.hours) || 0}); form.title='';form.goal='';form.nextStep='';form.notes='';showForm.value=false }
function drop(id:string){if(confirm('Remover esta tarefa do plano?'))removeItem('plan',id)}
</script>
<template>
<div class="view-enter">
  <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> ESTRATÉGIA DE LANÇAMENTO</p><h1>Plano de 30 dias</h1><p class="page-subtitle">Seu roteiro original, agora com progresso editável e acompanhamento por semana.</p></div><button class="btn btn-dark" @click="showForm=true"><Plus :size="17"/> Nova ação</button></div>
  <div class="surface module-summary"><div><p class="section-kicker">PROGRESSO DA PREPARAÇÃO</p><strong>{{ percent }}%</strong><span>{{ metrics.planDone }} de {{ metrics.planTotal }} ações concluídas</span></div><div class="progress-track" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"><div :style="{width:percent+'%'}"></div></div><CheckCircle2 :size="25" class="muted-icon"/></div>
  <div class="filter-pills"><button v-for="w in weeks" :key="w" :class="['filter-pill',{ active:week===w }]" @click="week=w">{{ w }}</button></div>
  <div class="surface"><div class="list-toolbar"><h2>Ações do lançamento</h2><span class="item-counter">{{ visible.length }} itens · estimativa {{ visible.reduce((a,b)=>a+b.hours,0) }} h</span></div>
    <div v-if="visible.length" class="plan-list"><article v-for="item in visible" :key="item.id" class="plan-item"><div class="plan-icon"><Target :size="18" /></div><div class="plan-body"><div class="plan-meta"><span>{{ item.week }}</span><span>· {{ item.priority }}</span><span>· {{ item.hours }}h previstas</span></div><h3>{{ item.title }}</h3><p>{{ item.goal }}</p><div class="callout-step"><b>Próximo passo:</b> {{ item.nextStep || 'Defina uma pequena ação.' }}</div><textarea v-model="item.notes" rows="1" maxlength="500" aria-label="Observações da ação" placeholder="Suas anotações (opcional)" /></div><div class="plan-action"><select v-model="item.status" :aria-label="'Status de '+item.title" class="status-select"><option value="nao-iniciado">Não iniciado</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></select><button class="icon-button danger" :aria-label="'Remover '+item.title" @click="drop(item.id)"><Trash2 :size="16"/></button></div></article></div>
    <div v-else class="empty"><CalendarRange :size="26"/><b>Nenhuma ação nesta semana.</b><p>Crie uma tarefa ou selecione outra semana.</p></div>
  </div>
  <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm=false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="plan-modal"><div class="modal-head"><h2 id="plan-modal">Nova ação do plano</h2><button class="icon-button" aria-label="Fechar" @click="showForm=false">✕</button></div><form @submit.prevent="submit"><div class="field"><label>Tarefa *</label><input v-model="form.title" maxlength="160" required autofocus/></div><div class="form-row"><div class="field"><label>Semana</label><select v-model="form.week"><option v-for="w in weeks.slice(1)" :key="w">{{w}}</option></select></div><div class="field"><label>Prioridade</label><select v-model="form.priority"><option>Alta</option><option>Média</option><option>Baixa</option></select></div></div><div class="field"><label>Objetivo</label><textarea v-model="form.goal" rows="2"/></div><div class="field"><label>Próximo passo</label><input v-model="form.nextStep"/></div><div class="field"><label>Tempo previsto (h)</label><input v-model.number="form.hours" type="number" min="0" step="0.5"/></div><div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm=false">Cancelar</button><button class="btn btn-dark">Salvar ação</button></div></form></div></div></Teleport>
</div>
</template>
