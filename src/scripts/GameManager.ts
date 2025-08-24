import { Vector2 } from "src/models/models"
import { IBubble } from "./GameObjects/Bubble"
import { NormalizedLandmark } from "@mediapipe/tasks-vision"
import { GoodBubble } from "src/scripts/GameObjects/GoodBubble"
import { BombBubble } from "src/scripts/GameObjects/BombBubble"
import { ref } from "vue"

export const gameSceneSize = ref<{ width: number, height: number }>({ width: 0, height: 0 })

export const isGameOver = ref(false)
let bubbles: IBubble[] = []

export const score = ref(0)
export const playerInitialLife = ref(3)
export const playerCurrentLife = ref(playerInitialLife.value)

export function resetGameState() {
    isGameOver.value = false
    bubbles = []
    score.value = 0
    playerCurrentLife.value = playerInitialLife.value
    addBubbleTimeModifier = addBubbleTimeModifierStartValue
    isGameStarted.value = false
    started = false
}

export let canvasCtx: CanvasRenderingContext2D
export let currentFrame = 0
export let isGameStarted = ref(false)
const fps = 10
const frameDuration = 1000 / fps

const addBubbleTimeModifierStartValue = 700
let addBubbleTimeModifier: number = addBubbleTimeModifierStartValue

let started = false

export class GameManager {
    lastUpdateTime: number | null = null

    addBubbleLoopTimeoutId: any

    constructor(_canvasCtx: CanvasRenderingContext2D) {
        canvasCtx = _canvasCtx
    }

    runGameLoop(timestamp: number, landmarks: NormalizedLandmark[][]) {
        // console.log(addBubbleTimeModifier)
        if (this.lastUpdateTime === null) {
            this.lastUpdateTime = timestamp;
        }
        const deltaTime = (timestamp - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = timestamp;

        currentFrame = Math.floor(timestamp / frameDuration);

        bubbles.forEach(bubble => {
            bubble.update(deltaTime); // Pass deltaTime instead of timestamp
            // bubble.draw();

            // Remove bubbles that moved off-screen
            if (bubble.position.y + bubble.radius < 0) {
                this.removeBubble(bubble);
            }
        });



        if (isGameOver.value) return
        // Process landmarks for interactions
        landmarks.forEach(landmarkGroup => {
            landmarkGroup.forEach(landmark => this.checkIfIsHit(landmark));
        });
    }

    addBubbleLoop() {
        if (started) return
        started = true
        this._addBubbleLoop()
    }

    _addBubbleLoop() {
        this.addBubbleLoopTimeoutId = setTimeout(() => {
            if (isGameOver.value) return
            if (addBubbleTimeModifier > 0) addBubbleTimeModifier -= 2
            this.addBubble()
            this._addBubbleLoop()
        }, 100 + addBubbleTimeModifier);
    }

    addBubble() {
        // const position = { x: Math.random() * gameSceneSize.value.width, y: gameSceneSize.value.height + 100 }
        // if (position.x < 40) position.x = 40
        // if (position.x > gameSceneSize.value.width - 40) position.x = gameSceneSize.value.width - 40
        const cb = () => this.removeBubble(bubble)
        const speedModifier = (addBubbleTimeModifierStartValue - addBubbleTimeModifier) * .3
        const bubble: IBubble = Math.random() > .2 ? new GoodBubble(cb, speedModifier) : new BombBubble(cb)
        bubbles.push(bubble)
    }

    removeBubble(bubble: IBubble) {
        bubbles = bubbles.filter(b => b !== bubble)
    }

    // drawBubble({ x: x, y: y }: Vector2) {
    //     const radius = 40

    //     // Create a radial gradient for a bubble effect
    //     const gradient = this.canvasCtx.createRadialGradient(x, y, radius * 0.3, x, y, radius)
    //     gradient.addColorStop(0, "rgba(255, 255, 255, 0.7)")  // Inner color
    //     gradient.addColorStop(1, "rgba(173, 216, 230, 0.3)")  // Outer color, light blue with transparency

    //     // Draw the bubble with gradient fill and stroke
    //     this.canvasCtx.beginPath()
    //     this.canvasCtx.arc(x, y, radius, 0, 2 * Math.PI)
    //     this.canvasCtx.fillStyle = gradient
    //     this.canvasCtx.fill()

    //     // Define a translucent outline for the bubble
    //     this.canvasCtx.lineWidth = 2
    //     this.canvasCtx.strokeStyle = "rgba(173, 216, 230, 0.5)"
    //     this.canvasCtx.stroke()
    // }


    checkIfIsHit({ x, y }: NormalizedLandmark) {
        bubbles.forEach(bubble => {
            const isHit = this.isPointInCircle(
                { x: x * gameSceneSize.value.width, y: y * gameSceneSize.value.height },
                bubble.position,
                bubble.radius
            )
            if (isHit) {
                bubble.onHit()
            }
        })
    }

    isPointInCircle(point: Vector2, center: Vector2, radius: number): boolean {
        const dx = point.x - center.x
        const dy = point.y - center.y
        return dx * dx + dy * dy <= radius * radius
    }
}
