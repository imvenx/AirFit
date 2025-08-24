import { ref, type Ref } from 'vue'
import * as jsAruco from 'js-aruco2/src/aruco.js'
import * as jsCV from 'js-aruco2/src/cv.js'

const AR = (jsAruco as any).AR
const CV = (jsCV as any).CV

export interface MarkerCorners {
  id: number
  corners: Array<{ x: number; y: number }>
}

export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

export class ArUcoDetectionService {
  private detector: any = null
  private detectionInterval: number | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  public detectedMarkers = ref<Record<number, boolean>>({})
  public screenBounds = ref<ScreenBounds | null>(null)
  public isDetecting = ref(false)

  constructor(
    private video: Ref<HTMLVideoElement | null>,
    private overlay: Ref<HTMLCanvasElement | null>
  ) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
  }

  startDetection(): boolean {
    if (!AR || !AR.Detector) {
      console.error('AR.Detector not available')
      return false
    }

    if (!this.video.value || !this.overlay.value) {
      console.error('Video or overlay not available')
      return false
    }

    try {
      this.detector = new AR.Detector()
      this.isDetecting.value = true

      this.detectionInterval = setInterval(() => {
        this.detectFrame()
      }, 100) as unknown as number

      return true
    } catch (error) {
      console.error('Failed to create ArUco detector:', error)
      return false
    }
  }

  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = null
    }
    this.isDetecting.value = false
    this.detectedMarkers.value = {}
    this.screenBounds.value = null
  }

  private detectFrame() {
    if (!this.video.value || !this.overlay.value || this.video.value.readyState !== 4) {
      return
    }

    try {
      this.canvas.width = this.video.value.videoWidth
      this.canvas.height = this.video.value.videoHeight
      this.ctx.drawImage(this.video.value, 0, 0)

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

      if (!this.detector) {
        return
      }

      const markers = this.detector.detect(imageData)
      this.processMarkers(markers || [])
      this.drawOverlay(markers || [])
    } catch (error) {
      console.error('ArUco detection error:', error)
    }
  }

  private processMarkers(markers: MarkerCorners[]) {
    this.detectedMarkers.value = {}
    const cornerPositions: Record<number, { x: number; y: number }[]> = {}

    markers.forEach(marker => {
      if (marker.id >= 0 && marker.id <= 3) {
        this.detectedMarkers.value[marker.id] = true
        cornerPositions[marker.id] = marker.corners
      }
    })

    if (Object.keys(cornerPositions).length === 4) {
      this.calculateScreenBounds(cornerPositions)
    } else {
      this.screenBounds.value = null
    }
  }

  private calculateScreenBounds(corners: Record<number, { x: number; y: number }[]>) {
    const topLeft = corners[0]?.[0]
    const topRight = corners[1]?.[1]
    const bottomLeft = corners[2]?.[3]
    const bottomRight = corners[3]?.[2]

    if (topLeft && topRight && bottomLeft && bottomRight) {
      const minX = Math.min(topLeft.x, bottomLeft.x)
      const maxX = Math.max(topRight.x, bottomRight.x)
      const minY = Math.min(topLeft.y, topRight.y)
      const maxY = Math.max(bottomLeft.y, bottomRight.y)

      this.screenBounds.value = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }
  }

  private drawOverlay(markers: MarkerCorners[]) {
    if (!this.overlay.value) return

    const ctx = this.overlay.value.getContext('2d')!
    ctx.clearRect(0, 0, this.overlay.value.width, this.overlay.value.height)

    // Draw markers
    markers.forEach(marker => {
      ctx.strokeStyle = marker.id <= 3 ? '#00ff00' : '#ff0000'
      ctx.lineWidth = 3
      ctx.beginPath()

      marker.corners.forEach((corner, i) => {
        if (i === 0) {
          ctx.moveTo(corner.x, corner.y)
        } else {
          ctx.lineTo(corner.x, corner.y)
        }
      })
      ctx.closePath()
      ctx.stroke()

      ctx.fillStyle = marker.id <= 3 ? '#00ff00' : '#ff0000'
      ctx.font = '20px Arial'
      ctx.fillText(`ID: ${marker.id}`, marker.corners[0].x, marker.corners[0].y - 10)
    })

    // Draw screen bounds
    if (this.screenBounds.value) {
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 4
      ctx.setLineDash([10, 5])
      ctx.strokeRect(
        this.screenBounds.value.x,
        this.screenBounds.value.y,
        this.screenBounds.value.width,
        this.screenBounds.value.height
      )
      ctx.setLineDash([])
    }
  }

  drawHandPosition(handPosition: { x: number; y: number }) {
    if (!this.overlay.value || !this.screenBounds.value) return

    const ctx = this.overlay.value.getContext('2d')!
    const x = this.screenBounds.value.x + (handPosition.x / 100) * this.screenBounds.value.width
    const y = this.screenBounds.value.y + (handPosition.y / 100) * this.screenBounds.value.height

    ctx.fillStyle = '#ff00ff'
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
  }
}