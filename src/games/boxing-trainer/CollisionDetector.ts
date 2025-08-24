import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Vector2 } from 'src/models/models'

export class CollisionDetector {
  static getGlovePositionsFromPoseLandmarks(
    landmarks: NormalizedLandmark[],
    gameWidth: number,
    gameHeight: number
  ): { position: Vector2, size: number }[] {
    const glovePositions = []

    const LEFT_WRIST = 15
    const RIGHT_WRIST = 16
    const LEFT_PINKY = 17
    const RIGHT_PINKY = 18
    const LEFT_INDEX = 19
    const RIGHT_INDEX = 20
    const LEFT_THUMB = 21
    const RIGHT_THUMB = 22

    if (landmarks.length > LEFT_THUMB) {
      const leftWrist = landmarks[LEFT_WRIST]
      const leftPinky = landmarks[LEFT_PINKY]
      const leftIndex = landmarks[LEFT_INDEX]
      const leftThumb = landmarks[LEFT_THUMB]

      if (leftWrist && leftPinky && leftIndex && leftThumb) {
        const leftCenter = {
          x: (leftWrist.x + leftPinky.x + leftIndex.x + leftThumb.x) / 4,
          y: (leftWrist.y + leftPinky.y + leftIndex.y + leftThumb.y) / 4
        }

        const wristToHandDistance = Math.sqrt(
          Math.pow(leftCenter.x - leftWrist.x, 2) +
          Math.pow(leftCenter.y - leftWrist.y, 2)
        )

        const gloveSize = Math.max(40, wristToHandDistance * gameWidth * 2)

        glovePositions.push({
          position: leftCenter,
          size: gloveSize
        })
      }
    }

    if (landmarks.length > RIGHT_THUMB) {
      const rightWrist = landmarks[RIGHT_WRIST]
      const rightPinky = landmarks[RIGHT_PINKY]
      const rightIndex = landmarks[RIGHT_INDEX]
      const rightThumb = landmarks[RIGHT_THUMB]

      if (rightWrist && rightPinky && rightIndex && rightThumb) {
        const rightCenter = {
          x: (rightWrist.x + rightPinky.x + rightIndex.x + rightThumb.x) / 4,
          y: (rightWrist.y + rightPinky.y + rightIndex.y + rightThumb.y) / 4
        }

        const wristToHandDistance = Math.sqrt(
          Math.pow(rightCenter.x - rightWrist.x, 2) +
          Math.pow(rightCenter.y - rightWrist.y, 2)
        )

        const gloveSize = Math.max(40, wristToHandDistance * gameWidth * 2)

        glovePositions.push({
          position: rightCenter,
          size: gloveSize
        })
      }
    }

    return glovePositions
  }

  static checkBagCollision(
    bagPosition: Vector2,
    bagWidth: number,
    bagHeight: number,
    glovePositions: { position: Vector2, size: number }[],
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    for (const glove of glovePositions) {
      const gloveX = glove.position.x * canvasWidth
      const gloveY = glove.position.y * canvasHeight
      const gloveRadius = glove.size / 2

      const bagLeft = bagPosition.x - bagWidth / 2
      const bagRight = bagPosition.x + bagWidth / 2
      const bagTop = bagPosition.y - bagHeight / 2
      const bagBottom = bagPosition.y + bagHeight / 2

      const closestX = Math.max(bagLeft, Math.min(gloveX, bagRight))
      const closestY = Math.max(bagTop, Math.min(gloveY, bagBottom))

      const distanceX = gloveX - closestX
      const distanceY = gloveY - closestY
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      if (distance <= gloveRadius) {
        return true
      }
    }

    return false
  }
}