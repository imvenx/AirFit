import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Vector2 } from 'src/models/models'

let effectsAudioContext: AudioContext | null = null

async function initEffectsAudio() {
  if (!effectsAudioContext) {
    effectsAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (effectsAudioContext.state === 'suspended') {
    await effectsAudioContext.resume()
  }
}

async function playBubblePopSound(bubbleRadius: number, bubblePositionX: number, gameWidth: number = 640) {
  try {
    await initEffectsAudio()
    if (!effectsAudioContext) return

    const normalizedPosition = (bubblePositionX - bubbleRadius) / (gameWidth - bubbleRadius * 2)
    const pan = (1 - normalizedPosition) * 2 - 1

    const oscillator = effectsAudioContext.createOscillator()
    const gainNode = effectsAudioContext.createGain()
    const panNode = effectsAudioContext.createStereoPanner()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(300 - bubbleRadius * 3, effectsAudioContext.currentTime)
    oscillator.frequency.linearRampToValueAtTime(600 - bubbleRadius * 3, effectsAudioContext.currentTime + 0.15)

    gainNode.gain.setValueAtTime(0.5, effectsAudioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, effectsAudioContext.currentTime + 0.2)

    panNode.pan.setValueAtTime(pan, effectsAudioContext.currentTime)

    oscillator.connect(gainNode)
    gainNode.connect(panNode)
    panNode.connect(effectsAudioContext.destination)

    oscillator.start()
    oscillator.stop(effectsAudioContext.currentTime + 0.2)
  } catch (error) {
    console.warn('Bubble pop sound failed:', error)
  }
}

async function playBombSound() {
  try {
    await initEffectsAudio()
    if (!effectsAudioContext) return

    const oscillator = effectsAudioContext.createOscillator()
    const gainNode = effectsAudioContext.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(60, effectsAudioContext.currentTime)

    gainNode.gain.setValueAtTime(0.3, effectsAudioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, effectsAudioContext.currentTime + 0.3)

    oscillator.connect(gainNode)
    gainNode.connect(effectsAudioContext.destination)

    oscillator.start()
    oscillator.stop(effectsAudioContext.currentTime + 0.3)
  } catch (error) {
    console.warn('Bomb sound failed:', error)
  }
}

interface Bubble {
  id: string
  position: Vector2
  radius: number
  speed: number
  type: 'good' | 'bomb'
  color: string
  update(deltaTime: number): void
  draw(ctx: CanvasRenderingContext2D): void
  onHit(): void
}

class GoodBubble implements Bubble {
  id: string
  position: Vector2
  radius: number
  speed: number
  type: 'good' = 'good'
  color: string
  
  isDestroyed = false
  destroyedAtFrame?: number = undefined
  destroyedAnimTotalFrames = 2
  framesRemainingBeforeDestroy?: number = undefined
  
  constructor(private onDestroy: () => void, speedModifier: number = 0, gameWidth: number = 640, private currentFrame: () => number, gameHeight: number = 480) {
    this.id = Math.random().toString(36).substr(2, 9)
    this.radius = 40 + Math.random() * 40
    this.position = {
      x: Math.random() * (gameWidth - this.radius * 2) + this.radius,
      y: gameHeight + 100
    }
    this.speed = 150 + Math.random() * speedModifier
    
    this.color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, .6)`
  }

  update(deltaTime: number) {
    if (this.isDestroyed) {
      this.framesRemainingBeforeDestroy = this.destroyedAtFrame! + this.destroyedAnimTotalFrames
      if (this.framesRemainingBeforeDestroy! > this.currentFrame()) {
        const animFrame = this.framesRemainingBeforeDestroy! - this.currentFrame()
        // Animation continues, will be drawn by drawDestroyed
      } else {
        this.destroy()
      }
    } else {
      this.position.y -= this.speed * deltaTime
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isDestroyed) {
      this.drawDestroyed(ctx)
      return
    }
    
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, this.radius * 0.3,
      this.position.x, this.position.y, this.radius
    )
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)")
    gradient.addColorStop(1, this.color)

    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(173, 216, 230, 0.5)"
    ctx.stroke()
  }

  drawDestroyed(ctx: CanvasRenderingContext2D) {
    const frame = this.framesRemainingBeforeDestroy! - this.currentFrame()
    const outerOpacity = frame == 2 ? .2 : .05
    const innerOpacity = frame == 2 ? .3 : .1
    const strokeOpacity = frame == 2 ? .4 : .2
    let radius = this.radius
    if (frame === 2) radius *= 1.1

    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, (radius * 1.05) * 0.3,
      this.position.x, this.position.y, (radius * 1.05)
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${innerOpacity})`)
    gradient.addColorStop(1, `rgba(255,255,255, ${outerOpacity})`)

    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, (radius * 1.05), 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = `rgba(173, 216, 230, ${strokeOpacity})`
    ctx.stroke()
  }

  onHit() {
    if (!this.isDestroyed) {
      playBubblePopSound(this.radius, this.position.x, 640)
      this.isDestroyed = true
      this.destroyedAtFrame = this.currentFrame()
    }

    if (this.framesRemainingBeforeDestroy! <= this.currentFrame()) {
      this.destroy()
    }
  }

  private destroy() {
    window.dispatchEvent(new CustomEvent('scoreChange', { detail: { changeBy: 10 } }))
    this.onDestroy()
  }
}

