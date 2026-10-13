<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, ClipboardCheck, ExternalLink } from 'lucide-vue-next'
import { state, saveProjectDelivery, persistenceError } from '../lib/store'
import { confirmAction } from '../lib/confirmation'
import { dateBR } from '../lib/format'

const props = defineProps<{ projectId: string }>()
const current = computed(() => state.projectDeliveries.find(item => item.projectId === props.projectId) ?? null)
const project = computed(() => state.projects.find(item => item.id === props.projectId))
const deliveryLinks = computed(() => state.projectMaterials.filter(item => item.projectId === props.projectId && item.category === 'entrega'))
const showForm = ref(false)
const error = ref('')
const feedback = ref('')
const form = reactive({ reviewSentAt: '', approvedAt: '', deliveredAt: '', notes: '' })
function openEdit() {
  Object.assign(form, {
    reviewSentAt: current.value?.reviewSentAt ?? '',
    approvedAt: current.value?.approvedAt ?? '',
    deliveredAt: current.value?.deliveredAt ?? '',
    notes: current.value?.notes ?? '',
  })
  error.value = ''; feedback.value = ''; showForm.value = true
}
async function save() {
  error.value = ''
  try {
    if (form.deliveredAt && !current.value?.deliveredAt &&
        !(await confirmAction({ title: 'Confirmar entrega final?', message: 'Ao confirmar a data de entrega, o status deste projeto será atualizado para Entregue. Nenhum recebimento será criado.', confirmLabel: 'Confirmar entrega' }))) return
    saveProjectDelivery({ ...form, projectId: props.projectId })
    if (persistenceError.value) { error.value = persistenceError.value; return }
    feedback.value = 'Etapas de revisão e entrega atualizadas neste projeto.'
    showForm.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a entrega.' }
}
// Ao trocar de projeto, não mostrar modal com dados do anterior.
watch(() => props.projectId, () => { showForm.value = false; error.value = ''; feedback.value = '' })
</script>

<template>
  <section class="surface detail-section project-delivery">
    <div class="section-top"><div><p class="section-kicker">APROVAÇÃO E FINALIZAÇÃO</p><h2>Revisão e entrega</h2></div><button class="btn btn-outline btn-slim" type="button" @click="openEdit">Atualizar etapas</button></div>
    <p class="planned-explanation">Registre as datas reais de envio para revisão, aprovação do cliente e entrega final. Essas etapas não são preenchidas automaticamente.</p>
    <p v-if="feedback" class="inline-notice" role="status">{{ feedback }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="delivery-milestones">
      <div><ClipboardCheck :size="21"/><span>Enviado para revisão</span><strong>{{ current?.reviewSentAt ? dateBR(current.reviewSentAt) : 'Não registrado' }}</strong></div>
      <div><CheckCircle2 :size="21"/><span>Aprovação do cliente</span><strong>{{ current?.approvedAt ? dateBR(current.approvedAt) : 'Não registrada' }}</strong></div>
      <div><CheckCircle2 :size="21"/><span>Entrega final</span><strong>{{ current?.deliveredAt ? dateBR(current.deliveredAt) : project?.status === 'entregue' ? 'Status entregue (sem data)' : 'Não registrada' }}</strong></div>
    </div>
    <div v-if="current?.notes" class="delivery-notes"><b>Observações da revisão</b><p>{{ current.notes }}</p></div>
    <div v-if="deliveryLinks.length" class="delivery-links"><b>Links de entrega cadastrados em Materiais</b><a v-for="link in deliveryLinks" :key="link.id" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.name }} <ExternalLink :size="13"/></a></div>
    <p v-else class="planned-explanation">Você pode cadastrar o endereço do site ou convite entregue na aba Materiais, usando a categoria Entrega.</p>
    <Teleport to="body"><div v-if="showForm" class="modal-backdrop" @click.self="showForm = false"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
      <div class="modal-head"><h2 id="delivery-title">Atualizar revisão e entrega</h2><button type="button" class="icon-button" aria-label="Fechar" @click="showForm = false">✕</button></div>
      <form @submit.prevent="save">
        <p class="form-hint">Deixe vazias as etapas ainda não confirmadas. Se preencher a entrega final, o projeto será marcado como Entregue.</p>
        <div class="field"><label for="delivery-review">Data do envio para revisão</label><input id="delivery-review" v-model="form.reviewSentAt" type="date"/></div>
        <div class="field"><label for="delivery-approved">Data da aprovação pelo cliente</label><input id="delivery-approved" v-model="form.approvedAt" type="date"/></div>
        <div class="field"><label for="delivery-done">Data da entrega final</label><input id="delivery-done" v-model="form.deliveredAt" type="date"/></div>
        <div class="field"><label for="delivery-notes">Observações ou revisões acordadas</label><textarea id="delivery-notes" v-model="form.notes" rows="4" maxlength="1000"/></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" @click="showForm = false">Cancelar</button><button type="submit" class="btn btn-dark">Salvar etapas</button></div>
      </form>
    </div></div></Teleport>
  </section>
</template>
