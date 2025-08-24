import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { FloatingTextManager } from './FloatingTextManager'
import { BagSpawner } from './BagSpawner'
import { CollisionDetector } from './CollisionDetector'
import { SniperSystem } from './SniperSystem'
import { appConfig } from 'src/config/appConfig'

interface HandVelocity {
  velocity: number
  direction: { x: number, y: number }
}

export class BoxingGameManager {
  private gameWidth: number
  private gameHeight: number
  private gameStartTime: number = 0
  private lives: number = 3

  private floatingTextManager: FloatingTextManager
  private bagSpawner: BagSpawner
  private sniperSystem: SniperSystem

  private poseHistory: { landmarks: NormalizedLandmark[], timestamp: number }[] = []
  private fullPoseHistory: { landmarks: NormalizedLandmark[], timestamp: number }[] = []
  private maxHistoryFrames: number = 5

  public gameActive: boolean = false

  constructor(
    private ctx: CanvasRenderingContext2D,
    private gameDimensions: { width: number; height: number },
    private dodgeText: string = 'DODGE!'
  ) {
    this.gameWidth = gameDimensions.width
    this.gameHeight = gameDimensions.height

    this.floatingTextManager = new FloatingTextManager()
    this.bagSpawner = new BagSpawner(
      this.gameWidth,
      this.gameHeight,
      (isTimeout) => this.onBagDestroyed(isTimeout)
    )
    this.sniperSystem = new SniperSystem(
      this.gameWidth,
      this.gameHeight,
      () => this.onPlayerHit(),
      this.dodgeText
    )
  }

  startGame() {
    this.gameActive = true
    this.gameStartTime = Date.now()
    this.bagSpawner.startGame()
    this.sniperSystem.start()
  }

  pauseGame() {
    this.gameActive = false
    this.sniperSystem.stop()
  }

  resetGame() {
    this.gameStartTime = 0
    this.lives = 3
    this.floatingTextManager.clear()
    this.bagSpawner.reset()
    this.sniperSystem.reset()
    this.poseHistory = []
    this.fullPoseHistory = []
    this.gameActive = false
  }

  get currentLives(): number {
    return this.lives
  }

  addFloatingText(text: string, x: number, y: number, color: string = '#FFD700', fontSize: number = 32) {
    this.floatingTextManager.add(text, x, y, color, fontSize)
  }

  update(timestamp: number, landmarks: NormalizedLandmark[], fullPoseLandmarks: NormalizedLandmark[] = []) {
    if (!this.gameActive) return

    this.updatePoseVelocity(landmarks)
    this.updateFullPoseLandmarks(fullPoseLandmarks)

    this.bagSpawner.update(16)

    if (landmarks.length > 0) {
      const poseVelocity = this.calculatePoseVelocity()
      this.bagSpawner.checkCollisions(
        this.fullPoseHistory.length > 0 ? this.fullPoseHistory[this.fullPoseHistory.length - 1].landmarks : [],
        poseVelocity.velocity
      )
    }

    // Update sniper system with full pose landmarks for body detection
    this.sniperSystem.update(
      16,
      this.fullPoseHistory.length > 0 ? this.fullPoseHistory[this.fullPoseHistory.length - 1].landmarks : []
    )

    this.floatingTextManager.update(16)
    this.draw()
  }

  private updatePoseVelocity(landmarks: NormalizedLandmark[]) {
    const now = Date.now()
    this.poseHistory.push({ landmarks, timestamp: now })

    if (this.poseHistory.length > this.maxHistoryFrames) {
      this.poseHistory.shift()
    }
  }

  private updateFullPoseLandmarks(landmarks: NormalizedLandmark[]) {
    const now = Date.now()
    this.fullPoseHistory.push({ landmarks, timestamp: now })

    if (this.fullPoseHistory.length > this.maxHistoryFrames) {
      this.fullPoseHistory.shift()
    }
  }

  private calculatePoseVelocity(): HandVelocity {
    if (this.poseHistory.length < 2) {
      return { velocity: 0, direction: { x: 0, y: 0 } }
    }

    const recent = this.poseHistory[this.poseHistory.length - 1]
    const previous = this.poseHistory[this.poseHistory.length - 2]

    if (recent.landmarks.length === 0 || previous.landmarks.length === 0) {
      return { velocity: 0, direction: { x: 0, y: 0 } }
    }

    let totalVelocity = 0
    let totalDirection = { x: 0, y: 0 }
    let count = 0

    const minLength = Math.min(recent.landmarks.length, previous.landmarks.length)

    for (let i = 0; i < minLength; i++) {
      const recentPos = recent.landmarks[i]
      const previousPos = previous.landmarks[i]

      const dx = recentPos.x - previousPos.x
      const dy = recentPos.y - previousPos.y
      const dt = (recent.timestamp - previous.timestamp) / 1000

      if (dt > 0) {
        const velocity = Math.sqrt(dx * dx + dy * dy) / dt
        totalVelocity += velocity
        totalDirection.x += dx / dt
        totalDirection.y += dy / dt
        count++
      }
    }

    return {
      velocity: count > 0 ? totalVelocity / count : 0,
      direction: count > 0 ? { x: totalDirection.x / count, y: totalDirection.y / count } : { x: 0, y: 0 }
    }
  }

