<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Pencil, Plus, Trash2, Wallet } from 'lucide-vue-next'
import { state, metrics, addTransaction, persistenceError, removeItem, updateTransaction } from '../lib/store'
import { brl, dateBR, todayLocal } from '../lib/format'
import type { Transaction, TransactionType } from '../lib/types'

import { confirmAction } from '../lib/confirmation'
const emit = defineEmits<{ openProject: [id: string] }>()
const showForm = ref(false)
const editingId = ref<string | null>(null)
const error = ref('')
const feedback = ref('')
const form = reactive({ description: '', kind: 'entrada' as TransactionType, amount: 0, date: todayLocal(), projectId: '' })
function reset() { Object.assign(form, { description: '', kind: 'entrada', amount: 0, date: todayLocal(), projectId: '' }); editingId.value = null; error.value = '' }
function create() { reset(); feedback.value = ''; showForm.value = true }
function edit(item: Transaction) { editingId.value = item.id; Object.assign(form, { description: item.description, kind: item.kind, amount: item.amount, date: item.date, projectId: item.projectId ?? '' }); error.value = ''; feedback.value = ''; showForm.value = true }
function submit() {
  error.value = ''
  if (!form.description.trim() || !form.date || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) { error.value = 'Informe descrição, data e um valor maior que zero.'; return }
  try {
    const payload = { description: form.description.trim(), kind: form.kind, amount: Number(form.amount), date: form.date, projectId: form.projectId || null }
    if (editingId.value) updateTransaction(editingId.value, payload)
    else addTransaction(payload)
    feedback.value = persistenceError.value || (editingId.value ? 'Lançamento atualizado e salvo neste dispositivo.' : 'Lançamento registrado e salvo neste dispositivo.')
    showForm.value = false
    reset()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o lançamento.' }
}
async function drop(id: string) { if (await confirmAction({ title: 'Excluir lançamento financeiro?', message: 'O lançamento será removido do caixa e os totais serão recalculados.', confirmLabel: 'Excluir lançamento', tone: 'danger' })) removeItem('transactions', id) }
</script>

<template>
  <div class="view-enter">
    <div class="page-intro"><div><p class="eyebrow"><span class="eyebrow-line"></span> FLUXO DE CAIXA</p><h1>Financeiro</h1><p class="page-subtitle">Registre recebimentos e despesas e vincule cada lançamento a um projeto.</p></div><button class="btn btn-dark" @click="create"><Plus :size="17"/> Novo lançamento</button></div>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <div class="finance-summary"><div class="surface finance-box"><span><ArrowDownLeft :size="16"/> Receitas</span><strong>{{ brl(metrics.income) }}</strong><small>Entradas registradas no histórico</small></div><div class="surface finance-box"><span><ArrowUpRight :size="16"/> Despesas</span><strong>{{ brl(metrics.expenses) }}</strong><small>Saídas registradas no histórico</small></div><div class="surface finance-box balance"><span><Wallet :size="16"/> Saldo</span><strong>{{ brl(metrics.balance) }}</strong><small>Entradas menos saídas</small></div></div>
    <div class="surface"><div class="list-toolbar"><h2>Movimentações</h2><span class="item-counter">{{ state.transactions.length }} registro(s)</span></div><div class="table-wrap">
      <table v-if="state.transactions.length" class="data-table"><thead><tr><th>DESCRIÇÃO</th><th>PROJETO</th><th>DATA</th><th>TIPO</th><th>VALOR</th><th>AÇÕES</th></tr></thead><tbody>
        <tr v-for="transaction in state.transactions" :key="transaction.id"><td class="strong">{{ transaction.description }}</td><td><button v-if="transaction.projectId && state.projects.some(project => project.id === transaction.projectId)" class="table-link" @click="emit('openProject', transaction.projectId)">{{ state.projects.find(project => project.id === transaction.projectId)?.name }} <ArrowRight :size="13"/></button><span v-else class="item-counter">Sem projeto</span></td><td>{{ dateBR(transaction.date) }}</td><td><span class="pill" :class="transaction.kind">{{ transaction.kind === 'entrada' ? 'Entrada' : 'Saída' }}</span></td><td class="strong" :class="transaction.kind === 'entrada' ? 'positive' : 'negative'">{{ transaction.kind === 'entrada' ? '+' : '−' }} {{ brl(transaction.amount) }}</td><td><div class="row-actions"><button class="icon-button" :aria-label="`Editar ${transaction.description}`" @click="edit(transaction)"><Pencil :size="15"/></button><button class="icon-button danger" :aria-label="`Excluir ${transaction.description}`" @click="drop(transaction.id)"><Trash2 :size="16"/></button></div></td></tr>
      </tbody></table><div v-else class="empty"><Wallet :size="27"/><b>Nenhum lançamento por aqui</b><p>Acompanhe recebimentos e custos. O preço combinado do projeto não cria entradas automaticamente.</p><button class="btn btn-outline" @click="create">Registrar movimentação</button></div>
    </div></div>
    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="finance-title"><div class="modal-head"><h2 id="finance-title">{{ editingId ? 'Editar lançamento' : 'Novo lançamento' }}</h2><button class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="submit"><div class="field"><label for="f-description">Descrição *</label><input id="f-description" v-model="form.description" required maxlength="150" autofocus/></div><div class="form-row"><div class="field"><label for="f-kind">Tipo</label><select id="f-kind" v-model="form.kind"><option value="entrada">Entrada / recebimento</option><option value="saida">Saída / despesa</option></select></div><div class="field"><label for="f-amount">Valor (R$) *</label><input id="f-amount" v-model.number="form.amount" required type="number" min="0.01" step="0.01"/></div></div>
        <div class="field"><label for="f-date">Data *</label><input id="f-date" v-model="form.date" type="date" required/></div><div class="field"><label for="f-project">Projeto relacionado</label><select id="f-project" v-model="form.projectId"><option value="">Sem projeto</option><option v-for="project in state.projects" :key="project.id" :value="project.id">{{ project.name }} · {{ project.client }}</option></select></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p><div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button type="submit" class="btn btn-dark">{{ editingId ? 'Salvar alterações' : 'Salvar lançamento' }}</button></div>
      </form>
    </div></div></Teleport>
  </div>
</template>
