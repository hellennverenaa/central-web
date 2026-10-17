/**
 * Controles complementares de login (por IP e por conta).
 * Limitador local para processo único. Não substitui Redis/distribuído em produção.
 * Mantém tamanho de memória limitado sem zerar todos os bloqueios quando fica cheio.
 */
export function createLoginLimiter(maxAttempts = 8, windowMs = 15 * 60 * 1000, maxEntries = 1024) {
  const attempts = new Map<string, { count: number; reset: number }>()

  function prune(now: number) {
    for (const [key, value] of attempts) {
      if (value.reset <= now) attempts.delete(key)
    }
  }

  return {
    attempt(key: string, now = Date.now()): boolean {
      const previous = attempts.get(key)
      if (previous && previous.reset > now) {
        previous.count += 1
        return previous.count <= maxAttempts
      }
      if (attempts.size >= maxEntries) prune(now)
      if (attempts.size >= maxEntries) {
        const oldest = attempts.keys().next().value
        if (oldest) attempts.delete(oldest)
      }
      attempts.delete(key)
      attempts.set(key, { count: 1, reset: now + windowMs })
      return true
    },
    reset(key: string): void { attempts.delete(key) },
  }
}
