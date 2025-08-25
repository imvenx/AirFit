<template>
  <div class="pong-test">
    <canvas ref="gameCanvasRef" class="screen-canvas"></canvas>

    <div class="hud">
      <div class="title">Pong Test</div>
      <div class="hint">Move paddles with your hands. One or two players.</div>
      <div class="scores">
        <span>Left: {{ scoreLeft }}</span>
        <span>Right: {{ scoreRight }}</span>
      </div>
      <div class="buttons">
        <q-btn dense color="primary" @click="resetGame">Reset</q-btn>
        <q-btn dense color="secondary" @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</q-btn>
      </div>
    </div>

    <div class="mini-camera" :class="{ error: !!error }">
      <video ref="videoRef" class="mini-video" autoplay muted playsinline></video>
      <canvas ref="miniOverlayRef" class="mini-overlay"></canvas>
      <div v-if="error" class="camera-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

type Pt = { x: number, y: number }

const videoRef = ref<HTMLVideoElement | null>(null)
const miniOverlayRef = ref<HTMLCanvasElement | null>(null)
const gameCanvasRef = ref<HTMLCanvasElement | null>(null)

const { enableCamera, stopCamera, error } = useCamera(videoRef)
const hand = useHandTracking(videoRef, miniOverlayRef, 2)

// Game state
const scoreLeft = ref(0)
const scoreRight = ref(0)
const paused = ref(false)

// Render/physics loop
let rafId: number | null = null
let lastTs = 0

// World
let cw = 0, ch = 0
let paddleH = 0, paddleW = 0
let leftPY = 0, rightPY = 0 // paddle centers
let leftPYFilt = 0, rightPYFilt = 0
let ball: { x: number, y: number, vx: number, vy: number, r: number } = { x: 0, y: 0, vx: 0, vy: 0, r: 0 }

function resizeCanvas() {
  const c = gameCanvasRef.value
  if (!c) return
  const w = Math.floor(window.innerWidth)
  const h = Math.floor(window.innerHeight)
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  cw = c.width
  ch = c.height
  // Sizes
  paddleH = Math.round(ch * 0.18)
  paddleW = Math.max(10, Math.round(Math.min(cw, ch) * 0.015))
  ball.r = Math.max(8, Math.round(Math.min(cw, ch) * 0.012))
}

function resetBall(servingRight = true) {
  ball.x = cw / 2
  ball.y = ch / 2
  const speed = Math.max(160, Math.min(cw, ch) * 0.35)
  const angle = (Math.random() * 0.6 - 0.3) // -~17°..+17° from horizontal
  const dir = servingRight ? 1 : -1
  ball.vx = dir * speed * Math.cos(angle)
  ball.vy = speed * Math.sin(angle)
}

function resetGame() {
  scoreLeft.value = 0
  scoreRight.value = 0
  leftPY = ch / 2
  rightPY = ch / 2
  leftPYFilt = leftPY
  rightPYFilt = rightPY
  resetBall(Math.random() < 0.5)
}

function togglePause() {
  paused.value = !paused.value
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)) }

function updatePaddlesFromHands() {
  const video = videoRef.value
  const hands = hand.landmarks.value
  if (!video || !hands) return
  // Map each hand to canvas space. Use landmark 9 (Middle MCP) as a robust center.
  const mapped: Pt[] = []
  for (const h of hands) {
    if (!h || h.length < 10) continue
    const hx = h[9].x * video.videoWidth
    const hy = h[9].y * video.videoHeight
    // Normalize then map to canvas
    const nx = hx / Math.max(1, video.videoWidth)
    const ny = hy / Math.max(1, video.videoHeight)
    mapped.push({ x: nx * cw, y: ny * ch })
  }
  // Assign closest to left/right by x
  if (mapped.length === 1) {
    const m = mapped[0]
    if (m.x < cw / 2) {
      leftPY = m.y
      // Right becomes simple AI following ball slowly
      const aiSpeed = Math.max(120, ch * 0.45) / 60
      rightPY += clamp(ball.y - rightPY, -aiSpeed, aiSpeed)
    } else {
      rightPY = m.y
      const aiSpeed = Math.max(120, ch * 0.45) / 60
      leftPY += clamp(ball.y - leftPY, -aiSpeed, aiSpeed)
    }
  } else if (mapped.length >= 2) {
    // Choose left-most and right-most
    mapped.sort((a, b) => a.x - b.x)
    leftPY = mapped[0].y
    rightPY = mapped[mapped.length - 1].y
  } else {
    // No hands: gentle AI on both to keep the ball in play a bit
    const aiSpeed = Math.max(80, ch * 0.35) / 60
    leftPY += clamp(ball.y - leftPY, -aiSpeed, aiSpeed)
    rightPY += clamp(ball.y - rightPY, -aiSpeed, aiSpeed)
  }
  // Smooth paddles to reduce jitter
  const alpha = 0.35
  leftPYFilt += alpha * (clamp(leftPY, paddleH / 2, ch - paddleH / 2) - leftPYFilt)
  rightPYFilt += alpha * (clamp(rightPY, paddleH / 2, ch - paddleH / 2) - rightPYFilt)
}

