import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Vector2 } from 'src/models/models'
import { CollisionDetector } from './CollisionDetector'
import { AudioManager } from './AudioManager'

export interface BoxingBag {
  id: string
  position: Vector2
  radius: number
  type: 'heavy' | 'speed'
  isActive: boolean
  hitAnimation?: number
  positionIndex: number
  update(deltaTime: number): void
  draw(ctx: CanvasRenderingContext2D): void
  onHit(velocity: number): boolean
  checkCollision(landmarks: NormalizedLandmark[], canvasWidth: number, canvasHeight: number): boolean
}

export const BAG_POSITIONS = [
  { x: 0.1, y: 0.35 },  // Left
  { x: 0.1, y: 0.75 },  // Left-bottom
  { x: 0.35, y: 0.2 },  // Top-left
  { x: 0.65, y: 0.2 },  // Top-right
  { x: 0.9, y: 0.35 },  // Right
  { x: 0.9, y: 0.75 },  // Right-bottom
]

export class HeavyBag implements BoxingBag {
  id: string
  position: Vector2
  radius: number = 72
  type: 'heavy' = 'heavy'
  isActive: boolean = false
  hitAnimation?: number
  positionIndex: number
  private spawnTime: number = 0
  private activeTime: number = 3000
  private targetPosition: Vector2
  private startPosition: Vector2
  private animationProgress: number = 0
  private animationDuration: number = 500
  private bagImage: HTMLImageElement | null = null
  private audioManager: AudioManager

  constructor(
    positionIndex: number,
    private onDestroy: (isTimeout: boolean) => void,
    private gameWidth: number = 640,
    private gameHeight: number = 480,
    difficultyParams?: { activeTime: number, animationDuration: number }
  ) {
    this.id = Math.random().toString(36).substr(2, 9)
    this.positionIndex = positionIndex
    this.audioManager = new AudioManager()
    
    // Apply difficulty parameters if provided
    if (difficultyParams) {
      this.activeTime = difficultyParams.activeTime
      this.animationDuration = difficultyParams.animationDuration
    }
    
    const pos = BAG_POSITIONS[positionIndex]
    this.targetPosition = {
      x: pos.x * gameWidth,
      y: pos.y * gameHeight
    }

    this.startPosition = this.getStartPosition(pos)
    this.position = { ...this.startPosition }
    
    this.bagImage = new Image()
    this.bagImage.onerror = () => {
      this.bagImage = null
    }
    this.bagImage.src = '/boxing-bag.png'
  }

  private getStartPosition(targetPos: { x: number, y: number }): Vector2 {
    if (targetPos.y <= 0.3) {
      return { x: targetPos.x * this.gameWidth, y: -100 }
    } else if (targetPos.x <= 0.2) {
      return { x: -100, y: targetPos.y * this.gameHeight }
    } else if (targetPos.x >= 0.8) {
      return { x: this.gameWidth + 100, y: targetPos.y * this.gameHeight }
    } else {
      return { x: targetPos.x * this.gameWidth, y: -100 }
    }
  }

  activate() {
    this.isActive = true
    this.spawnTime = Date.now()
    this.animationProgress = 0
    this.position = { ...this.startPosition }
  }