  private onBagDestroyed(isTimeout: boolean) {
    if (isTimeout) {
      // Reset combo when player misses a bag
      window.dispatchEvent(new CustomEvent('comboReset'))
    }
  }

  private onPlayerHit() {
    this.lives--

    window.dispatchEvent(new CustomEvent('livesChange', {
      detail: { lives: this.lives }
    }))

    window.dispatchEvent(new CustomEvent('comboReset'))

    if (this.lives <= 0) {
      this.gameActive = false
      this.sniperSystem.stop()
      window.dispatchEvent(new CustomEvent('gameOver', {
        detail: { reason: 'lives' }
      }))
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight)
    this.bagSpawner.draw(this.ctx)
    this.sniperSystem.draw(this.ctx)

    if (appConfig.value.devMode) {
      this.drawPoseLandmarks()
    }

    this.drawBoxingGloves()
    this.floatingTextManager.draw(this.ctx)
  }

  private drawPoseLandmarks() {
    if (this.fullPoseHistory.length === 0) return

    const currentFrame = this.fullPoseHistory[this.fullPoseHistory.length - 1]
    if (!currentFrame || currentFrame.landmarks.length === 0) return

    const landmarks = currentFrame.landmarks

    // Key body points we want to visualize
    const keyPoints = {
      head: 0,
      leftShoulder: 11,
      rightShoulder: 12,
      leftElbow: 13,
      rightElbow: 14,
      leftWrist: 15,
      rightWrist: 16,
      leftHip: 23,
      rightHip: 24,
      leftKnee: 25,
      rightKnee: 26,
      leftAnkle: 27,
      rightAnkle: 28
    }

    // Draw landmark dots - no transform needed, just draw directly
    Object.entries(keyPoints).forEach(([name, index]) => {
      if (index < landmarks.length && landmarks[index]) {
        const landmark = landmarks[index]
        const x = landmark.x * this.gameWidth
        const y = landmark.y * this.gameHeight

        // Different colors for different body parts
        let color = '#00FF00' // Default green
        if (name === 'head') color = '#FF0000' // Red for head
        else if (name.includes('Shoulder')) color = '#0000FF' // Blue for shoulders
        else if (name.includes('Hand') || name.includes('Wrist')) color = '#FFFF00' // Yellow for hands/wrists
        else if (name.includes('Hip')) color = '#FF00FF' // Magenta for hips

        this.ctx.fillStyle = color
        this.ctx.strokeStyle = '#FFFFFF'
        this.ctx.lineWidth = 2

        this.ctx.beginPath()
        this.ctx.arc(x, y, 6, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.stroke()
      }
    })
  }

  private drawBoxingGloves() {
    if (this.fullPoseHistory.length === 0) return

    const currentFrame = this.fullPoseHistory[this.fullPoseHistory.length - 1]
    if (!currentFrame || currentFrame.landmarks.length === 0) return

    const glovesInfo = this.getGloveInfoFromPoseLandmarks(currentFrame.landmarks)

    for (const gloveInfo of glovesInfo) {
      const gloveX = gloveInfo.position.x * this.gameWidth
      const gloveY = gloveInfo.position.y * this.gameHeight

      this.ctx.save()

      this.ctx.translate(gloveX, gloveY)
      this.ctx.rotate(gloveInfo.rotation)

      if (gloveInfo.isLeft) {
        this.ctx.scale(-1, 1)
      }

      this.ctx.font = `${gloveInfo.size}px Arial`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      this.ctx.fillText('🥊', 2, 2)

      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('🥊', 0, 0)

      this.ctx.restore()
    }
  }

  private getGloveInfoFromPoseLandmarks(landmarks: NormalizedLandmark[]): { position: { x: number, y: number }, size: number, rotation: number, isLeft: boolean }[] {
    const glovesInfo = []

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

        const gloveSize = Math.max(40, wristToHandDistance * this.gameWidth * 2)

        const handDirection = {
          x: leftIndex.x - leftWrist.x,
          y: leftIndex.y - leftWrist.y
        }
        const rotation = Math.atan2(handDirection.y, handDirection.x) + Math.PI / 2

        glovesInfo.push({
          position: leftCenter,
          size: gloveSize,
          rotation: rotation,
          isLeft: true
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

        const gloveSize = Math.max(40, wristToHandDistance * this.gameWidth * 2)

        const handDirection = {
          x: rightIndex.x - rightWrist.x,
          y: rightIndex.y - rightWrist.y
        }
        const rotation = Math.atan2(handDirection.y, handDirection.x) + Math.PI / 2

        glovesInfo.push({
          position: rightCenter,
          size: gloveSize,
          rotation: rotation,
          isLeft: false
        })
      }
    }

    return glovesInfo
  }

  cleanup() {
    this.bagSpawner.cleanup()
    this.floatingTextManager.clear()
    this.sniperSystem.reset()
    this.poseHistory = []
    this.fullPoseHistory = []
    this.gameActive = false
  }

  updateDimensions(newDimensions: { width: number; height: number }) {
    this.gameDimensions = newDimensions
    this.gameWidth = newDimensions.width
    this.gameHeight = newDimensions.height
    
    this.bagSpawner.updateDimensions(newDimensions)
    this.sniperSystem.updateDimensions(newDimensions)
  }
}