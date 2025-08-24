import { Vector2 } from "src/models/models"
import { soundPlayer } from "../Audio/SoundPlayer"
import { canvasCtx, currentFrame, gameSceneSize } from "../GameManager"
import { IBubble } from "./Bubble"

export class BombBubble implements IBubble {
    speed: number = 200
    position: Vector2
    radius: number = 40
    color = `rgb(0,0,0)`
    private destroyCallback: () => void

    isDestroyed = false
    destroyedAtFrame?: number = undefined
    destroyedAnimTotalFrames = 4
    framesRemainingBeforeDestroy?: number = undefined

    constructor(destroyCallback: () => void) {
        const pos = { x: Math.random() * gameSceneSize.value.width, y: gameSceneSize.value.height + 100 }
        if (pos.x < this.radius) pos.x = this.radius
        if (pos.x > gameSceneSize.value.width - this.radius) pos.x = gameSceneSize.value.width - this.radius

        this.position = pos
        this.destroyCallback = destroyCallback
    }

    update(deltaTime: number) {
        if (this.isDestroyed) {
            this.framesRemainingBeforeDestroy = this.destroyedAtFrame! + this.destroyedAnimTotalFrames
            if (this.framesRemainingBeforeDestroy! > currentFrame) {
                const animFrame = this.framesRemainingBeforeDestroy - currentFrame
                this.drawDestroyed(this.position, this.radius, animFrame)
            }
        } else {
            this.position.y -= this.speed * deltaTime;
            this.draw()
        }
    }

    onHit() {
        if (!this.isDestroyed) {
            this.isDestroyed = true
            this.playDestroyAudio()
            this.destroyedAtFrame = currentFrame
            window.dispatchEvent(new CustomEvent('bombExplode'))
            window.dispatchEvent(new CustomEvent('playerTakeDamage', { detail: { changeBy: -1 } }))
        }

        if (this.framesRemainingBeforeDestroy! <= currentFrame) {
            this.destroy()
        }
    }

    private destroy() {
        this.destroyCallback()
    }

    private playDestroyAudio() {
        // soundPlayer.play({
        //     type: 'square',                      // Square wave for a bomb-like effect
        //     frequencyStart: 60,                  // Low frequency to simulate a deep sound
        //     gainStart: 1,                        // Initial gain (loud)
        //     gainEnd: 0.01,                       // Quick fade-out for an explosive effect
        //     gainDuration: 0.3,                   // Ramp down duration for fade-out
        //     duration: 0.3                        // Total duration of the sound
        // })

        soundPlayer.play({
            type: 'square',             // Square wave for a bomb-like effect
            frequencyStart: 40,         // Low frequency for a deep sound
            gainStart: .6,               // Initial gain (loud)
            gainEnd: 0.01,              // Quick fade-out for explosive effect
            gainDuration: 0.3,          // Ramp down duration for fade-out
            duration: 0.3               // Total duration of the sound
        })
    }

    private draw() {
        // Create a radial gradient for a bubble effect
        const gradient = canvasCtx.createRadialGradient(
            this.position.x,
            this.position.y,
            this.radius * 0.3,
            this.position.x,
            this.position.y,
            this.radius
        )

        if (currentFrame % 3) {
            gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)")  // Inner color
            gradient.addColorStop(1, this.color)  // Outer color
        }
        else {
            gradient.addColorStop(0, "rgba(255, 0, 0, 0.5)")  // Inner color
            gradient.addColorStop(1, this.color)  // Outer color
        }

        // Draw the bubble with gradient fill and stroke
        canvasCtx.beginPath()
        canvasCtx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
        canvasCtx.fillStyle = gradient
        canvasCtx.fill()

        // Define a translucent outline for the bubble
        canvasCtx.lineWidth = 2
        canvasCtx.strokeStyle = "rgba(173, 216, 230, 0.5)"
        canvasCtx.stroke()
    }

    drawDestroyed(pos: Vector2, radius: number, frame: number) {
        const outerOpacity = frame == 2 ? 1 : .5
        const innerOpacity = frame == 2 ? 1 : .5
        const strokeOpacity = frame == 2 ? 1 : .5
        radius *= frame > 2 ? 1.3 : 1.6

        // Create a radial gradient for a bubble effect
        const gradient = canvasCtx.createRadialGradient(
            pos.x,
            pos.y,
            (radius * 1.05) * 0.3,
            pos.x,
            pos.y,
            (radius * 1.05)
        )
        gradient.addColorStop(0, `rgba(255, 255, 0, ${innerOpacity})`)  // Inner color
        gradient.addColorStop(1, `rgba(255,0,0, ${outerOpacity})`)  // Outer color

        // Draw the bubble with gradient fill and stroke
        canvasCtx.beginPath()
        canvasCtx.arc(pos.x, pos.y, (radius * 1.05), 0, 2 * Math.PI)
        canvasCtx.fillStyle = gradient
        canvasCtx.fill()

        // Define a translucent outline for the bubble
        canvasCtx.lineWidth = 2
        canvasCtx.strokeStyle = `rgba(173, 216, 230, ${strokeOpacity})`
        canvasCtx.stroke()
    }
}