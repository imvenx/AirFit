import { ref, onMounted, onUnmounted } from 'vue'

export function usePWAInstall() {
  const canInstall = ref(false)
  let deferredPrompt: any = null
  const installed = ref(false)

  function onBeforeInstallPrompt(e: any) {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  }

  function onAppInstalled() {
    installed.value = true
    canInstall.value = false
    deferredPrompt = null
  }

  async function promptInstall() {
    if (!deferredPrompt) return { outcome: 'dismissed' }
    const { outcome } = await deferredPrompt.prompt()
    deferredPrompt = null
    canInstall.value = false
    return { outcome }
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    // Detect if already standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    if (isStandalone) {
      installed.value = true
      canInstall.value = false
    }
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  return { canInstall, installed, promptInstall }
}

