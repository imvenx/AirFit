import { ref, Ref } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'
import { ArUcoMarkerGenerator } from '../aruco-test/ArUcoMarkerGenerator'
import { ArUcoDetectionService } from '../aruco-test/services/ArUcoDetectionService'

export class Test2Aruco2Manager {
  private camera: ReturnType<typeof useCamera>
  private handTracking: ReturnType<typeof useHandTracking>
  private markerGenerator: ArUcoMarkerGenerator
  private arucoDetection: ArUcoDetectionService
  private videoEl: Ref<HTMLVideoElement | null>
  
  public indexFingerPos = ref<{ x: number; y: number } | null>(null)
  public relativeFingerPos = ref<{ x: number; y: number } | null>(null)
  public arucoDetected = ref(false)
  public arucoConfidence = ref(0)
  public arucoServiceRunning = ref(false)
  public isTracking = ref(false)
  private animationFrameId: number | null = null

  constructor(
    videoEl: Ref<HTMLVideoElement | null>,
    canvasEl: Ref<HTMLCanvasElement | null>
  ) {
    this.videoEl = videoEl
    this.camera = useCamera(videoEl)
    this.handTracking = useHandTracking(videoEl, canvasEl, 1)
    this.markerGenerator = new ArUcoMarkerGenerator()
    this.arucoDetection = new ArUcoDetectionService(videoEl, canvasEl)
  }

  async initialize(): Promise<void> {
    try {
      await this.camera.enableCamera()
      
      // Wait for video to be ready before starting detection
      await new Promise<void>((resolve) => {
        if (this.videoEl.value) {
          const checkVideoReady = () => {
            if (this.videoEl.value && this.videoEl.value.videoWidth > 0) {
              resolve()
            } else {
              setTimeout(checkVideoReady, 100)
            }
          }
          checkVideoReady()
        } else {
          resolve()
        }
      })
      
      await this.handTracking.initializeHandTracking()
      await this.handTracking.startTracking()
      
      // Start ArUco detection after everything is ready
      const detectionStarted = this.arucoDetection.startDetection()
      this.arucoServiceRunning.value = detectionStarted && this.arucoDetection.isDetecting.value
      this.isTracking.value = true
      this.startIndexFingerTracking()
    } catch (err) {
      console.error('Failed to initialize Test2Aruco2Manager:', err)
      throw err
    }
  }

  private setupCanvasSize(): void {
    if (this.videoEl.value && this.handTracking.canvasEl?.value) {
      const video = this.videoEl.value
      const canvas = this.handTracking.canvasEl.value
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      console.log(`Canvas sized to: ${canvas.width}x${canvas.height}`)
    }
  }

