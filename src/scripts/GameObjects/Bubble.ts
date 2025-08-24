import { Vector2 } from "src/models/models"

export interface IBubble {
    speed: number
    position: Vector2
    radius: number
    update: Function
    onHit: Function
}

// export abstract class Bubble {
//     speed: number = 1
//     position: Vector2
//     radius: number = 40
//     isBad = false
//     color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, .6)`
//     protected destroyCallback: () => void

//     constructor(position: Vector2, destroyCallback: () => void) {
//         this.position = position
//         this.destroyCallback = destroyCallback

//         // if (isBad) {
//         //     this.color = 'rgb(0,0,0)'
//         // }
//     }

//     update(deltaTime: number) {
//         this.position.y -= this.speed * deltaTime;
//     }

//     trigger() {
//         window.dispatchEvent(new CustomEvent('scoreChange', { detail: { changeBy: 1 } }))
//         this.playDestroyAudio()
//         this.destroyCallback()
//     }

//     playDestroyAudio() {
//         const bop = new (window.AudioContext || (window as any).webkitAudioContext)()
//         const osc = bop.createOscillator()
//         osc.type = 'sine'
//         osc.frequency.setValueAtTime(300, bop.currentTime)
//         osc.connect(bop.destination)
//         osc.start()
//         osc.stop(bop.currentTime + 0.1)
//     }

//     draw(canvasCtx: CanvasRenderingContext2D) {
//         // Create a radial gradient for a bubble effect
//         const gradient = canvasCtx.createRadialGradient(
//             this.position.x,
//             this.position.y,
//             this.radius * 0.3,
//             this.position.x,
//             this.position.y,
//             this.radius
//         )
//         gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)")  // Inner color
//         gradient.addColorStop(1, this.color)  // Outer color

//         // Draw the bubble with gradient fill and stroke
//         canvasCtx.beginPath()
//         canvasCtx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
//         canvasCtx.fillStyle = gradient
//         canvasCtx.fill()

//         // Define a translucent outline for the bubble
//         canvasCtx.lineWidth = 2
//         canvasCtx.strokeStyle = "rgba(173, 216, 230, 0.5)"
//         canvasCtx.stroke()
//     }

//     drawCute(canvasCtx: CanvasRenderingContext2D) {
//         // Draw the bubble as a solid color circle
//         canvasCtx.beginPath()
//         canvasCtx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI)
//         canvasCtx.fillStyle = this.color
//         canvasCtx.fill()
//         canvasCtx.strokeStyle = "black"
//         canvasCtx.lineWidth = 2
//         canvasCtx.stroke()

//         // Draw angry eyes
//         const eyeOffsetX = this.radius * 0.4
//         const eyeOffsetY = this.radius * 0.3
//         const eyeRadius = this.radius * 0.1

//         canvasCtx.beginPath()
//         canvasCtx.arc(this.position.x - eyeOffsetX, this.position.y - eyeOffsetY, eyeRadius, 0, 2 * Math.PI) // Left eye
//         canvasCtx.arc(this.position.x + eyeOffsetX, this.position.y - eyeOffsetY, eyeRadius, 0, 2 * Math.PI) // Right eye
//         canvasCtx.fillStyle = "black"
//         canvasCtx.fill()

//         // Draw angry eyebrows
//         canvasCtx.beginPath()
//         canvasCtx.moveTo(this.position.x - eyeOffsetX - eyeRadius, this.position.y - eyeOffsetY - eyeRadius)
//         canvasCtx.lineTo(this.position.x - eyeOffsetX + eyeRadius, this.position.y - eyeOffsetY - eyeRadius - 5)
//         canvasCtx.moveTo(this.position.x + eyeOffsetX - eyeRadius, this.position.y - eyeOffsetY - eyeRadius - 5)
//         canvasCtx.lineTo(this.position.x + eyeOffsetX + eyeRadius, this.position.y - eyeOffsetY - eyeRadius)
//         canvasCtx.strokeStyle = "black"
//         canvasCtx.lineWidth = 2
//         canvasCtx.stroke()

//         // Draw frowning mouth
//         canvasCtx.beginPath()
//         canvasCtx.arc(this.position.x, this.position.y + eyeOffsetY, this.radius * 0.4, Math.PI, 2 * Math.PI, true) // Frown
//         canvasCtx.strokeStyle = "black"
//         canvasCtx.lineWidth = 2
//         canvasCtx.stroke()
//     }

// }