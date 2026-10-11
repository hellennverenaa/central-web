<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ClipboardList, Copy, Plus, Trash2, Info } from 'lucide-vue-next'
import { state, addBriefingQuestion, removeItem } from '../lib/store'
const phase=ref('Todas')
const copied=ref('')
const showForm=ref(false)
const form=reactive({phase:'Primeiro contato',question:'',reason:'',required:'Sim',answer:'',nextAction:'',notes:''})
const phases=computed(()=>['Todas',...new Set(state.briefing.map(q=>q.phase))])
const visible=computed(()=>state.briefing.filter(q=>phase.value==='Todas'||q.phase===phase.value))
function submit(){if(!form.question.trim())return;addBriefingQuestion({...form,question:form.question.trim()});form.question='';form.reason='';form.nextAction='';showForm.value=false}
function drop(id:string){if(confirm('Remover pergunta do roteiro?'))removeItem('briefing',id)}
async function copy(){const txt=visible.value.map(q=>`• ${q.question}`).join('\n');try{await navigator.clipboard.writeText(txt);copied.value='Perguntas copiadas!'}catch{copied.value='Copie manualmente: seu navegador bloqueou a área de transferência.'}}
</script>
<template>
<div class="view-enter"><div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> ATENDIMENTO AO CLIENTE</p><h1>Roteiro de briefing</h1><p class="page-subtitle">Perguntas e ações pós-contato, organizadas por fase e tipo de serviço.</p></div><button class="btn btn-dark" @click="showForm=true"><Plus :size="17"/> Nova pergunta</button></div>
<div class="notice-box subtle-notice"><Info :size="22"/><div><b>Este módulo contém modelos de perguntas.</b><p>Copie o roteiro e adapte para cada cliente. Nesta versão local, não registre respostas com dados pessoais reais; o armazenamento seguro virá na etapa de backend.</p></div></div>
<div class="filter-pills"><button v-for="f in phases" :key="f" :class="['filter-pill',{active:phase===f}]" @click="phase=f">{{f}}</button></div>
<div class="surface"><div class="list-toolbar"><h2>Checklist de atendimento</h2><button class="btn btn-outline btn-slim" @click="copy"><Copy :size="16"/> Copiar perguntas desta seleção</button></div><div v-if="visible.length" class="briefing-list"><article v-for="q in visible" :key="q.id" class="briefing-item"><div class="briefing-head"><span class="brief-tag">{{q.phase}}</span><span class="item-counter">{{q.required}}</span><button class="icon-button danger" :aria-label="'Excluir '+q.question" @click="drop(q.id)"><Trash2 :size="15"/></button></div><h3>{{q.question}}</h3><p>{{q.reason}}</p><div class="callout-step"><b>Depois:</b> {{q.nextAction}}</div></article></div><div v-else class="empty"><ClipboardList :size="25"/><b>Sem perguntas nesta fase.</b></div></div><p v-if="copied" role="status" class="inline-notice">{{copied}}</p>
<div v-if="showForm" class="modal-backdrop" @click.self="showForm=false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="brief-modal"><div class="modal-head"><h2 id="brief-modal">Nova pergunta</h2><button class="icon-button" aria-label="Fechar" @click="showForm=false">✕</button></div><form @submit.prevent="submit"><div class="field"><label>Fase</label><input v-model="form.phase" maxlength="100" required /></div><div class="field"><label>Pergunta *</label><textarea v-model="form.question" rows="2" maxlength="400" required autofocus/></div><div class="field"><label>Motivo</label><input v-model="form.reason" maxlength="400"/></div><div class="field"><label>Ação seguinte</label><input v-model="form.nextAction" maxlength="400"/></div><div class="field"><label>Obrigatória?</label><select v-model="form.required"><option>Sim</option><option>Opcional</option><option>Se for site</option><option>Se for evento</option></select></div><div class="modal-actions"><button class="btn btn-outline" type="button" @click="showForm=false">Cancelar</button><button class="btn btn-dark">Salvar pergunta</button></div></form></div></div>
</div>
</template>