  drawArUcoMarker(canvas: HTMLCanvasElement, markerId: number = 0): void {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = 200
      canvas.height = 200
      this.markerGenerator.drawMarker(ctx, markerId, 0, 0, 200)
    }
  }

  private startIndexFingerTracking(): void {
    const track = () => {
      if (!this.isTracking.value) return

      const landmarks = this.handTracking.landmarks.value
      
      // Get all detected markers and find highest confidence
      const detectedMarkers = this.arucoDetection.detectedMarkers.value
      const allMarkers = Object.keys(detectedMarkers).map(id => parseInt(id))
      let maxConfidence = 0
      let hasMarker0 = false
      
      // Check for marker ID 0 specifically and get confidence from detection service
      if (this.videoEl.value && this.arucoDetection.isDetecting.value) {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!
          canvas.width = this.videoEl.value.videoWidth
          canvas.height = this.videoEl.value.videoHeight
          ctx.drawImage(this.videoEl.value, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          const detector = (this.arucoDetection as any).detector
          if (detector) {
            const markers = detector.detect(imageData) || []
            markers.forEach((marker: any) => {
              if (marker.id === 0) {
                hasMarker0 = true
                maxConfidence = Math.max(maxConfidence, marker.confidence || 0.5)
              }
              if (marker.confidence) {
                maxConfidence = Math.max(maxConfidence, marker.confidence)
              }
            })
          }
        } catch (e) {
          // Silent fail for confidence detection
        }
      }
      
      this.arucoDetected.value = hasMarker0
      this.arucoConfidence.value = maxConfidence * 100

      if (landmarks.length > 0) {
        const hand = landmarks[0]
        const indexTip = hand[8]
        
        this.indexFingerPos.value = {
          x: indexTip.x,
          y: indexTip.y
        }

        if (hasMarker0 && this.arucoDetection.screenBounds.value) {
          this.calculateRelativePosition(indexTip)
        } else {
          this.relativeFingerPos.value = null
        }
      } else {
        this.indexFingerPos.value = null
        this.relativeFingerPos.value = null
      }

      this.animationFrameId = requestAnimationFrame(track)
    }
    track()
  }

  private calculateRelativePosition(indexTip: { x: number; y: number }): void {
    const videoEl = this.videoEl.value
    if (!videoEl) return

    const videoWidth = videoEl.videoWidth
    const videoHeight = videoEl.videoHeight
    
    const fingerX = indexTip.x * videoWidth
    const fingerY = indexTip.y * videoHeight

    const arucoMarkers = this.getArucoMarker0Bounds()
    if (!arucoMarkers) {
      this.relativeFingerPos.value = null
      return
    }

    const relativeX = Math.max(0, Math.min(1, (fingerX - arucoMarkers.x) / arucoMarkers.width))
    const relativeY = Math.max(0, Math.min(1, (fingerY - arucoMarkers.y) / arucoMarkers.height))

    this.relativeFingerPos.value = {
      x: relativeX,
      y: relativeY
    }
  }

  private getArucoMarker0Bounds(): { x: number; y: number; width: number; height: number } | null {
    const detectedMarkers = this.arucoDetection.detectedMarkers.value
    if (!detectedMarkers[0]) return null

    const detector = (this.arucoDetection as any).detector
    if (!detector) return null

    try {
      const videoEl = this.videoEl.value
      if (!videoEl) return null

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight
      ctx.drawImage(videoEl, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const markers = detector.detect(imageData) || []
      
      const marker0 = markers.find((marker: any) => marker.id === 0)
      if (!marker0 || !marker0.corners) return null

      const corners = marker0.corners
      const minX = Math.min(...corners.map((c: any) => c.x))
      const maxX = Math.max(...corners.map((c: any) => c.x))
      const minY = Math.min(...corners.map((c: any) => c.y))
      const maxY = Math.max(...corners.map((c: any) => c.y))

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    } catch (error) {
      console.error('Error getting ArUco marker 0 bounds:', error)
      return null
    }
  }

  drawRelativePositionOnMarker(markerCanvas: HTMLCanvasElement): void {
    if (!this.relativeFingerPos.value) return

    const ctx = markerCanvas.getContext('2d')
    if (!ctx) return

    const dotX = this.relativeFingerPos.value.x * markerCanvas.width
    const dotY = this.relativeFingerPos.value.y * markerCanvas.height

    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(dotX, dotY, 8, 0, 2 * Math.PI)
    ctx.fill()
  }

  drawIndexFingerOverlay(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const landmarks = this.handTracking.landmarks.value
    if (landmarks.length === 0) return

    const hand = landmarks[0]
    const indexTip = hand[8]
    const indexDIP = hand[7]
    const indexPIP = hand[6]
    const indexMCP = hand[5]

    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.arc(
      indexTip.x * canvas.width,
      indexTip.y * canvas.height,
      8,
      0,
      2 * Math.PI
    )
    ctx.fill()

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(indexMCP.x * canvas.width, indexMCP.y * canvas.height)
    ctx.lineTo(indexPIP.x * canvas.width, indexPIP.y * canvas.height)
    ctx.lineTo(indexDIP.x * canvas.width, indexDIP.y * canvas.height)
    ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height)
    ctx.stroke()
  }

  destroy(): void {
    this.isTracking.value = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.arucoDetection.stopDetection()
    this.handTracking.stopTracking()
    this.camera.stopCamera()
  }
}