class BombBubble implements Bubble {
  id: string
  position: Vector2
  radius: number = 40
  speed: number = 200
  type: 'bomb' = 'bomb'
  color: string = 'rgb(0,0,0)'
  
  isDestroyed = false
  destroyedAtFrame?: number = undefined
  destroyedAnimTotalFrames = 4
  framesRemainingBeforeDestroy?: number = undefined
  
  constructor(private onDestroy: () => void, gameWidth: number = 640, private currentFrame: () => number, gameHeight: number = 480) {
    this.id = Math.random().toString(36).substr(2, 9)
    this.position = {
      x: Math.random() * (gameWidth - this.radius * 2) + this.radius,
      y: gameHeight + 100
    }
  }

  update(deltaTime: number) {
    if (this.isDestroyed) {
      this.framesRemainingBeforeDestroy = this.destroyedAtFrame! + this.destroyedAnimTotalFrames
      if (this.framesRemainingBeforeDestroy! > this.currentFrame()) {
        const animFrame = this.framesRemainingBeforeDestroy! - this.currentFrame()
        // Animation continues, will be drawn by drawDestroyed
      } else {
        this.destroy()
      }
    } else {
      this.position.y -= this.speed * deltaTime
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isDestroyed) {
      this.drawDestroyed(ctx)
      return
    }

    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, this.radius * 0.3,
      this.position.x, this.position.y, this.radius
    )

    if (this.currentFrame() % 3) {
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)")
      gradient.addColorStop(1, this.color)
    } else {
      gradient.addColorStop(0, "rgba(255, 0, 0, 0.5)")
      gradient.addColorStop(1, this.color)
    }

    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(173, 216, 230, 0.5)"
    ctx.stroke()
  }

  drawDestroyed(ctx: CanvasRenderingContext2D) {
    const frame = this.framesRemainingBeforeDestroy! - this.currentFrame()
    const outerOpacity = frame == 2 ? 1 : .5
    const innerOpacity = frame == 2 ? 1 : .5
    const strokeOpacity = frame == 2 ? 1 : .5
    let radius = this.radius * (frame > 2 ? 1.3 : 1.6)

    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, (radius * 1.05) * 0.3,
      this.position.x, this.position.y, (radius * 1.05)
    )
    gradient.addColorStop(0, `rgba(255, 255, 0, ${innerOpacity})`)
    gradient.addColorStop(1, `rgba(255,0,0, ${outerOpacity})`)

    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, (radius * 1.05), 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.lineWidth = 2
    ctx.strokeStyle = `rgba(173, 216, 230, ${strokeOpacity})`
    ctx.stroke()
  }

  onHit() {
    if (!this.isDestroyed) {
      this.isDestroyed = true
      playBombSound()
      this.destroyedAtFrame = this.currentFrame()
      window.dispatchEvent(new CustomEvent('bombExplode'))
      window.dispatchEvent(new CustomEvent('playerTakeDamage', { detail: { damage: 1 } }))
    }

    if (this.framesRemainingBeforeDestroy! <= this.currentFrame()) {
      this.destroy()
    }
  }

  private destroy() {
    this.onDestroy()
  }
}

export class BubbleBopGameManager {
  private bubbles: Bubble[] = []
  private gameSize: { width: number; height: number }
  private lastUpdateTime: number | null = null
  private addBubbleInterval: number | null = null
  private gameActive: boolean = false
  private addBubbleTimeModifier: number = 700
  private readonly addBubbleTimeModifierStart: number = 700