  update(deltaTime: number) {
    if (!this.isActive) return

    if (Date.now() - this.spawnTime > this.activeTime) {
      this.deactivate(true)
      return
    }

    if (this.animationProgress < 1) {
      this.animationProgress = Math.min(1, this.animationProgress + deltaTime / this.animationDuration)
      const easeOut = 1 - Math.pow(1 - this.animationProgress, 3)

      this.position.x = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * easeOut
      this.position.y = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * easeOut
    }

    if (this.hitAnimation !== undefined) {
      this.hitAnimation -= deltaTime
      if (this.hitAnimation <= 0) {
        this.hitAnimation = undefined
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isActive) return

    ctx.save()

    if (this.hitAnimation !== undefined) {
      const scale = 1 + (this.hitAnimation / 200) * 0.3
      ctx.translate(this.position.x, this.position.y)
      ctx.scale(scale, scale)
      ctx.translate(-this.position.x, -this.position.y)
    }

    const targetWidth = this.radius * 1.5
    const targetHeight = this.radius * 2

    if (this.bagImage && this.bagImage.complete) {
      const imageAspectRatio = this.bagImage.width / this.bagImage.height
      const targetAspectRatio = targetWidth / targetHeight
      
      let drawWidth = targetWidth
      let drawHeight = targetHeight
      
      if (imageAspectRatio > targetAspectRatio) {
        drawWidth = targetHeight * imageAspectRatio
      } else {
        drawHeight = targetWidth / imageAspectRatio
      }
      
      ctx.drawImage(
        this.bagImage,
        this.position.x - drawWidth / 2,
        this.position.y - drawHeight / 2,
        drawWidth,
        drawHeight
      )
    } else {
      ctx.fillStyle = '#CC0000'
      ctx.fillRect(this.position.x - targetWidth / 2, this.position.y - targetHeight / 2, targetWidth, targetHeight)

      ctx.strokeStyle = '#990000'
      ctx.lineWidth = 3
      ctx.strokeRect(this.position.x - targetWidth / 2, this.position.y - targetHeight / 2, targetWidth, targetHeight)
    }

    this.drawTimeoutBar(ctx, targetWidth, targetHeight)

    if (this.hitAnimation !== undefined) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hitAnimation / 200})`
      ctx.fillRect(this.position.x - targetWidth / 2, this.position.y - targetHeight / 2, targetWidth, targetHeight)
    }

    ctx.restore()
  }

  private drawTimeoutBar(ctx: CanvasRenderingContext2D, bagWidth: number, bagHeight: number) {
    const timeElapsed = Date.now() - this.spawnTime
    const timeRemaining = Math.max(0, this.activeTime - timeElapsed)
    const timeProgress = timeRemaining / this.activeTime

    const barWidth = bagWidth * 0.8
    const barHeight = 6
    const barX = this.position.x - barWidth / 2
    const barY = this.position.y - bagHeight / 2 - 15

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const progressColor = timeProgress > 0.5 ? '#4CAF50' : timeProgress > 0.25 ? '#FF9800' : '#F44336'
    ctx.fillStyle = progressColor
    ctx.fillRect(barX, barY, barWidth * timeProgress, barHeight)

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  checkCollision(landmarks: NormalizedLandmark[], canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isActive) return false

    const glovePositions = CollisionDetector.getGlovePositionsFromPoseLandmarks(landmarks, this.gameWidth, this.gameHeight)
    const bagWidth = this.radius * 1.5
    const bagHeight = this.radius * 2

    return CollisionDetector.checkBagCollision(
      this.position,
      bagWidth,
      bagHeight,
      glovePositions,
      canvasWidth,
      canvasHeight
    )
  }

  onHit(velocity: number): boolean {
    if (!this.isActive) return false

    const minPunchVelocity = 0.02

    if (velocity >= minPunchVelocity) {
      this.hitAnimation = 200
      this.audioManager.playPunchSound(velocity * 0.1)

      const points = Math.floor(velocity * 100)
      window.dispatchEvent(new CustomEvent('scoreChange', {
        detail: { changeBy: points }
      }))

      const baseFontSize = 20
      let dynamicFontSize = baseFontSize
      if (points > 100) {
        const extraScale = Math.min((points - 100) / 200, 0.3)
        dynamicFontSize = Math.floor(baseFontSize * (1 + extraScale))
      }

      const greenRatio = Math.min(points / 200, 1)
      const redValue = Math.floor(255 * (1 - greenRatio * 0.3))
      const greenValue = Math.floor(200 + 55 * greenRatio)
      const color = `rgb(${redValue}, ${greenValue}, 0)`

      window.dispatchEvent(new CustomEvent('addFloatingText', {
        detail: {
          text: `+${points}`,
          x: this.position.x,
          y: this.position.y,
          color: color,
          fontSize: dynamicFontSize,
          basePoints: points
        }
      }))

      this.deactivate(false)
      return true
    }

    return false
  }

  private deactivate(isTimeout: boolean = false) {
    this.isActive = false
    this.onDestroy(isTimeout)
  }
}