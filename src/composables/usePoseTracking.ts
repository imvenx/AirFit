import { ref, Ref } from 'vue'
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { mediaPipeConfig } from 'src/config/appConfig'

export function usePoseTracking(
  videoEl: Ref<HTMLVideoElement | null>,
  canvasEl: Ref<HTMLCanvasElement | null>
) {
  const isInitialized = ref(false)
  const isTracking = ref(false)
  const landmarks = ref<NormalizedLandmark[]>([])
  const error = ref<string | null>(null)

  let poseLandmarker: PoseLandmarker | null = null
  let canvasCtx: CanvasRenderingContext2D | null = null
  let runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE'
  let lastVideoTime = -1
  let animationId: number | null = null

  // MediaPipe pose landmark indices for boxing
  const POSE_LANDMARKS = {
    LEFT_SHOULDER: 11,
    LEFT_ELBOW: 13, 
    LEFT_WRIST: 15,
    RIGHT_SHOULDER: 12,
    RIGHT_ELBOW: 14,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22
  }

  async function initializePoseTracking() {
    if (isInitialized.value) return

    try {
      const vision = await FilesetResolver.forVisionTasks(mediaPipeConfig.modelsPath)
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: mediaPipeConfig.poseLandmarkerPath,
          delegate: 'GPU'
        },
        runningMode,
        numPoses: 1 // Only track one person for boxing
      })

      // Initialize canvas for drawing landmarks
      if (canvasEl.value) {
        canvasCtx = canvasEl.value.getContext('2d')
      }

      isInitialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize pose tracking'
      throw e
    }
  }

  async function startTracking() {
    if (!isInitialized.value || !poseLandmarker || !videoEl.value) {
      throw new Error('Pose tracking not initialized')
    }

    isTracking.value = true
    await detectPose()
  }

  async function detectPose() {
    if (!isTracking.value || !poseLandmarker || !videoEl.value) return

    try {
      if (runningMode === 'IMAGE') {
        runningMode = 'VIDEO'
        await poseLandmarker.setOptions({ runningMode: 'VIDEO' })
        animationId = requestAnimationFrame(detectPose)
        return
      }

      const currentTime = videoEl.value.currentTime
      if (currentTime === lastVideoTime) {
        animationId = requestAnimationFrame(detectPose)
        return
      }
      lastVideoTime = currentTime

      const timestamp = performance.now()
      const results = poseLandmarker.detectForVideo(videoEl.value, timestamp)
      
      // Extract pose landmarks (33 landmarks total)
      if (results.landmarks && results.landmarks.length > 0) {
        landmarks.value = results.landmarks[0] // First (and only) person
        drawLandmarks(results.landmarks[0])
      } else {
        landmarks.value = []
        clearCanvas()
      }

      animationId = requestAnimationFrame(detectPose)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Detection failed'
      console.error('Pose detection error:', e)
      animationId = requestAnimationFrame(detectPose)
    }
  }

  function stopTracking() {
    isTracking.value = false
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function drawLandmarks(landmarks: NormalizedLandmark[]) {
    if (!canvasCtx || !canvasEl.value || !videoEl.value) return

    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height)

    // Draw key pose landmarks
    const keyLandmarks = [
      { index: 0, color: '#FFFF00', label: 'Nose' },        // Nose (head tracking)
      { index: 11, color: '#FF0000', label: 'L.Shoulder' }, // Left shoulder
      { index: 12, color: '#00FF00', label: 'R.Shoulder' }, // Right shoulder
      { index: 13, color: '#FF0000', label: 'L.Elbow' },    // Left elbow
      { index: 14, color: '#00FF00', label: 'R.Elbow' },    // Right elbow
      { index: 15, color: '#FF0000', label: 'L.Wrist' },    // Left wrist
      { index: 16, color: '#00FF00', label: 'R.Wrist' }     // Right wrist
    ]

    keyLandmarks.forEach(({ index, color, label }) => {
      const landmark = landmarks[index]
      if (landmark && landmark.visibility && landmark.visibility > 0.5) {
        // Mirror X coordinate to match mirrored video
        const x = (1 - landmark.x) * canvasEl.value!.width
        const y = landmark.y * canvasEl.value!.height

        // Draw circle
        canvasCtx!.beginPath()
        canvasCtx!.arc(x, y, 8, 0, 2 * Math.PI)
        canvasCtx!.fillStyle = color
        canvasCtx!.fill()

        // Draw label
        canvasCtx!.fillStyle = 'white'
        canvasCtx!.font = '12px Arial'
        canvasCtx!.fillText(label, x + 10, y - 10)
      }
    })
  }

  function clearCanvas() {
    if (!canvasCtx || !canvasEl.value) return
    canvasCtx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height)
  }

  // Get boxing-relevant landmarks (wrists, elbows, shoulders)
  function getBoxingLandmarks(): NormalizedLandmark[] {
    if (landmarks.value.length === 0) return []
    
    const boxingIndices = [
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.RIGHT_WRIST
    ]
    
    return boxingIndices
      .filter(index => index < landmarks.value.length)
      .map(index => landmarks.value[index])
  }

  // Get just wrist positions for glove rendering
  function getWristLandmarks(): NormalizedLandmark[] {
    if (landmarks.value.length === 0) return []
    
    const wrists = []
    if (landmarks.value[POSE_LANDMARKS.LEFT_WRIST]) {
      wrists.push(landmarks.value[POSE_LANDMARKS.LEFT_WRIST])
    }
    if (landmarks.value[POSE_LANDMARKS.RIGHT_WRIST]) {
      wrists.push(landmarks.value[POSE_LANDMARKS.RIGHT_WRIST])
    }
    
    return wrists
  }

  // Get hand center positions for more accurate glove positioning
  function getHandCenterLandmarks(): NormalizedLandmark[] {
    if (landmarks.value.length === 0) return []
    
    const handCenters = []
    
    // Calculate left hand center from wrist, pinky, index, thumb
    const leftWrist = landmarks.value[POSE_LANDMARKS.LEFT_WRIST]
    const leftPinky = landmarks.value[POSE_LANDMARKS.LEFT_PINKY]
    const leftIndex = landmarks.value[POSE_LANDMARKS.LEFT_INDEX]
    const leftThumb = landmarks.value[POSE_LANDMARKS.LEFT_THUMB]
    
    if (leftWrist && leftPinky && leftIndex && leftThumb) {
      const leftCenter = {
        x: (leftWrist.x + leftPinky.x + leftIndex.x + leftThumb.x) / 4,
        y: (leftWrist.y + leftPinky.y + leftIndex.y + leftThumb.y) / 4,
        z: (leftWrist.z + leftPinky.z + leftIndex.z + leftThumb.z) / 4,
        visibility: Math.min(leftWrist.visibility || 1, leftPinky.visibility || 1, leftIndex.visibility || 1, leftThumb.visibility || 1)
      }
      handCenters.push(leftCenter)
    }
    
    // Calculate right hand center from wrist, pinky, index, thumb
    const rightWrist = landmarks.value[POSE_LANDMARKS.RIGHT_WRIST]
    const rightPinky = landmarks.value[POSE_LANDMARKS.RIGHT_PINKY]
    const rightIndex = landmarks.value[POSE_LANDMARKS.RIGHT_INDEX]
    const rightThumb = landmarks.value[POSE_LANDMARKS.RIGHT_THUMB]
    
    if (rightWrist && rightPinky && rightIndex && rightThumb) {
      const rightCenter = {
        x: (rightWrist.x + rightPinky.x + rightIndex.x + rightThumb.x) / 4,
        y: (rightWrist.y + rightPinky.y + rightIndex.y + rightThumb.y) / 4,
        z: (rightWrist.z + rightPinky.z + rightIndex.z + rightThumb.z) / 4,
        visibility: Math.min(rightWrist.visibility || 1, rightPinky.visibility || 1, rightIndex.visibility || 1, rightThumb.visibility || 1)
      }
      handCenters.push(rightCenter)
    }
    
    return handCenters
  }

  return {
    isInitialized,
    isTracking,
    landmarks,
    error,
    initializePoseTracking,
    startTracking,
    stopTracking,
    getBoxingLandmarks,
    getWristLandmarks,
    getHandCenterLandmarks,
    POSE_LANDMARKS
  }
}