import { Vector2 } from "src/models/models"
import { soundPlayer } from "../Audio/SoundPlayer"
import { canvasCtx, currentFrame, gameSceneSize } from "../GameManager"
import { IBubble } from "./Bubble"

export class GoodBubble implements IBubble {
    minSpeed = 150
    speed: number
    position: Vector2
    minRadius = 40
    radius: number = this.minRadius + (Math.random() * 40)
    color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, .6)`
    private destroyCallback: () => void

    isDestroyed = false
    destroyedAtFrame?: number = undefined
    destroyedAnimTotalFrames = 2
    framesRemainingBeforeDestroy?: number = undefined

    constructor(destroyCallback: () => void, speedModifier: number) {
        const pos = { x: Math.random() * gameSceneSize.value.width, y: gameSceneSize.value.height + 100 }
        if (pos.x < this.radius) pos.x = this.radius
        if (pos.x > gameSceneSize.value.width - this.radius) pos.x = gameSceneSize.value.width - this.radius

        this.position = pos
        this.destroyCallback = destroyCallback
        this.speed = this.minSpeed + Math.random() * speedModifier
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
            this.playDestroyAudio()
            this.isDestroyed = true
            this.destroyedAtFrame = currentFrame
            window.dispatchEvent(new CustomEvent('scoreChange', { detail: { changeBy: 1 } }))
        }

        if (this.framesRemainingBeforeDestroy! <= currentFrame) {
            this.destroyCallback()
        }
    }

    // playDestroyAudio() {
    //     const bop = new (window.AudioContext || (window as any).webkitAudioContext)()
    //     const osc = bop.createOscillator()
    //     osc.type = 'sine'
    //     osc.frequency.setValueAtTime(300, bop.currentTime)
    //     osc.connect(bop.destination)
    //     osc.start()
    //     osc.stop(bop.currentTime + 0.1)
    // }

    private playDestroyAudio() {
        const normalizedPosition = (this.position.x - this.radius) / (gameSceneSize.value.width - this.radius * 2);
        const pan = (1 - normalizedPosition) * 2 - 1; // Flip the normalized position

        soundPlayer.play({
            type: 'sine',
            frequencyStart: 300 - this.radius * 3,
            frequencyEnd: 600 - this.radius * 3,
            frequencyDuration: 0.15,
            gainStart: 0.3,
            gainEnd: 0.01,
            gainDuration: 0.2,
            duration: 0.2,
            pan: pan
        });
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
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)")  // Inner color
        gradient.addColorStop(1, this.color)  // Outer color

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
        const outerOpacity = frame == 2 ? .2 : .05
        const innerOpacity = frame == 2 ? .3 : .1
        const strokeOpacity = frame == 2 ? .4 : .2
        if (frame === 2) radius *= 1.1

        // Create a radial gradient for a bubble effect
        const gradient = canvasCtx.createRadialGradient(
            pos.x,
            pos.y,
            (radius * 1.05) * 0.3,
            pos.x,
            pos.y,
            (radius * 1.05)
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${innerOpacity})`)  // Inner color
        gradient.addColorStop(1, `rgba(255,255,255, ${outerOpacity})`)  // Outer color

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
