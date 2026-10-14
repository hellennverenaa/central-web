import { shallowRef } from 'vue'

export type ConfirmationTone = 'primary' | 'danger'
export interface ConfirmationOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmationTone
}
export interface ConfirmationRequest extends ConfirmationOptions {
  id: number
  resolve: (confirmed: boolean) => void
}

/** Fila única para confirmações na Central. Não depende de window.confirm(). */
export const currentConfirmation = shallowRef<ConfirmationRequest | null>(null)
const queue: ConfirmationRequest[] = []
let nextId = 0

function presentNext() {
  if (!currentConfirmation.value) currentConfirmation.value = queue.shift() ?? null
}

export function confirmAction(options: ConfirmationOptions): Promise<boolean> {
  return new Promise(resolve => {
    queue.push({ ...options, id: ++nextId, resolve })
    presentNext()
  })
}

export function settleConfirmation(accepted: boolean): void {
  const request = currentConfirmation.value
  if (!request) return
  currentConfirmation.value = null
  request.resolve(accepted)
  presentNext()
}
