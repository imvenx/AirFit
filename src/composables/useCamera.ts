import { ref, Ref } from 'vue'
import { CameraConfig } from 'src/types/game'

export function useCamera(videoEl: Ref<HTMLVideoElement | null>) {
  const isCameraEnabled = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const cameraConfig = ref<CameraConfig | null>(null)

  let stream: MediaStream | null = null

  const hasGetUserMedia = () =>
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

  async function enableCamera() {
    if (!hasGetUserMedia()) {
      error.value = 'Webcam not supported'
      throw new Error('Webcam not supported')
    }

    if (!videoEl.value) {
      error.value = 'Video element not available'
      throw new Error('Video element not available')
    }

    isLoading.value = true
    error.value = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()

      videoEl.value.srcObject = stream
      await videoEl.value.play()

      cameraConfig.value = {
        width: settings.width || 640,
        height: settings.height || 480,
        aspectRatio: settings.aspectRatio || 4 / 3
      }

      isCameraEnabled.value = true
      return settings
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to enable camera'
      isCameraEnabled.value = false
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    if (videoEl.value) {
      videoEl.value.srcObject = null
    }

    isCameraEnabled.value = false
    cameraConfig.value = null
    error.value = null
  }

  function refreshCameraConfig() {
    if (videoEl.value && stream) {
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()

      cameraConfig.value = {
        width: settings.width || 640,
        height: settings.height || 480,
        aspectRatio: settings.aspectRatio || 4 / 3
      }
    }
  }

  return {
    isCameraEnabled,
    isLoading,
    error,
    cameraConfig,
    enableCamera,
    stopCamera,
    refreshCameraConfig
  }
}