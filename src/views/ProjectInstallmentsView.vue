<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { state, addProjectInstallment, updateProjectInstallment, removeProjectInstallment, persistenceError } from '../lib/store'
import { installmentBalance, installmentReceived } from '../lib/projectMilestones'
import { confirmAction } from '../lib/confirmation'
import { brl, dateBR, todayLocal } from '../lib/format'
import type { ProjectInstallment } from '../lib/types'

const props = defineProps<{ projectId: string }>()
const installments = computed(() => state.projectInstallments.filter(row => row.projectId === props.projectId)
  .slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)))
const linked = computed(() => state.transactions.filter(tx => tx.projectId === props.projectId && tx.kind === 'entrada'))
const sumPlanned = computed(() => installments.value.reduce((sum, item) => sum + item.amount, 0))
const editingId = ref<string | null>(null)
const showForm = ref(false)
const error = ref('')
const feedback = ref('')
const form = reactive({ title: '', amount: 0, dueDate: todayLocal(), receivedTransactionIds: [] as string[] })
const availableReceipts = computed(() => linked.value.filter(tx => form.receivedTransactionIds.includes(tx.id) ||
  !state.projectInstallments.some(row => row.id !== editingId.value && row.receivedTransactionIds.includes(tx.id))))
function startNew() { editingId.value = null; Object.assign(form, { title: '', amount: 0, dueDate: todayLocal(), receivedTransactionIds: [] }); error.value = ''; feedback.value = ''; showForm.value = true }
function edit(item: ProjectInstallment) {
  editingId.value = item.id
  Object.assign(form, { title: item.title, amount: item.amount, dueDate: item.dueDate, receivedTransactionIds: [...item.receivedTransactionIds] })
  error.value = ''; feedback.value = ''; showForm.value = true
}
function toggleReceipt(id: string, selected: boolean) {
  form.receivedTransactionIds = selected ? [...form.receivedTransactionIds, id] : form.receivedTransactionIds.filter(item => item !== id)
}
function save() {
  error.value = ''
  try {
    const input = { ...form, title: form.title.trim(), amount: Number(form.amount), projectId: props.projectId }
    if (editingId.value) updateProjectInstallment(editingId.value, input)
    else addProjectInstallment(input)
    if (persistenceError.value) { error.value = persistenceError.value; return }
    feedback.value = 'Cobrança prevista salva. Nenhum recebimento foi criado.'
    showForm.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a previsão.' }
}
async function drop(item: ProjectInstallment) {
  if (!(await confirmAction({ title: 'Excluir parcela prevista?', message: `A previsão “${item.title}” será removida. Os recebimentos já lançados continuarão no financeiro.`, confirmLabel: 'Excluir previsão', tone: 'danger' }))) return
  try { removeProjectInstallment(item.id, props.projectId); feedback.value = persistenceError.value || 'Previsão excluída sem alterar o caixa.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível excluir a previsão.' }
}
</script>

<template>
  <section class="surface detail-section project-installments">
    <div class="section-top">
      <div><p class="section-kicker">PLANEJAMENTO FINANCEIRO</p><h2>Cobranças previstas</h2></div>
      <button type="button" class="btn btn-outline btn-slim" @click="startNew"><Plus :size="15"/> Adicionar parcela</button>
    </div>
    <p class="planned-explanation">Cadastre somente valores e vencimentos combinados. Uma parcela não entra no caixa até existir um recebimento real, registrado separadamente.</p>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="installments.length" class="planned-totals"><b>Total previsto: {{ brl(sumPlanned) }}</b><span>Preço contratado e recebimentos realizados continuam separados.</span></p>
    <div v-if="installments.length" class="planned-list">
      <article v-for="item in installments" :key="item.id" class="planned-row">
        <div><strong>{{ item.title }}</strong><small>Vencimento combinado: {{ dateBR(item.dueDate) }}</small>
          <small>{{ installmentReceived(item, state.transactions) > 0 ? 'Recebimento(s) associado(s) manualmente' : 'Nenhum recebimento vinculado' }}</small></div>
        <div class="planned-values"><b>{{ brl(item.amount) }}</b><small>Vinculado: {{ brl(installmentReceived(item, state.transactions)) }}</small><small>Diferença: {{ brl(installmentBalance(item, state.transactions)) }}</small></div>
        <div class="row-actions"><button type="button" class="icon-button" :aria-label="`Editar ${item.title}`" @click="edit(item)"><Pencil :size="15"/></button>
          <button type="button" class="icon-button danger" :aria-label="`Excluir ${item.title}`" @click="drop(item)"><Trash2 :size="15"/></button></div>
      </article>
    </div>
    <div v-else class="empty compact"><b>Sem cobranças planejadas</b><p>Adicione a entrada, as parcelas ou o pagamento final quando esses termos forem combinados.</p></div>
    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="installment-title">
      <div class="modal-head"><h2 id="installment-title">{{ editingId ? 'Editar parcela prevista' : 'Nova parcela prevista' }}</h2><button type="button" class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="save">
        <div class="field"><label for="installment-name">Descrição *</label><input id="installment-name" v-model="form.title" maxlength="120" required placeholder="Ex.: Sinal de 50%"/></div>
        <div class="form-row"><div class="field"><label for="installment-amount">Valor previsto (R$) *</label><input id="installment-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" required/></div><div class="field"><label for="installment-date">Vencimento combinado *</label><input id="installment-date" v-model="form.dueDate" type="date" required/></div></div>
        <fieldset class="planned-receipt-links"><legend>Vincular recebimentos já registrados (opcional)</legend>
          <p>Marcar um lançamento associa o pagamento à parcela, sem criar outra entrada de caixa. Você também pode vincular pagamentos parciais.</p>
          <label v-for="tx in availableReceipts" :key="tx.id" class="planned-receipt-option">
            <input type="checkbox" :checked="form.receivedTransactionIds.includes(tx.id)" @change="toggleReceipt(tx.id, ($event.target as HTMLInputElement).checked)"/>
            <span>{{ tx.description }} · {{ dateBR(tx.date) }} · {{ brl(tx.amount) }}</span>
          </label>
          <small v-if="!availableReceipts.length">Nenhuma entrada disponível. Registre o recebimento real na seção abaixo e depois volte para vincular.</small>
        </fieldset>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button type="submit" class="btn btn-dark">Salvar previsão</button></div>
      </form>
    </div></div></Teleport>
  </section>
</template>
