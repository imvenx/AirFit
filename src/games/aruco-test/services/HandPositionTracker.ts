import { ref, type Ref } from 'vue'
import { CoordinateTransformService, type HandPosition } from './CoordinateTransformService'
import { GridWindowManager } from './GridWindowManager'
import type { ScreenBounds } from './ArUcoDetectionService'

export class HandPositionTracker {
  public handPosition = ref<HandPosition | null>(null)
  
  private updateInterval: number | null = null
  private coordinateTransform = new CoordinateTransformService()

  constructor(
    private video: Ref<HTMLVideoElement | null>,
    private overlay: Ref<HTMLCanvasElement | null>,
    private screenBounds: Ref<ScreenBounds | null>,
    private gridManager: GridWindowManager,
    private handTracking: any, // Pass the handTracking instance
    private gridSize: number = 10
  ) {}

  startTracking() {
    if (this.updateInterval) {
      this.stopTracking()
    }

    this.updateInterval = setInterval(() => {
      this.updatePosition()
    }, 50) as unknown as number // 20 FPS
  }

  stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.handPosition.value = null
    this.gridManager.updateGrid([])
  }

  private updatePosition() {
    const hands = this.handTracking.hands.value

    if (hands.length > 0 && this.screenBounds.value && this.video.value) {
      const hand = hands[0]
      const handCenter = hand.landmarks[9] // Middle finger MCP joint

      // Convert normalized coordinates to camera pixels
      const cameraPos = this.coordinateTransform.convertHandLandmarkToCamera(
        handCenter,
        this.video.value.videoWidth,
        this.video.value.videoHeight
      )

      // Transform to screen percentage
      const screenPos = this.coordinateTransform.transformCameraToScreen(
        cameraPos.x,
        cameraPos.y,
        this.screenBounds.value
      )

      if (screenPos) {
        this.handPosition.value = screenPos

        // Update grid
        const cellIndex = this.coordinateTransform.getGridCellFromPosition(
          screenPos,
          this.gridSize
        )

        if (cellIndex >= 0 && cellIndex < this.gridSize * this.gridSize) {
          this.gridManager.updateGrid([cellIndex])
        } else {
          this.gridManager.updateGrid([])
        }
      }
    } else {
      this.handPosition.value = null
      this.gridManager.updateGrid([])
    }
  }
}