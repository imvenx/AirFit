import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Vector2 } from 'src/models/models'
import { AudioManager } from './AudioManager'

interface SniperTarget {
  id: string
  position: Vector2
  radius: number
  warningStartTime: number
  hitTime: number
  hasHit: boolean
  warningDuration: number
  targetZone: 'top-left' | 'top-center' | 'top-right' | 'head-tracking'
  warningSoundStarted: boolean
}

export class SniperSystem {
  private targets: SniperTarget[] = []
  private lastTargetSpawn: number = 0
  private initialSpawnInterval: number = 3000 // Start at 3 seconds
  private minSpawnInterval: number = 500 // Minimum 0.5 seconds
  private initialWarningDuration: number = 3000 // Start at 3 seconds warning
  private minWarningDuration: number = 500 // Minimum 0.5 second warning
  private targetRadius: number = 60 // Size of target area
  private gameActive: boolean = false
  private gameStartTime: number = 0
  private audioManager: AudioManager
  private dodgeText: string = 'DODGE!'

  // Difficulty progression constants
  private readonly DIFFICULTY_RAMP_DURATION_SECONDS: number = 120 // 2 minutes

  // Target zones relative to canvas (normalized 0-1)
  private readonly TARGET_ZONES = {
    'top-left': { x: 0.25, y: 0.25 },
    'top-center': { x: 0.5, y: 0.25 },
    'top-right': { x: 0.75, y: 0.25 }
  }

  constructor(
    private gameWidth: number,
    private gameHeight: number,
    private onPlayerHit: () => void,
    dodgeText?: string
  ) {
    this.audioManager = new AudioManager()
    if (dodgeText) this.dodgeText = dodgeText
  }

  start() {
    this.gameActive = true
    this.targets = []
    this.gameStartTime = Date.now()
    this.lastTargetSpawn = Date.now()
  }

  stop() {
    this.gameActive = false
    this.targets = []
    this.audioManager.stopWarningSound()
  }

  update(deltaTime: number, poseLandmarks: NormalizedLandmark[]) {
    if (!this.gameActive) return

    const now = Date.now()

    // Spawn new targets with progressive difficulty (only if no active targets)
    const currentSpawnInterval = this.getCurrentSpawnInterval()
    if (this.targets.length === 0 && now - this.lastTargetSpawn > currentSpawnInterval) {
      this.spawnTarget(poseLandmarks)
      this.lastTargetSpawn = now
    }

    // Update existing targets
    this.targets = this.targets.filter(target => {
      const timeSinceWarning = now - target.warningStartTime

      // Start continuous warning sound when target appears
      if (!target.hasHit && !target.warningSoundStarted) {
        this.audioManager.startWarningSound(target.warningDuration)
        target.warningSoundStarted = true
      }

      // Check if it's time to hit
      if (timeSinceWarning >= target.warningDuration && !target.hasHit) {
        target.hasHit = true

        // Stop warning sound
        this.audioManager.stopWarningSound()

        // Check if player is in the target area
        if (this.isPlayerInTarget(target, poseLandmarks)) {
          this.audioManager.playDamageSound()
          this.onPlayerHit()
        } else {
          this.audioManager.playDodgeSound()
        }

        // Keep target visible for a brief moment after hit
        target.hitTime = now
      }

      // Remove target 500ms after hit
      if (target.hasHit && now - target.hitTime > 500) {
        return false
      }

      return true
    })
  }

  private getCurrentSpawnInterval(): number {
    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const progressRatio = Math.min(gameTimeSeconds / this.DIFFICULTY_RAMP_DURATION_SECONDS, 1)
    return this.initialSpawnInterval - (this.initialSpawnInterval - this.minSpawnInterval) * progressRatio
  }

  private getCurrentWarningDuration(): number {
    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const progressRatio = Math.min(gameTimeSeconds / this.DIFFICULTY_RAMP_DURATION_SECONDS, 1)
    return this.initialWarningDuration - (this.initialWarningDuration - this.minWarningDuration) * progressRatio
  }

