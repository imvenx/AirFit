import { Ref, onMounted, onUnmounted } from 'vue'

export function useOrientationHandler(
  videoEl: Ref<HTMLVideoElement | null>,
  canvasEl: Ref<HTMLCanvasElement | null>,
  refreshCallback?: () => void
) {
  let orientationChangeTimeout: NodeJS.Timeout | null = null

  function updateCanvasDimensions() {
    if (!videoEl.value || !canvasEl.value) return

    setTimeout(() => {
      if (videoEl.value && canvasEl.value) {
        const { videoWidth, videoHeight } = videoEl.value
        
        if (videoWidth > 0 && videoHeight > 0) {
          canvasEl.value.width = videoWidth
          canvasEl.value.height = videoHeight
          
          refreshCallback?.()
        }
      }
    }, 100)
  }

  function handleOrientationChange() {
    if (orientationChangeTimeout) {
      clearTimeout(orientationChangeTimeout)
    }

    orientationChangeTimeout = setTimeout(() => {
      updateCanvasDimensions()
    }, 500)
  }

  function handleResize() {
    updateCanvasDimensions()
  }

  onMounted(() => {
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleResize)
    screen.orientation?.addEventListener('change', handleOrientationChange)
  })

  onUnmounted(() => {
    if (orientationChangeTimeout) {
      clearTimeout(orientationChangeTimeout)
    }
    
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.removeEventListener('resize', handleResize)
    screen.orientation?.removeEventListener('change', handleOrientationChange)
  })

  return {
    updateCanvasDimensions
  }
}