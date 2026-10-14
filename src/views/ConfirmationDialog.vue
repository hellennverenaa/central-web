<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { AlertTriangle, HelpCircle, X } from 'lucide-vue-next'
import { currentConfirmation, settleConfirmation } from '../lib/confirmation'

const cancelButton = ref<HTMLButtonElement | null>(null)
const acceptButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

watch(() => currentConfirmation.value?.id, async (id, oldId) => {
  if (id) {
    if (!oldId) previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    cancelButton.value?.focus()
  } else if (oldId) {
    const element = previouslyFocused
    previouslyFocused = null
    await nextTick()
    if (element?.isConnected) element.focus()
  }
}, { flush: 'post' })

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    settleConfirmation(false)
  }
  if (event.key !== 'Tab') return
  const first = cancelButton.value
  const last = acceptButton.value
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="currentConfirmation" :key="currentConfirmation.id" class="modal-backdrop confirmation-backdrop"
      @click.self="settleConfirmation(false)" @keydown="onKeydown">
      <div class="modal confirmation-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="confirmation-title" aria-describedby="confirmation-description">
        <div class="confirmation-top">
          <span class="confirmation-icon" :class="{ 'confirmation-icon-danger': currentConfirmation.tone === 'danger' }">
            <AlertTriangle v-if="currentConfirmation.tone === 'danger'" :size="23"/>
            <HelpCircle v-else :size="23"/>
          </span>
          <button type="button" class="icon-button confirmation-close" aria-label="Cancelar e fechar"
            @click="settleConfirmation(false)"><X :size="18"/></button>
        </div>
        <h2 id="confirmation-title">{{ currentConfirmation.title }}</h2>
        <p id="confirmation-description">{{ currentConfirmation.message }}</p>
        <div class="confirmation-actions">
          <button ref="cancelButton" class="btn btn-outline" type="button" @click="settleConfirmation(false)">
            {{ currentConfirmation.cancelLabel || 'Cancelar' }}
          </button>
          <button ref="acceptButton" class="btn" :class="currentConfirmation.tone === 'danger' ? 'btn-danger-confirm' : 'btn-dark'"
            type="button" @click="settleConfirmation(true)">
            {{ currentConfirmation.confirmLabel || 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