  private spawnTarget(poseLandmarks?: NormalizedLandmark[]) {
    let targetPosition: { x: number, y: number }
    let targetZone: 'top-left' | 'top-center' | 'top-right' | 'head-tracking' = 'top-center'

    // Try to target the user's head if pose landmarks are available
    if (poseLandmarks && poseLandmarks.length > 0 && poseLandmarks[0]) {
      const headLandmark = poseLandmarks[0] // Head is landmark 0
      targetPosition = {
        x: headLandmark.x * this.gameWidth,
        y: headLandmark.y * this.gameHeight
      }
      targetZone = 'head-tracking'
    } else {
      // Fallback to random zones if no head detected
      const zones: Array<'top-left' | 'top-center' | 'top-right'> = ['top-left', 'top-center', 'top-right']
      const randomZone = zones[Math.floor(Math.random() * zones.length)]
      const zonePosition = this.TARGET_ZONES[randomZone]
      targetPosition = {
        x: zonePosition.x * this.gameWidth,
        y: zonePosition.y * this.gameHeight
      }
      targetZone = randomZone
    }

    const target: SniperTarget = {
      id: Math.random().toString(36).substr(2, 9),
      position: targetPosition,
      radius: this.targetRadius,
      warningStartTime: Date.now(),
      hitTime: 0,
      hasHit: false,
      warningDuration: this.getCurrentWarningDuration(),
      targetZone: targetZone,
      warningSoundStarted: false
    }

    this.targets.push(target)
  }

  private isPlayerInTarget(target: SniperTarget, poseLandmarks: NormalizedLandmark[]): boolean {
    if (!poseLandmarks || poseLandmarks.length === 0) {
      return false
    }

    // Check key body points: head, shoulders, torso
    const HEAD = 0
    const LEFT_SHOULDER = 11
    const RIGHT_SHOULDER = 12
    const LEFT_HIP = 23
    const RIGHT_HIP = 24

    const keyPoints = [HEAD, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP]


    for (const pointIndex of keyPoints) {
      if (pointIndex < poseLandmarks.length && poseLandmarks[pointIndex]) {
        const landmark = poseLandmarks[pointIndex]
        const pointX = landmark.x * this.gameWidth
        const pointY = landmark.y * this.gameHeight

        const distance = Math.sqrt(
          Math.pow(pointX - target.position.x, 2) +
          Math.pow(pointY - target.position.y, 2)
        )


        if (distance <= target.radius) {
          return true
        }
      }
    }

    return false
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.targets.forEach(target => {
      const now = Date.now()
      const timeSinceWarning = now - target.warningStartTime
      const warningProgress = Math.min(timeSinceWarning / target.warningDuration, 1)

      ctx.save()

      // Don't flip - draw directly like the landmarks

      if (!target.hasHit) {
        // Draw warning indicator (crosshair/sniper aim)
        const alpha = 0.3 + warningProgress * 0.5
        ctx.globalAlpha = alpha

        // Outer circle
        ctx.strokeStyle = warningProgress > 0.7 ? '#FF0000' : '#FFA500'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(target.position.x, target.position.y, target.radius, 0, Math.PI * 2)
        ctx.stroke()

        // Crosshair lines
        const crosshairSize = target.radius * 0.8
        ctx.beginPath()
        // Horizontal line
        ctx.moveTo(target.position.x - crosshairSize, target.position.y)
        ctx.lineTo(target.position.x + crosshairSize, target.position.y)
        // Vertical line
        ctx.moveTo(target.position.x, target.position.y - crosshairSize)
        ctx.lineTo(target.position.x, target.position.y + crosshairSize)
        ctx.stroke()

        // Inner dot
        ctx.fillStyle = ctx.strokeStyle
        ctx.beginPath()
        ctx.arc(target.position.x, target.position.y, 3, 0, Math.PI * 2)
        ctx.fill()

        // Warning text
        if (warningProgress > 0.5) {
          ctx.save()
          ctx.globalAlpha = 1
          ctx.font = 'bold 20px Arial'
          ctx.fillStyle = '#FF0000'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          // Flip text horizontally to counteract any mirroring
          ctx.translate(target.position.x, target.position.y - target.radius - 10)
          ctx.scale(-1, 1)
          ctx.fillText(this.dodgeText, 0, 0)
          ctx.restore()
        }
      } else {
        // Draw hit effect
        const hitAge = now - target.hitTime
        const hitAlpha = Math.max(0, 1 - hitAge / 500)

        ctx.globalAlpha = hitAlpha
        ctx.fillStyle = '#FF0000'
        ctx.beginPath()
        ctx.arc(target.position.x, target.position.y, target.radius * 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Hit flash
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(target.position.x, target.position.y, target.radius * (1 + hitAge / 500), 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.restore()
    })
  }

  reset() {
    this.targets = []
    this.lastTargetSpawn = 0
    this.gameStartTime = 0
    this.gameActive = false
    this.audioManager.stopWarningSound()
  }

  updateDimensions(newDimensions: { width: number; height: number }) {
    this.gameWidth = newDimensions.width
    this.gameHeight = newDimensions.height
  }
}