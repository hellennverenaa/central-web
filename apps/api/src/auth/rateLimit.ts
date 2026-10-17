/** Limitador conservador em memória, adequado SOMENTE ao servidor local de processo único. */
export function createLoginLimiter(maxAttempts = 8, windowMs = 15 * 60 * 1000) {
  const attempts = new Map<string, { count: number; reset: number }>()
  return {
    attempt(ip: string, now = Date.now()): boolean {
      // Limita a memória do protótipo e evita crescimento indefinido.
      if (attempts.size > 512) {
        for (const [key, data] of attempts) if (data.reset <= now) attempts.delete(key)
        if (attempts.size > 512) attempts.clear()
      }
      const previous = attempts.get(ip)
      const current = previous && previous.reset > now
        ? previous : { count: 0, reset: now + windowMs }
      current.count++
      attempts.set(ip, current)
      return current.count <= maxAttempts
    },
  }
}