function step(dt: number) {
  if (paused.value) return
  updatePaddlesFromHands()
  // Move ball
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  // Wall bounce
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) }
  if (ball.y + ball.r > ch) { ball.y = ch - ball.r; ball.vy = -Math.abs(ball.vy) }
  // Paddle collisions
  const lpX = Math.round(cw * 0.06) + paddleW / 2
  const rpX = Math.round(cw * (1 - 0.06)) - paddleW / 2
  // Left paddle collision when ball moving left
  if (ball.vx < 0 && ball.x - ball.r <= lpX + paddleW / 2) {
    const top = leftPYFilt - paddleH / 2
    const bot = leftPYFilt + paddleH / 2
    if (ball.y >= top && ball.y <= bot && ball.x > lpX - paddleW) {
      ball.x = lpX + paddleW / 2 + ball.r
      reflectFromPaddle(leftPYFilt)
    }
  }
  // Right paddle collision when ball moving right
  if (ball.vx > 0 && ball.x + ball.r >= rpX - paddleW / 2) {
    const top = rightPYFilt - paddleH / 2
    const bot = rightPYFilt + paddleH / 2
    if (ball.y >= top && ball.y <= bot && ball.x < rpX + paddleW) {
      ball.x = rpX - paddleW / 2 - ball.r
      reflectFromPaddle(rightPYFilt)
    }
  }
  // Scoring
  if (ball.x + ball.r < 0) {
    scoreRight.value++
    resetBall(true)
  } else if (ball.x - ball.r > cw) {
    scoreLeft.value++
    resetBall(false)
  }
}

function reflectFromPaddle(py: number) {
  // Compute hit offset in [-1, 1]
  const rel = clamp((ball.y - py) / (paddleH / 2), -1, 1)
  const speed = Math.hypot(ball.vx, ball.vy) * 1.05 // slight speed-up
  const maxAngle = Math.PI * 0.35 // ~63 degrees
  const ang = rel * maxAngle
  const dir = Math.sign(-ball.vx) // flip horizontal direction
  ball.vx = dir * speed * Math.cos(ang)
  ball.vy = speed * Math.sin(ang)
}

function draw() {
  const c = gameCanvasRef.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  ctx.clearRect(0, 0, cw, ch)
  // Midline
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.setLineDash([10, 12])
  ctx.beginPath()
  ctx.moveTo(cw / 2, 0)
  ctx.lineTo(cw / 2, ch)
  ctx.stroke()
  ctx.restore()
  // Paddles
  ctx.fillStyle = '#ffffff'
  const lpX = Math.round(cw * 0.06)
  const rpX = Math.round(cw * (1 - 0.06))
  ctx.fillRect(lpX - paddleW / 2, Math.round(leftPYFilt - paddleH / 2), paddleW, paddleH)
  ctx.fillRect(rpX - paddleW / 2, Math.round(rightPYFilt - paddleH / 2), paddleW, paddleH)
  // Ball
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fill()
}

function loop(ts: number) {
  if (!lastTs) lastTs = ts
  const dt = Math.min(0.04, Math.max(0, (ts - lastTs) / 1000))
  lastTs = ts
  step(dt)
  draw()
  rafId = requestAnimationFrame(loop)
}

onMounted(async () => {
  await enableCamera().catch(() => {})
  await hand.initializeHandTracking().catch(() => {})
  await hand.startTracking().catch(() => {})
  resizeCanvas()
  leftPY = ch / 2; rightPY = ch / 2
  leftPYFilt = leftPY; rightPYFilt = rightPY
  resetBall(Math.random() < 0.5)
  window.addEventListener('resize', () => {
    resizeCanvas()
  })
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  hand.stopTracking()
  stopCamera()
})
</script>

<style scoped>
.pong-test {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
}

.screen-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

.hud {
  position: absolute;
  top: 12px; left: 12px;
  z-index: 10;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hud .title { font-size: 20px; font-weight: 700; }
.hud .hint { opacity: 0.8; }
.scores { display: flex; gap: 16px; font-weight: 600; }
.buttons { display: flex; gap: 8px; }

.mini-camera {
  position: absolute;
  bottom: 16px; left: 16px;
  width: 280px; height: 210px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0,0,0,0.35);
  z-index: 10;
}
.mini-video { width: 100%; height: 100%; object-fit: cover; }
.mini-overlay { position: absolute; inset: 0; }
.camera-error { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; }
</style>

