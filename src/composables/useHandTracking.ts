import { ref, Ref } from 'vue'
import { DrawingUtils, FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { mediaPipeConfig } from 'src/config/appConfig'

export function useHandTracking(
  videoEl: Ref<HTMLVideoElement | null>,
  canvasEl: Ref<HTMLCanvasElement | null>,
  maxHands: number = 2
) {
  const isInitialized = ref(false)
  const isTracking = ref(false)
  const landmarks = ref<NormalizedLandmark[][]>([])
  const error = ref<string | null>(null)
  // Handedness per detected hand ("Left" | "Right") if available
  const handednesses = ref<Array<string>>([])

  let handLandmarker: HandLandmarker | null = null
  let canvasCtx: CanvasRenderingContext2D | null = null
  let runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE'
  let lastVideoTime = -1
  let animationId: number | null = null

  async function initializeHandTracking() {
    if (isInitialized.value) return

    try {
      const vision = await FilesetResolver.forVisionTasks(mediaPipeConfig.modelsPath)
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: mediaPipeConfig.handLandmarkerPath,
          delegate: 'GPU'
        },
        runningMode,
        numHands: maxHands
      })

      if (canvasEl.value) {
        canvasCtx = canvasEl.value.getContext('2d')
      }

      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize hand tracking'
      throw e
    }
  }

  async function startTracking() {
    if (!isInitialized.value || !handLandmarker || !videoEl.value) {
      throw new Error('Hand tracking not initialized')
    }

    isTracking.value = true
    predictWebcam()
  }

  function stopTracking() {
    isTracking.value = false
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  async function predictWebcam() {
    if (!isTracking.value || !handLandmarker || !videoEl.value || !canvasCtx) return

    if (runningMode === 'IMAGE') {
      runningMode = 'VIDEO'
      await handLandmarker.setOptions({ runningMode: 'VIDEO' })
    }

    const nowInMs = Date.now()
    if (videoEl.value.currentTime !== lastVideoTime) {
      lastVideoTime = videoEl.value.currentTime
      const results = handLandmarker.detectForVideo(videoEl.value, nowInMs)
      processResults(results)
    }

    if (isTracking.value) {
      animationId = requestAnimationFrame(predictWebcam)
    }
  }

  function processResults(results: HandLandmarkerResult) {
    landmarks.value = results.landmarks || []
    // Extract handedness labels if provided by MediaPipe
    try {
      const hs: Array<string> = []
      // results.handednesses is an array of arrays of classifications; take the top label
      // Types differ across versions; use optional chaining defensively.
      const raw: any = (results as any).handednesses
      if (Array.isArray(raw)) {
        for (const arr of raw) {
          if (Array.isArray(arr) && arr.length > 0) {
            const first = arr[0]
            const label = first?.displayName || first?.categoryName || first?.label
            if (typeof label === 'string') hs.push(label)
          }
        }
      }
      handednesses.value = hs
    } catch {
      handednesses.value = []
    }
  }

  // Get fingertip landmarks for game interaction
  function getFingertipLandmarks(): NormalizedLandmark[] {
    const fingertips: NormalizedLandmark[] = []
    for (const landmarkGroup of landmarks.value) {
      // Get fingertips (8=index, 12=middle, 16=ring, 20=pinky)
      const tips = landmarkGroup.filter((_, index) => [8, 12, 16, 20].includes(index))
      fingertips.push(...tips)
    }
    return fingertips
  }

  return {
    isInitialized,
    isTracking,
    landmarks,
    handednesses,
    error,
    initializeHandTracking,
    startTracking,
    stopTracking,
    getFingertipLandmarks
  }
}
