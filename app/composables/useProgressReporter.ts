const THROTTLE_MS = 5000

export function useProgressReporter() {
  let lastSent = 0
  let pending: { key: string; position: number; duration: number } | null = null
  let inFlight = false

  async function send(payload: { key: string; position: number; duration: number }) {
    pending = payload
    const now = Date.now()
    if (inFlight) return
    if (now - lastSent < THROTTLE_MS) return
    await drain()
  }

  async function drain() {
    if (!pending || inFlight) return
    inFlight = true
    const payload = pending
    pending = null
    try {
      await $fetch('/api/progress', { method: 'POST', body: payload })
      lastSent = Date.now()
    } finally {
      inFlight = false
      if (pending && Date.now() - lastSent >= THROTTLE_MS) {
        drain()
      }
    }
  }

  onMounted(() => {
    const flush = () => drain()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
  })
  onUnmounted(() => {
    drain()
  })

  return { send, drain }
}
