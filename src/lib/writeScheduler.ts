/**
 * Reduz gravações síncronas de digitação sem adiar operações críticas.
 * schedule() agrupa edições reativas; flush() grava imediatamente ao salvar.
 */
export function createWriteScheduler(write: () => void, delayMs = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    write()
  }

  function schedule() {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  function flushPending() {
    if (timer !== undefined) flush()
  }

  function cancel() {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  return { schedule, flush, flushPending, cancel }
}
