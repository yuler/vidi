const THROTTLE_MS = 5000

type ProgressPayload = { key: string; position: number; duration: number; completed?: boolean }

export function useProgressReporter() {
  let lastSent = 0
  let pending: ProgressPayload | null = null
  let inFlight = false

  async function send(payload: ProgressPayload) {
    pending = payload
    const now = Date.now()
    if (inFlight) return
    if (payload.completed !== true && now - lastSent < THROTTLE_MS) return
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
      if (pending && (pending.completed === true || Date.now() - lastSent >= THROTTLE_MS)) {
        drain()
      }
    }
  }

  function onHidden() {
    drain()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onHidden)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('pagehide', onHidden)
    drain()
  })

  return { send, drain }
}
