export function requestPageFullscreen() {
  if (!import.meta.client) return
  if (document.fullscreenElement || (document as any).webkitFullscreenElement) return
  const el = document.documentElement as any
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {})
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen()
  }
}
