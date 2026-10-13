<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FolderKanban, Plus, X } from 'lucide-vue-next'
import { addLead, convertLeadToProject, persistenceError, state, updateLead } from '../lib/store'
import { brl, todayLocal } from '../lib/format'
import { initialConversionPrice, serviceSuggestion } from '../lib/pricing'
import type { LeadStage, ProjectStatus } from '../lib/types'

const props = defineProps<{ initialLeadId?: string | null }>()
const originalLead = props.initialLeadId ? state.leads.find(item => item.id === props.initialLeadId) ?? null : null
const emit = defineEmits<{
  close: []
  openLead: [id: string]
  openProject: [id: string, notice?: string]
  createDirectProject: []
}>()

type Decision = 'conversa' | 'proposta' | 'fechado'
const stages = ['Cliente', 'Serviço', 'Proposta', 'Decisão'] as const
const step = ref(originalLead ? 2 : 1)
const busy = ref(false)
const error = ref('')
const savedLeadId = ref<string | null>(originalLead?.id ?? null)
const decision = ref<Decision>(originalLead?.stage === 'proposta' ? 'proposta' : 'conversa')
const projectNameEdited = ref(false)
const priceEdited = ref(false)
const form = reactive({
  name: originalLead?.name ?? '', contact: originalLead?.contact ?? '', notes: originalLead?.notes ?? '',
  serviceId: originalLead?.serviceId || (originalLead && originalLead.service !== 'A definir' ? 'custom' : ''),
  customService: originalLead && !originalLead.serviceId && originalLead.service !== 'A definir' ? originalLead.service : '',
  estimate: originalLead?.value ?? 0, agreedPrice: 0, projectName: '', deadline: todayLocal(),
  status: 'planejado' as ProjectStatus, briefingTemplateId: '',
})

const service = computed(() => state.services.find(item => item.id === form.serviceId) ?? null)
const serviceName = computed(() => service.value?.name ?? (form.serviceId === 'custom' ? form.customService.trim() : 'A definir'))
const catalogPrice = computed(() => service.value ? serviceSuggestion(service.value) : null)
const suggestedPrice = computed(() => initialConversionPrice(Number(form.estimate), service.value))
const suggestedBriefing = computed(() => state.briefingTemplates.find(template => template.id === (service.value?.briefingTemplateId || state.briefingTemplates[0]?.id)) ?? null)
const chosenBriefing = computed(() => state.briefingTemplates.find(template => template.id === form.briefingTemplateId) ?? suggestedBriefing.value)
const initialTasks = computed(() => service.value?.taskTemplates ?? ['Confirmar escopo e materiais com o cliente', 'Preparar primeira versão', 'Revisar ajustes e combinar a entrega'])
const possibleDuplicate = computed(() => state.leads.find(item => item.id !== savedLeadId.value && item.name.trim().toLocaleLowerCase('pt-BR') === form.name.trim().toLocaleLowerCase('pt-BR')) ?? null)

watch([() => form.name, serviceName], () => {
  if (!projectNameEdited.value) form.projectName = serviceName.value + ' — ' + form.name.trim()
}, { immediate: true })
watch([() => form.estimate, service], () => {
  if (!priceEdited.value) form.agreedPrice = suggestedPrice.value
}, { immediate: true })
watch(service, () => {
  form.briefingTemplateId = suggestedBriefing.value?.id ?? ''
}, { immediate: true })

function nextStep() {
  error.value = ''
  if (step.value === 1 && !form.name.trim()) { error.value = 'Informe o nome do cliente ou negócio.'; return }
  if (step.value === 2 && form.serviceId === 'custom' && !form.customService.trim()) {
    error.value = 'Informe o nome da solução personalizada, ou selecione “Ainda não definido”.'
    return
  }
  if (step.value === 3 && (!Number.isFinite(Number(form.estimate)) || Number(form.estimate) < 0)) {
    error.value = 'A estimativa precisa ser um valor igual ou maior que zero.'
    return
  }
  step.value = Math.min(4, step.value + 1)
}

function previousStep() { error.value = ''; step.value = Math.max(1, step.value - 1) }
function selectCatalogPrice() { if (catalogPrice.value !== null) { form.agreedPrice = catalogPrice.value; priceEdited.value = true } }

