<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckCircle2, ClipboardCopy, FileText, Pencil, Plus, X } from 'lucide-vue-next'
import { markLeadProposal, persistenceError, saveLeadProposal, state } from '../lib/store'
import { confirmAction } from '../lib/confirmation'
import { latestRevision, proposalFromLead, proposalStatusLabel, proposalText, type ProposalInput } from '../lib/proposals'
import { brl } from '../lib/format'
import type { ProposalRevision } from '../lib/types'

const props = defineProps<{ leadId: string }>()
const emit = defineEmits<{ close: [] }>()
const lead = computed(() => state.leads.find(item => item.id === props.leadId) ?? null)
const model = computed(() => lead.value?.serviceId ? state.services.find(item => item.id === lead.value?.serviceId) ?? null : null)
const proposal = computed(() => state.leadProposals.find(item => item.leadId === props.leadId) ?? null)
const current = computed(() => latestRevision(proposal.value))
const selectedVersion = ref<number | null>(null)
const viewing = computed(() => proposal.value?.revisions.find(item => item.number === selectedVersion.value) ?? current.value)
const locked = computed(() => Boolean(lead.value?.convertedProjectId))
const editing = ref(!proposal.value)
const error = ref('')
const notice = ref('')
const busy = ref(false)
const form = reactive<ProposalInput>({ serviceName: '', scope: '', exclusions: '', price: 0, deliveryTerms: '', revisionRounds: 0, paymentTerms: '', notes: '' })
const baseline = ref('')
function fillForm(input: ProposalInput) {
  Object.assign(form, {
    serviceName: input.serviceName, scope: input.scope, exclusions: input.exclusions,
    price: input.price, deliveryTerms: input.deliveryTerms, revisionRounds: input.revisionRounds,
    paymentTerms: input.paymentTerms, notes: input.notes,
  })
  baseline.value = JSON.stringify(form)
}
fillForm(current.value ?? (lead.value ? proposalFromLead(lead.value, model.value) : {
  serviceName: '', scope: '', exclusions: '', price: 0, deliveryTerms: '', revisionRounds: 0, paymentTerms: '', notes: '',
}))
const unsaved = computed(() => editing.value && JSON.stringify(form) !== baseline.value)
async function close() {
  if (unsaved.value && !(await confirmAction({ title: 'Descartar alterações?', message: 'As modificações que você fez na proposta ainda não foram salvas.', confirmLabel: 'Descartar alterações', tone: 'danger' }))) return
  emit('close')
}
function editDraft() {
  if (!current.value || current.value.status !== 'rascunho' || locked.value) return
  fillForm(current.value)
  editing.value = true
  error.value = ''
  notice.value = ''
}
function startRevision() {
  if (locked.value || current.value?.status === 'aceita') return
  if (current.value) fillForm(current.value)
  editing.value = true
  error.value = ''
  notice.value = ''
}
async function cancelEdit() {
  if (unsaved.value && !(await confirmAction({ title: 'Descartar edição do orçamento?', message: 'As mudanças não salvas serão perdidas. A versão anterior continuará disponível.', confirmLabel: 'Descartar edição', tone: 'danger' }))) return
  if (!proposal.value) { emit('close'); return }
  editing.value = false
  error.value = ''
}
function save() {
  if (!lead.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    saveLeadProposal(props.leadId, {
      ...form, serviceName: form.serviceName.trim(), price: Number(form.price),
      revisionRounds: Number(form.revisionRounds),
    })
    if (persistenceError.value) { error.value = persistenceError.value; return }
    editing.value = false
    selectedVersion.value = null
    notice.value = 'Rascunho salvo. A proposta não foi enviada ao cliente.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a proposta.' }
  finally { busy.value = false }
}
async function mark(status: 'enviada' | 'aceita' | 'recusada') {
  if (!lead.value) return
  const message = status === 'enviada'
    ? 'Você já enviou esta versão para o cliente? Essa ação apenas registra o envio; a Central não envia mensagens.'
    : status === 'aceita' ? 'O cliente confirmou que aceita esta versão? Isso não cria projeto nem registra pagamento.'
      : 'Registrar que o cliente recusou esta versão da proposta?'
  if (!(await confirmAction({
    title: status === 'enviada' ? 'Registrar envio da proposta?' : status === 'aceita' ? 'Confirmar aceite do cliente?' : 'Registrar recusa da proposta?',
    message,
    confirmLabel: status === 'enviada' ? 'Registrar envio' : status === 'aceita' ? 'Registrar aceite' : 'Registrar recusa',
    tone: status === 'recusada' ? 'danger' : 'primary',
  }))) return
  error.value = ''
  try {
    markLeadProposal(props.leadId, status)
    if (persistenceError.value) { error.value = persistenceError.value; return }
    notice.value = status === 'enviada' ? 'Envio registrado. Nenhuma mensagem foi enviada pela Central.'
      : status === 'aceita' ? 'Aceite registrado. Converta a oportunidade em projeto quando combinar o início.'
        : 'Recusa registrada. Você pode criar uma nova versão da proposta.'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar a proposta.' }
}
async function copy() {
  if (!lead.value || !viewing.value) return
  error.value = ''; notice.value = ''
  try {
    await navigator.clipboard.writeText(proposalText(lead.value.name, viewing.value))
    notice.value = 'Texto copiado. Revise os dados antes de compartilhar manualmente.'
  } catch { error.value = 'Não foi possível copiar automaticamente. Confira as permissões do navegador.' }
}
function versionLabel(item: ProposalRevision) { return `Versão ${item.number} · ${proposalStatusLabel[item.status]}` }
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop proposal-backdrop" @click.self="close">
      <div v-if="lead" class="modal modal-wide proposal-dialog" role="dialog" aria-modal="true" aria-labelledby="proposal-title">
        <header class="modal-head proposal-header">
          <div><p class="section-kicker">ORÇAMENTO COMERCIAL</p><h2 id="proposal-title">Proposta para {{ lead.name }}</h2><p class="proposal-subtitle">Cada versão mantém seu próprio escopo e preço, sem alterar o catálogo.</p></div>
          <button type="button" class="icon-button" aria-label="Fechar proposta" @click="close"><X :size="18"/></button>
        </header>
        <p v-if="notice" class="inline-notice" role="status">{{ notice }}</p>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>

        <template v-if="editing">
          <div class="proposal-editor-intro"><FileText :size="18"/><p>{{ current?.status === 'rascunho' ? 'Edite o rascunho atual.' : current ? 'Nova versão: o orçamento anterior ficará preservado no histórico.' : 'Prepare um primeiro rascunho usando as informações da oportunidade e do modelo.' }}</p></div>
          <form @submit.prevent="save">
            <div class="field"><label for="prop-service">Nome do serviço *</label><input id="prop-service" v-model="form.serviceName" maxlength="120" required/></div>
            <div class="field"><label for="prop-scope">O que está incluído no trabalho</label><textarea id="prop-scope" v-model="form.scope" rows="5" maxlength="4000" placeholder="Descreva as entregas, páginas e funcionalidades"/></div>
            <div class="field"><label for="prop-exclusions">O que não está incluído</label><textarea id="prop-exclusions" v-model="form.exclusions" rows="3" maxlength="3000" placeholder="Ex.: hospedagem, alterações ilimitadas"/></div>
            <div class="form-row"><div class="field"><label for="prop-price">Valor proposto (R$) *</label><input id="prop-price" v-model.number="form.price" type="number" min="0" step="0.01" required/></div><div class="field"><label for="prop-rounds">Rodadas de revisão incluídas</label><input id="prop-rounds" v-model.number="form.revisionRounds" type="number" min="0" max="20" step="1" required/></div></div>
            <div class="field"><label for="prop-delivery">Prazo e condições de entrega</label><textarea id="prop-delivery" v-model="form.deliveryTerms" rows="2" maxlength="500" placeholder="Ex.: até 15 dias úteis após receber todos os materiais"/></div>
            <div class="field"><label for="prop-payment">Condições de pagamento</label><textarea id="prop-payment" v-model="form.paymentTerms" rows="2" maxlength="1000" placeholder="Ex.: 50% de sinal e 50% na entrega"/></div>
            <div class="field"><label for="prop-notes">Observações adicionais</label><textarea id="prop-notes" v-model="form.notes" rows="2" maxlength="2000"/></div>
            <p class="proposal-subtitle">Você pode salvar um rascunho incompleto. Para marcar como enviada, confirme escopo, valor, prazo e condições de pagamento. O envio ao cliente é manual.</p>
            <div class="modal-actions"><button type="button" class="btn btn-outline" @click="cancelEdit">Cancelar</button><button type="submit" class="btn btn-dark" :disabled="busy">Salvar rascunho</button></div>
          </form>
        </template>

        <template v-else-if="viewing">
          <div class="proposal-tools">
            <div class="proposal-version-picker"><label for="prop-versions">Histórico</label><select id="prop-versions" v-model="selectedVersion"><option :value="null">Versão atual</option><option v-for="revision in proposal?.revisions.slice().reverse()" :key="revision.id" :value="revision.number">{{ versionLabel(revision) }}</option></select></div>
            <span class="pill proposal-status">{{ proposalStatusLabel[viewing.status] }}</span>
            <button type="button" class="btn btn-outline btn-slim" @click="copy"><ClipboardCopy :size="15"/> Copiar texto</button>
          </div>
          <article class="proposal-document">
            <header><span>PROPOSTA DE SERVIÇO · VERSÃO {{ viewing.number }}</span><h3>{{ viewing.serviceName }}</h3><p>Preparada para {{ lead.name }}</p></header>
            <section><h4>Escopo incluído</h4><p>{{ viewing.scope || 'A definir' }}</p></section>
            <section><h4>Fora do escopo</h4><p>{{ viewing.exclusions || 'A combinar' }}</p></section>
            <section class="proposal-columns"><div><h4>Revisões incluídas</h4><p>{{ viewing.revisionRounds }} rodada(s)</p></div><div><h4>Prazo e entrega</h4><p>{{ viewing.deliveryTerms || 'A combinar' }}</p></div></section>
            <section><h4>Condições de pagamento</h4><p>{{ viewing.paymentTerms || 'A combinar' }}</p></section>
            <section v-if="viewing.notes.trim()"><h4>Observações</h4><p>{{ viewing.notes }}</p></section>
            <footer><span>Valor proposto</span><strong>{{ brl(viewing.price) }}</strong></footer>
          </article>
          <p class="proposal-subtitle">Esta visualização é um documento de referência local. A Central não envia propostas, não coleta assinaturas e não cria pagamentos automaticamente.</p>
          <div v-if="viewing.id === current?.id && !locked" class="proposal-actions">
            <button v-if="current?.status === 'rascunho'" type="button" class="btn btn-outline" @click="editDraft"><Pencil :size="15"/> Editar rascunho</button>
            <button v-if="current?.status === 'rascunho'" type="button" class="btn btn-dark" @click="mark('enviada')"><CheckCircle2 :size="15"/> Marcar como enviada</button>
            <button v-if="current?.status === 'enviada'" type="button" class="btn btn-outline" @click="mark('recusada')">Registrar recusa</button>
            <button v-if="current?.status === 'enviada'" type="button" class="btn btn-dark" @click="mark('aceita')">Registrar aceite</button>
            <button v-if="current?.status === 'enviada' || current?.status === 'recusada'" type="button" class="btn btn-outline" @click="startRevision"><Plus :size="15"/> Criar nova versão</button>
            <p v-if="current?.status === 'aceita'" class="proposal-accepted-note"><CheckCircle2 :size="17"/> Proposta aceita. A conversão em projeto continua sendo uma decisão separada.</p>
          </div>
          <div v-else-if="locked" class="proposal-accepted-note"><CheckCircle2 :size="17"/> O projeto já foi criado; este histórico fica disponível somente para consulta.</div>
          <div v-else class="proposal-accepted-note">Você está consultando uma versão anterior. O histórico não pode ser alterado.</div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
