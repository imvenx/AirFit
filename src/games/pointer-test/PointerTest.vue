<template>
  <div class="pointer-test">
    <canvas ref="screenCanvasRef" class="screen-overlay"></canvas>

    <div class="content">
      <div class="icon">🖱️</div>
      <h2>Pointer Test</h2>
      <p>Point at the screen — we\'ll estimate a dot.</p>
    </div>

    <!-- Calibration controls -->
    <div class="calibration-controls">
      <q-btn dense color="primary" class="calib-btn" @click="calibrateTopLeft">Calibrate Top-Left</q-btn>
      <q-btn dense color="primary" class="calib-btn" @click="calibrateTopRight">Calibrate Top-Right</q-btn>
      <q-btn dense color="primary" class="calib-btn" @click="calibrateBottomLeft">Calibrate Bottom-Left</q-btn>
      <q-btn dense color="primary" class="calib-btn" @click="calibrateBottomRight">Calibrate Bottom-Right</q-btn>
      <q-btn dense flat color="white" class="calib-btn" @click="resetCalibration">Reset</q-btn>
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
// Auto-calibration for uncalibrated mode
const autoMinLen = ref<number | null>(null)
const autoMaxLen = ref<number | null>(null)
const lastDir = ref<{ x: number, y: number }>({ x: 1, y: 0 })
// Output smoothing
const filteredPos = ref<{ x: number, y: number } | null>(null)
const SMOOTH_ALPHA = 0.25 // 0..1; higher = snappier
const DIR_BETA = 0.3 // smoothing for direction
// Store calibration as direction vectors + apparent finger length (mirrored-corrected)
const calibTopLeft = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibTopRight = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibBottomLeft = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibBottomRight = ref<{ dx: number, dy: number, len: number } | null>(null)
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

  let drawX = 0
  let drawY = 0

  const { tip, dir, len, valid } = getTipAndDirection()
  if (!valid) return

  if (calibTopLeft.value && calibTopRight.value && calibBottomLeft.value && calibBottomRight.value) {
    // 4-corner calibration: derive per-axis boundaries from corners
    const tl = calibTopLeft.value
    const tr = calibTopRight.value
    const bl = calibBottomLeft.value
    const br = calibBottomRight.value

    const leftX = (tl.dx + bl.dx) * 0.5
    const rightX = (tr.dx + br.dx) * 0.5
    const topY = (tl.dy + tr.dy) * 0.5
    const bottomY = (bl.dy + br.dy) * 0.5

    // Direction-based normalized pos
    let sx_dir = 0.5
    let sy_dir = 0.5
    const denomX = (rightX - leftX)
    const denomY = (bottomY - topY)
    if (Math.abs(denomX) > 1e-6) sx_dir = (dir.x - leftX) / denomX
    if (Math.abs(denomY) > 1e-6) sy_dir = (dir.y - topY) / denomY

    // Length-based boundaries (average per edge)
    const leftLen = (tl.len + bl.len) * 0.5
    const rightLen = (tr.len + br.len) * 0.5
    const topLen = (tl.len + tr.len) * 0.5
    const bottomLen = (bl.len + br.len) * 0.5
    let sx_len = 0.5
    let sy_len = 0.5
    const denomLX = (rightLen - leftLen)
    const denomLY = (bottomLen - topLen)
    if (Math.abs(denomLX) > 1e-6) sx_len = (len - leftLen) / denomLX
    if (Math.abs(denomLY) > 1e-6) sy_len = (len - topLen) / denomLY

    const wLen = 0.4
    const sx = clamp((1 - wLen) * sx_dir + wLen * sx_len, 0, 1)
    const sy = clamp((1 - wLen) * sy_dir + wLen * sy_len, 0, 1)
    drawX = sx * canvas.width
    drawY = sy * canvas.height
  } else if (calibTopLeft.value && calibBottomRight.value) {
    // Solve per-axis linear map: s = a * d + b with constraints
    // tl -> 0, br -> 1
    const tl = calibTopLeft.value
    const br = calibBottomRight.value

    const denomX = (br.dx - tl.dx)
    const denomY = (br.dy - tl.dy)
    const denomL = (br.len - tl.len)

    // Direction-based normalized position per axis
    let sx_dir = 0.5
    let sy_dir = 0.5
    if (Math.abs(denomX) > 1e-6) sx_dir = (dir.x - tl.dx) / denomX
    if (Math.abs(denomY) > 1e-6) sy_dir = (dir.y - tl.dy) / denomY

    // Length-based normalized position (single scalar applied to both axes)
    let s_len = 0.5
    if (Math.abs(denomL) > 1e-6) s_len = (len - tl.len) / denomL

    // Blend direction and length for interior mapping
    const wLen = 0.5 // weight for length contribution
    let sx = clamp((1 - wLen) * sx_dir + wLen * s_len, 0, 1)
    let sy = clamp((1 - wLen) * sy_dir + wLen * s_len, 0, 1)
    drawX = sx * canvas.width
    drawY = sy * canvas.height
  } else if (calibTopLeft.value && !calibBottomRight.value) {
    // Only TL calibrated: map current indication to TL immediately
    drawX = 0
    drawY = 0
  } else if (!calibTopLeft.value && calibBottomRight.value) {
    // Only BR calibrated: map current indication to BR immediately
    drawX = canvas.width
    drawY = canvas.height
  } else {
    // No calibration: auto-calibrate based on apparent finger length
    // 1) Track dynamic min/max length
    if (autoMinLen.value === null) autoMinLen.value = len
    if (autoMaxLen.value === null) autoMaxLen.value = len
    autoMinLen.value = Math.min(autoMinLen.value, len)
    autoMaxLen.value = Math.max(autoMaxLen.value, len)
    // Slow relaxation so ranges adapt over time
    const range = Math.max(1e-3, autoMaxLen.value - autoMinLen.value)
    autoMinLen.value += 0.001 * range
    autoMaxLen.value -= 0.001 * range

    // 2) Normalize length to [0,1]
    const m = clamp((len - autoMinLen.value) / Math.max(1e-6, autoMaxLen.value - autoMinLen.value), 0, 1)

    // 3) Use stable direction; if nearly zero length, keep last direction
    // Smooth direction to reduce jitter
    let lx = (1 - DIR_BETA) * lastDir.value.x + DIR_BETA * dir.x
    let ly = (1 - DIR_BETA) * lastDir.value.y + DIR_BETA * dir.y
    const lnorm = Math.hypot(lx, ly) || 1
    lastDir.value = { x: lx / lnorm, y: ly / lnorm }
    const dirUse = lastDir.value

    // 4) From screen center, march toward the edge along dirUse scaled by m
    const center = { x: canvas.width * 0.5, y: canvas.height * 0.5 }
    const edge = intersectRayWithRect(center, dirUse, canvas.width, canvas.height)
    if (!edge) return
    drawX = center.x + m * (edge.x - center.x)
    drawY = center.y + m * (edge.y - center.y)
  }

  // Final smoothing on the dot position
  if (!filteredPos.value) {
    filteredPos.value = { x: drawX, y: drawY }
  } else {
    filteredPos.value.x += SMOOTH_ALPHA * (drawX - filteredPos.value.x)
    filteredPos.value.y += SMOOTH_ALPHA * (drawY - filteredPos.value.y)
  }

  const fx = clamp(filteredPos.value.x, 0, canvas.width)
  const fy = clamp(filteredPos.value.y, 0, canvas.height)

  // Draw just a dot/circle at the position
  ctx.save()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.95)'
  ctx.beginPath()
  ctx.arc(fx, fy, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function getTipAndDirection() {
  const canvas = screenCanvasRef.value
  const hands = landmarks.value
  if (!canvas || !hands || hands.length === 0) return { tip: { x: 0, y: 0 }, dir: { x: 0, y: 0 }, len: 0, valid: false }
  const lm = hands[0]
  // Use index direction (BASE MCP(5) -> TIP(8)). Mirror horizontally to match UI.
  const tip = { x: lm[8].x * canvas.width, y: lm[8].y * canvas.height }
  const base = { x: lm[5].x * canvas.width, y: lm[5].y * canvas.height }
  let dx = tip.x - base.x
  let dy = tip.y - base.y
  dx = -dx // mirror correction for horizontal
  const len = Math.hypot(dx, dy)
  if (len < 1e-2) return { tip, dir: { x: 0, y: 0 }, len: 0, valid: false }
  const invLen = 1 / len
  return { tip, dir: { x: dx * invLen, y: dy * invLen }, len, valid: true }
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

  // Draw only the two points used by the mapping: index BASE MCP (5) and TIP (8)
  const lm = hands[0]
  const base = { x: lm[5].x * canvas.width, y: lm[5].y * canvas.height }
  const tip = { x: lm[8].x * canvas.width, y: lm[8].y * canvas.height }

  // Line between BASE and TIP
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()

  // Points
  ctx.fillStyle = 'rgba(0, 255, 255, 0.95)'
  ctx.beginPath(); ctx.arc(base.x, base.y, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255, 215, 0, 1)'
  ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2); ctx.fill()
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

function calibrateTopLeft() {
  const { dir, len, valid } = getTipAndDirection()
  if (valid) calibTopLeft.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateTopRight() {
  const { dir, len, valid } = getTipAndDirection()
  if (valid) calibTopRight.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateBottomLeft() {
  const { dir, len, valid } = getTipAndDirection()
  if (valid) calibBottomLeft.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateBottomRight() {
  const { dir, len, valid } = getTipAndDirection()
  if (valid) calibBottomRight.value = { dx: dir.x, dy: dir.y, len }
}

function resetCalibration() {
  calibTopLeft.value = null
  calibTopRight.value = null
  calibBottomLeft.value = null
  calibBottomRight.value = null
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
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

.calibration-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1100;
}

.calib-btn {
  backdrop-filter: blur(6px);
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
