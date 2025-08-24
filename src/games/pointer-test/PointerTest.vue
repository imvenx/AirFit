<template>
  <div class="pointer-test">
    <canvas ref="screenCanvasRef" class="screen-overlay"></canvas>

    <div class="content">
      <div class="icon">🖱️</div>
      <h2>Pointer Test</h2>
      <p>Point at the screen — we\'ll estimate a dot.</p>
    </div>

    <!-- Debug camera (mirrored). No drawings on it. -->
    <div class="mini-camera" :class="{ error: !!error }">
      <video ref="videoRef" class="mini-video" autoplay muted playsinline></video>
      <canvas ref="miniCanvasRef" class="mini-overlay"></canvas>
      <div v-if="error" class="camera-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

const videoRef = ref<HTMLVideoElement | null>(null)
const screenCanvasRef = ref<HTMLCanvasElement | null>(null)
const miniCanvasRef = ref<HTMLCanvasElement | null>(null)
const { enableCamera, stopCamera, error } = useCamera(videoRef)
const { initializeHandTracking, startTracking, stopTracking, landmarks } = useHandTracking(videoRef, screenCanvasRef, 1)

function resizeScreenCanvas() {
  const canvas = screenCanvasRef.value
  if (!canvas) return
  const w = Math.floor(window.innerWidth)
  const h = Math.floor(window.innerHeight)
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
}

function resizeMiniCanvasToVideo() {
  const video = videoRef.value
  const canvas = miniCanvasRef.value
  if (!video || !canvas) return
  const rect = video.getBoundingClientRect()
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
}

function drawDot() {
  const canvas = screenCanvasRef.value
  const ctx = canvas?.getContext('2d')
  const hands = landmarks.value
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!hands || hands.length === 0) return

  const lm = hands[0]
  // Use index direction (DIP -> TIP). Mirror horizontally to match UI.
  const tip = { x: lm[8].x * canvas.width, y: lm[8].y * canvas.height }
  const dip = { x: lm[7].x * canvas.width, y: lm[7].y * canvas.height }
  let dx = tip.x - dip.x
  let dy = tip.y - dip.y
  // Mirror correction: invert X so that mirrored preview intuition matches
  dx = -dx

  const len = Math.hypot(dx, dy)
  if (len < 1e-2) return

  const target = intersectRayWithRect(tip, { x: dx, y: dy }, canvas.width, canvas.height)
  if (!target) return

  // Draw just a dot/circle at the estimated target (no line)
  ctx.save()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.95)'
  ctx.beginPath()
  ctx.arc(target.x, target.y, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function intersectRayWithRect(origin: { x: number, y: number }, dir: { x: number, y: number }, w: number, h: number) {
  const candidates: Array<{ t: number, x: number, y: number }> = []
  if (Math.abs(dir.x) > 1e-6) {
    let t = (0 - origin.x) / dir.x
    let y = origin.y + t * dir.y
    if (t > 0 && y >= 0 && y <= h) candidates.push({ t, x: 0, y })
    t = (w - origin.x) / dir.x
    y = origin.y + t * dir.y
    if (t > 0 && y >= 0 && y <= h) candidates.push({ t, x: w, y })
  }
  if (Math.abs(dir.y) > 1e-6) {
    let t = (0 - origin.y) / dir.y
    let x = origin.x + t * dir.x
    if (t > 0 && x >= 0 && x <= w) candidates.push({ t, x, y: 0 })
    t = (h - origin.y) / dir.y
    x = origin.x + t * dir.x
    if (t > 0 && x >= 0 && x <= w) candidates.push({ t, x, y: h })
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.t - b.t)
  return { x: candidates[0].x, y: candidates[0].y }
}

function drawMiniHandOverlay() {
  const canvas = miniCanvasRef.value
  const ctx = canvas?.getContext('2d')
  const hands = landmarks.value
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!hands || hands.length === 0) return

  for (const lm of hands) {
    const pts = lm.map(p => ({ x: p.x * canvas.width, y: p.y * canvas.height }))
    const connections: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20]
    ]

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
    ctx.lineWidth = 2
    for (const [a, b] of connections) {
      ctx.beginPath()
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
      ctx.stroke()
    }

    // Highlight index chain
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)'
    ctx.lineWidth = 3
    const indexChain = [5, 6, 7, 8]
    ctx.beginPath()
    ctx.moveTo(pts[indexChain[0]].x, pts[indexChain[0]].y)
    for (let i = 1; i < indexChain.length; i++) {
      ctx.lineTo(pts[indexChain[i]].x, pts[indexChain[i]].y)
    }
    ctx.stroke()

    // Joints
    for (let i = 0; i < pts.length; i++) {
      ctx.beginPath()
      ctx.fillStyle = indexChain.includes(i) ? 'rgba(255, 215, 0, 1)' : 'rgba(0, 255, 255, 0.9)'
      ctx.arc(pts[i].x, pts[i].y, indexChain.includes(i) ? 4 : 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

onMounted(async () => {
  try {
    await enableCamera()
    resizeScreenCanvas()
    resizeMiniCanvasToVideo()
    await initializeHandTracking()
    await startTracking()
  } catch (e) {
    // Error handled by hooks
  }
  window.addEventListener('resize', () => {
    resizeScreenCanvas()
    resizeMiniCanvasToVideo()
  })
})

onUnmounted(() => {
  stopCamera()
  stopTracking()
  window.removeEventListener('resize', resizeScreenCanvas)
})

watch(landmarks, () => {
  resizeScreenCanvas()
  drawDot()
  resizeMiniCanvasToVideo()
  drawMiniHandOverlay()
})
</script>

<style scoped>
.pointer-test {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.screen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.content {
  text-align: center;
}

.icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

h2 {
  margin: 0.25rem 0 0.5rem 0;
}

p {
  opacity: 0.85;
}

.mini-camera {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 240px;
  height: 180px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}

.mini-camera.error {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.mini-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1); /* mirror to match the video */
}

.camera-error {
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
}
</style>