  constructor(
    private ctx: CanvasRenderingContext2D,
    gameSize: { width: number; height: number }
  ) {
    this.gameSize = gameSize
    // Set global canvas context for bomb bubbles
    ;(window as any).gameCanvasCtx = this.ctx
  }

  startGame() {
    this.gameActive = true
    this.startBubbleSpawning()
  }

  pauseGame() {
    this.gameActive = false
    if (this.addBubbleInterval) {
      clearInterval(this.addBubbleInterval)
      this.addBubbleInterval = null
    }
  }

  resetGame() {
    this.bubbles = []
    this.addBubbleTimeModifier = this.addBubbleTimeModifierStart
    this.lastUpdateTime = null
    if (this.addBubbleInterval) {
      clearInterval(this.addBubbleInterval)
      this.addBubbleInterval = null
    }
  }

  update(timestamp: number, handLandmarks: NormalizedLandmark[]) {
    if (!this.gameActive) return

    if (this.lastUpdateTime === null) {
      this.lastUpdateTime = timestamp
    }
    
    const deltaTime = (timestamp - this.lastUpdateTime) / 1000
    this.lastUpdateTime = timestamp

    // Update bubbles
    this.bubbles.forEach(bubble => {
      bubble.update(deltaTime)
      
      // Remove off-screen bubbles
      if (bubble.position.y + bubble.radius < 0) {
        this.removeBubble(bubble)
      }
    })

    // Check for hand collisions
    this.checkHandCollisions(handLandmarks)

    // Draw bubbles only
    this.draw()
  }

  private startBubbleSpawning() {
    // Add first bubble immediately
    this.addBubble()
    
    const spawnBubble = () => {
      if (!this.gameActive) return
      
      if (this.addBubbleTimeModifier > 0) {
        this.addBubbleTimeModifier -= 2
      }
      
      this.addBubble()
      
      this.addBubbleInterval = setTimeout(spawnBubble, 100 + this.addBubbleTimeModifier)
    }
    
    // Start the spawning loop after initial delay
    this.addBubbleInterval = setTimeout(spawnBubble, 100 + this.addBubbleTimeModifier)
  }

  private addBubble() {
    const speedModifier = (this.addBubbleTimeModifierStart - this.addBubbleTimeModifier) * 0.3
    const currentFrameFunc = () => Math.floor(performance.now() / 100)
    
    const bubble: Bubble = Math.random() > 0.2 
      ? new GoodBubble(() => this.removeBubble(bubble), speedModifier, this.gameSize.width, currentFrameFunc, this.gameSize.height)
      : new BombBubble(() => this.removeBubble(bubble), this.gameSize.width, currentFrameFunc, this.gameSize.height)
    
    this.bubbles.push(bubble)
  }

  private removeBubble(bubble: Bubble) {
    this.bubbles = this.bubbles.filter(b => b !== bubble)
  }

  private checkHandCollisions(handLandmarks: NormalizedLandmark[]) {
    handLandmarks.forEach(landmark => {
      const handPoint = {
        x: landmark.x * this.gameSize.width,
        y: landmark.y * this.gameSize.height
      }

      this.bubbles.forEach(bubble => {
        if (this.isPointInCircle(handPoint, bubble.position, bubble.radius)) {
          bubble.onHit()
        }
      })
    })
  }

  private isPointInCircle(point: Vector2, center: Vector2, radius: number): boolean {
    const dx = point.x - center.x
    const dy = point.y - center.y
    return dx * dx + dy * dy <= radius * radius
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.gameSize.width, this.gameSize.height)
    
    // Draw bubbles
    this.bubbles.forEach(bubble => {
      bubble.draw(this.ctx)
    })
  }

  resetGame() {
    this.bubbles = []
    this.addBubbleTimeModifier = this.addBubbleTimeModifierStart
    this.lastUpdateTime = null
    if (this.addBubbleInterval) {
      clearInterval(this.addBubbleInterval)
      this.addBubbleInterval = null
    }
    this.gameActive = false
  }

  cleanup() {
    this.pauseGame()
    this.bubbles = []
  }

  updateDimensions(newDimensions: { width: number; height: number }) {
    this.gameSize = newDimensions
  }
}