const hasUnsavedChanges = computed(() => {
  if (originalLead) return form.name.trim() !== originalLead.name ||
    form.contact.trim() !== originalLead.contact || form.notes.trim() !== originalLead.notes ||
    serviceName.value !== originalLead.service || Number(form.estimate) !== originalLead.value
  return Boolean(form.name.trim() || form.contact.trim() || form.notes.trim() ||
    form.serviceId || form.customService.trim() || Number(form.estimate) > 0)
})

function close() {
  if (!hasUnsavedChanges.value || confirm('Descartar as informações deste atendimento que ainda não foram salvas?')) emit('close')
}

function newProjectDirectly() {
  if (hasUnsavedChanges.value && !confirm('Abrir o cadastro direto de projeto? As informações deste assistente que não foram salvas serão descartadas.')) return
  emit('createDirectProject')
}

function finish(saveOnly = false) {
  if (busy.value) return
  error.value = ''
  if (!form.name.trim()) { step.value = 1; error.value = 'Informe o nome do cliente ou negócio.'; return }
  if (form.serviceId === 'custom' && !form.customService.trim()) { step.value = 2; error.value = 'Descreva o serviço personalizado.'; return }
  if (!Number.isFinite(Number(form.estimate)) || Number(form.estimate) < 0) { step.value = 3; error.value = 'Revise o valor estimado.'; return }
  const createProject = !saveOnly && decision.value === 'fechado'
  if (createProject && (!form.projectName.trim() || !form.deadline || !Number.isFinite(Number(form.agreedPrice)) || Number(form.agreedPrice) < 0)) {
    error.value = 'Informe nome do projeto, prazo e um preço combinado válido.'
    return
  }
  if (createProject && !chosenBriefing.value) { error.value = 'Selecione um modelo de briefing para o projeto.'; return }
  busy.value = true
  try {
    // O identificador permanece no assistente em caso de falha de gravação, evitando oportunidades duplicadas.
    const existingLead = savedLeadId.value ? state.leads.find(item => item.id === savedLeadId.value) : null
    if (savedLeadId.value && !existingLead) throw new Error('A oportunidade salva não foi encontrada.')
    if (existingLead?.convertedProjectId) {
      if (persistenceError.value) throw new Error(persistenceError.value)
      emit('openProject', existingLead.convertedProjectId, 'Projeto já criado neste atendimento.')
      return
    }
    const stage: LeadStage = decision.value === 'proposta' ? 'proposta' : 'conversa'
    const input = {
      name: form.name.trim(), contact: form.contact.trim(),
      service: serviceName.value, serviceId: service.value?.id ?? null,
      stage, value: Number(form.estimate), notes: form.notes.trim(),
    }
    const lead = existingLead ? updateLead(existingLead.id, input) : addLead(input)
    savedLeadId.value = lead.id
    if (persistenceError.value) throw new Error(persistenceError.value)
    if (!createProject) {
      emit('openLead', lead.id)
      return
    }
    const project = convertLeadToProject(lead.id, {
      name: form.projectName.trim(), client: form.name.trim(), status: form.status,
      deadline: form.deadline, value: Number(form.agreedPrice),
      briefingTemplateId: chosenBriefing.value!.id,
    })
    if (persistenceError.value) throw new Error(persistenceError.value)
    emit('openProject', project.id, 'Projeto criado com briefing e tarefas iniciais preparados.')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível concluir o atendimento.'
  } finally { busy.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop attendance-wizard-backdrop" @click.self="close">
      <div class="modal modal-wide attendance-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title" aria-describedby="wizard-description">
        <div class="modal-head">
          <div><p class="section-kicker">ATENDIMENTO GUIADO</p><h2 id="wizard-title">{{ originalLead ? 'Retomar atendimento' : 'Novo atendimento' }}</h2><p id="wizard-description" class="attendance-wizard-intro">{{ originalLead ? 'Revise o que já foi cadastrado e continue de onde precisar.' : 'Registre o que já sabe. Você pode deixar informações para depois.' }}</p></div>
          <button class="icon-button" type="button" aria-label="Fechar assistente" @click="close"><X :size="19"/></button>
        </div>

        <ol class="attendance-steps" aria-label="Etapas do atendimento">
          <li v-for="(label, index) in stages" :key="label" :class="{ active: step === index + 1, completed: step > index + 1 }" :aria-current="step === index + 1 ? 'step' : undefined">
            <span class="attendance-step-number">{{ index + 1 }}</span><span>{{ label }}</span>
          </li>
        </ol>
        <form @submit.prevent="step === 4 ? finish(false) : nextStep()" novalidate>
          <div v-if="step === 1" class="attendance-step-panel">
            <h3>Quem entrou em contato?</h3>
            <p class="attendance-step-description">O nome será reaproveitado automaticamente no cadastro da oportunidade e, se fechar, no projeto.</p>
            <div class="field"><label for="wizard-name">Cliente ou negócio *</label><input id="wizard-name" v-model="form.name" maxlength="120" required autofocus placeholder="Nome do cliente ou negócio"/></div>
            <div v-if="possibleDuplicate" class="notice-box subtle-notice attendance-existing-lead"><div><b>Já existe uma oportunidade com esse nome.</b><p>Confira se é o mesmo atendimento antes de criar outro.</p><button type="button" class="text-link" @click="emit('openLead', possibleDuplicate.id)">Abrir oportunidade existente <ArrowRight :size="14"/></button></div></div>
            <div class="field"><label for="wizard-contact">Contato (opcional)</label><input id="wizard-contact" v-model="form.contact" maxlength="100" placeholder="Contato de trabalho"/></div>
            <div class="field"><label for="wizard-notes">O que o cliente precisa?</label><textarea id="wizard-notes" v-model="form.notes" rows="3" maxlength="1000" placeholder="Anote o pedido, dúvidas, materiais, observações ou escopo inicial."/></div>
            <button type="button" class="text-link attendance-direct-link" @click="newProjectDirectly"><FolderKanban :size="15"/> Já tenho um trabalho fechado: criar projeto diretamente</button>
          </div>

          <div v-else-if="step === 2" class="attendance-step-panel">
            <h3>Qual serviço faz sentido?</h3>
            <p class="attendance-step-description">O catálogo é uma biblioteca de modelos. Você não precisa definir o serviço agora.</p>
            <div class="field"><label for="wizard-service">Serviço de interesse</label><select id="wizard-service" v-model="form.serviceId"><option value="">Ainda não definido</option><option v-for="item in state.services" :key="item.id" :value="item.id">{{ item.name }}</option><option value="custom">Solução personalizada (fora do catálogo)</option></select></div>
            <div v-if="form.serviceId === 'custom'" class="field"><label for="wizard-custom-service">Descreva a solução personalizada *</label><input id="wizard-custom-service" v-model="form.customService" maxlength="120" placeholder="Ex.: identidade visual para negócio local"/></div>
            <div v-if="service" class="attendance-template-preview"><span class="section-kicker">MODELO REUTILIZÁVEL</span><h4>{{ service.name }}</h4><p>{{ service.scope || 'Este serviço não tem escopo detalhado.' }}</p><small>Fora do escopo: {{ service.exclusions || 'Não definido' }}</small><div class="attendance-preview-meta"><span>Preço de referência: {{ brl(catalogPrice ?? 0) }}</span><span>{{ service.taskTemplates.length }} tarefas iniciais</span><span>Briefing: {{ suggestedBriefing?.name || 'Geral' }}</span></div></div>
            <div v-else class="notice-box subtle-notice"><ClipboardList :size="18"/><div><b>{{ form.serviceId === 'custom' ? 'Serviço personalizado' : 'Serviço pendente de definição' }}</b><p>Você poderá continuar a conversa sem escolher um modelo agora. Se criar um projeto, a Central usará tarefas genéricas e um briefing geral.</p></div></div>
          </div>

          <div v-else-if="step === 3" class="attendance-step-panel">
            <h3>Escopo e valor de referência</h3>
            <p class="attendance-step-description">A estimativa não é preço contratado nem pagamento. Você pode deixá-la em zero até negociar.</p>
            <div class="attendance-price-grid">
              <div class="field"><label for="wizard-estimate">Valor estimado da oportunidade (R$)</label><input id="wizard-estimate" v-model.number="form.estimate" type="number" min="0" step="0.01"/></div>
              <div class="attendance-price-info"><span>Referência do catálogo</span><strong>{{ catalogPrice === null ? 'Sem referência' : brl(catalogPrice) }}</strong><small>Estimativa comercial ilustrativa, não receita.</small></div>
            </div>
            <div class="attendance-template-preview"><span class="section-kicker">REVISÃO DO ATENDIMENTO</span><h4>{{ form.name }}</h4><p>Serviço: {{ serviceName }}</p><p v-if="form.notes">Necessidade registrada: {{ form.notes }}</p><small>Ao salvar, estes dados ficam na oportunidade. Nenhum recebimento é lançado no financeiro.</small></div>
          </div>

          <div v-else class="attendance-step-panel">
            <h3>Qual é a situação deste atendimento?</h3>
            <p class="attendance-step-description">Escolha o caminho mais adequado agora. Você poderá converter a oportunidade em projeto depois.</p>
            <fieldset class="attendance-decisions"><legend class="sr-only">Situação comercial</legend>
              <label><input v-model="decision" type="radio" value="conversa"/><span><b>Ainda estamos conversando</b><small>Salvar oportunidade em negociação, sem projeto.</small></span></label>
              <label><input v-model="decision" type="radio" value="proposta"/><span><b>Proposta apresentada</b><small>Salvar oportunidade na etapa de proposta, sem criar projeto.</small></span></label>
              <label><input v-model="decision" type="radio" value="fechado"/><span><b>Cliente confirmou o trabalho</b><small>Criar o projeto associado e preparar briefing e tarefas.</small></span></label>
            </fieldset>

            <template v-if="decision === 'fechado'">
              <div class="attendance-project-fields">
                <div class="field"><label for="wizard-project-name">Nome do projeto *</label><input id="wizard-project-name" v-model="form.projectName" maxlength="140" @input="projectNameEdited = true"/></div>
                <div class="form-row"><div class="field"><label for="wizard-agreed-price">Preço combinado (R$) *</label><input id="wizard-agreed-price" v-model.number="form.agreedPrice" type="number" min="0" step="0.01" @input="priceEdited = true"/></div><div class="field"><label for="wizard-deadline">Prazo *</label><input id="wizard-deadline" v-model="form.deadline" type="date"/></div></div>
                <div v-if="service" class="attendance-price-reference"><span>Referência do catálogo: <b>{{ brl(catalogPrice ?? 0) }}</b></span><button type="button" class="btn btn-outline btn-slim" @click="selectCatalogPrice">Aplicar referência</button></div>
                <div class="form-row"><div class="field"><label for="wizard-project-status">Status inicial</label><select id="wizard-project-status" v-model="form.status"><option value="planejado">Planejado</option><option value="andamento">Em andamento</option><option value="revisao">Em revisão</option></select></div><div class="field"><label for="wizard-template">Briefing do projeto</label><select id="wizard-template" v-model="form.briefingTemplateId"><option v-for="template in state.briefingTemplates" :key="template.id" :value="template.id">{{ template.name }}</option></select></div></div>
                <div class="attendance-template-preview"><span class="section-kicker">PREPARAÇÃO AUTOMÁTICA</span><p><CheckCircle2 :size="16"/> 1 briefing independente: <b>{{ chosenBriefing?.name || 'Modelo geral' }}</b></p><p><CheckCircle2 :size="16"/> {{ initialTasks.length }} tarefas iniciais (geradas uma única vez)</p><p><CheckCircle2 :size="16"/> Oportunidade vinculada e valor contratado independente da estimativa</p><small>Alterar o modelo depois não muda as perguntas ou tarefas já copiadas. Nenhuma entrada financeira será gerada.</small></div>
              </div>
            </template>
          </div>

          <p v-if="error" class="form-error attendance-wizard-error" role="alert">{{ error }}</p>
          <div class="attendance-wizard-actions">
            <button type="button" class="btn btn-outline" @click="step > 1 ? previousStep() : close()"><ArrowLeft :size="15"/>{{ step > 1 ? 'Voltar' : 'Cancelar' }}</button>
            <div class="attendance-wizard-actions-main">
              <button type="button" class="btn btn-outline" :disabled="busy" @click="finish(true)">Salvar oportunidade</button>
              <button v-if="step < 4" type="submit" class="btn btn-dark">Continuar <ArrowRight :size="15"/></button>
              <button v-else-if="decision === 'fechado'" type="submit" class="btn btn-dark" :disabled="busy"><Plus :size="15"/> Criar projeto</button>
              <button v-else type="submit" class="btn btn-dark" :disabled="busy">Concluir atendimento <CheckCircle2 :size="15"/></button>
            </div>
          </div>
          <p class="attendance-local-notice">Protótipo local: não utilize contatos ou respostas reais de clientes nesta versão.</p>
        </form>
      </div>
    </div>
  </Teleport>
</template>
