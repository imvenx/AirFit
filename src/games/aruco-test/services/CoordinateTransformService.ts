import type { ScreenBounds } from './ArUcoDetectionService'

export interface HandPosition {
  x: number
  y: number
}

export class CoordinateTransformService {
  transformCameraToScreen(
    cameraX: number,
    cameraY: number,
    screenBounds: ScreenBounds
  ): HandPosition | null {
    if (!screenBounds) return null

    // Map camera coordinates to screen percentage
    const screenX = ((cameraX - screenBounds.x) / screenBounds.width) * 100
    const screenY = ((cameraY - screenBounds.y) / screenBounds.height) * 100

    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(100, screenX))
    const clampedY = Math.max(0, Math.min(100, screenY))

    return { x: clampedX, y: clampedY }
  }

  getGridCellFromPosition(
    position: HandPosition,
    gridSize: number
  ): number {
    if (position.x < 0 || position.x > 100 || position.y < 0 || position.y > 100) {
      return -1
    }

    const cellX = Math.floor((position.x / 100) * gridSize)
    const cellY = Math.floor((position.y / 100) * gridSize)

    return cellY * gridSize + cellX
  }

  convertHandLandmarkToCamera(
    landmark: { x: number; y: number },
    videoWidth: number,
    videoHeight: number
  ): { x: number; y: number } {
    return {
      x: landmark.x * videoWidth,
      y: landmark.y * videoHeight
    }
  }
}