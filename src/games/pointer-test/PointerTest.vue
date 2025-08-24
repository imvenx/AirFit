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
import { soundPlayer } from 'src/scripts/Audio/SoundPlayer'

const videoRef = ref<HTMLVideoElement | null>(null)
const screenCanvasRef = ref<HTMLCanvasElement | null>(null)
const miniCanvasRef = ref<HTMLCanvasElement | null>(null)
// Auto-calibration for uncalibrated mode (per-hand)
const autoMinLen: Array<number | null> = [null, null]
const autoMaxLen: Array<number | null> = [null, null]
const lastDir: Array<{ x: number, y: number }> = [
  { x: 1, y: 0 },
  { x: 1, y: 0 }
]
// Output smoothing (per-hand)
const filteredPos: Array<{ x: number, y: number } | null> = [null, null]
// Pinch-to-shoot state
type Shot = { x: number, y: number, t: number, hand: number }
let shots: Shot[] = []
const wasFlexed: boolean[] = [false, false]
const PINCH_LIFETIME = 1500 // ms
// Hysteresis thresholds (relative to index base->tip length)
const FLEX_ON_FACTOR = 0.28
const FLEX_OFF_FACTOR = 0.18
const SMOOTH_ALPHA = 0.25 // 0..1; higher = snappier
const DIR_BETA = 0.3 // smoothing for direction
// Store calibration as direction vectors + apparent finger length (mirrored-corrected)
const calibTopLeft = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibTopRight = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibBottomLeft = ref<{ dx: number, dy: number, len: number } | null>(null)
const calibBottomRight = ref<{ dx: number, dy: number, len: number } | null>(null)
const { enableCamera, stopCamera, error } = useCamera(videoRef)
const { initializeHandTracking, startTracking, stopTracking, landmarks } = useHandTracking(videoRef, screenCanvasRef, 2)

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

  // Draw and decay existing shots regardless of hand presence
  const now = performance.now()
  shots = shots.filter(s => now - s.t < PINCH_LIFETIME)
  for (const s of shots) {
    const age = (now - s.t) / PINCH_LIFETIME
    const alpha = 1 - Math.min(1, Math.max(0, age))
    const r = 10 - 6 * age
    ctx.save()
    ctx.fillStyle = s.hand === 0 ? `rgba(255, 215, 0, ${alpha})` : `rgba(0, 200, 255, ${alpha})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, Math.max(3, r), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (!hands || hands.length === 0) return

  for (let i = 0; i < Math.min(hands.length, 2); i++) {
    let drawX = 0
    let drawY = 0
    const { tip, dir, len, valid } = getTipAndDirection(i)
    if (!valid) continue

    if (calibTopLeft.value && calibTopRight.value && calibBottomLeft.value && calibBottomRight.value) {
      const tl = calibTopLeft.value
      const tr = calibTopRight.value
      const bl = calibBottomLeft.value
      const br = calibBottomRight.value

      const leftX = (tl.dx + bl.dx) * 0.5
      const rightX = (tr.dx + br.dx) * 0.5
      const topY = (tl.dy + tr.dy) * 0.5
      const bottomY = (bl.dy + br.dy) * 0.5

      let sx_dir = 0.5
      let sy_dir = 0.5
      const denomX = (rightX - leftX)
      const denomY = (bottomY - topY)
      if (Math.abs(denomX) > 1e-6) sx_dir = (dir.x - leftX) / denomX
      if (Math.abs(denomY) > 1e-6) sy_dir = (dir.y - topY) / denomY

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
      const tl = calibTopLeft.value
      const br = calibBottomRight.value
      const denomX = (br.dx - tl.dx)
      const denomY = (br.dy - tl.dy)
      const denomL = (br.len - tl.len)
      let sx_dir = 0.5
      let sy_dir = 0.5
      if (Math.abs(denomX) > 1e-6) sx_dir = (dir.x - tl.dx) / denomX
      if (Math.abs(denomY) > 1e-6) sy_dir = (dir.y - tl.dy) / denomY
      let s_len = 0.5
      if (Math.abs(denomL) > 1e-6) s_len = (len - tl.len) / denomL
      const wLen = 0.5
      let sx = clamp((1 - wLen) * sx_dir + wLen * s_len, 0, 1)
      let sy = clamp((1 - wLen) * sy_dir + wLen * s_len, 0, 1)
      drawX = sx * canvas.width
      drawY = sy * canvas.height
    } else if (calibTopLeft.value && !calibBottomRight.value) {
      drawX = 0
      drawY = 0
    } else if (!calibTopLeft.value && calibBottomRight.value) {
      drawX = canvas.width
      drawY = canvas.height
    } else {
      if (autoMinLen[i] === null) autoMinLen[i] = len
      if (autoMaxLen[i] === null) autoMaxLen[i] = len
      autoMinLen[i] = Math.min(autoMinLen[i] as number, len)
      autoMaxLen[i] = Math.max(autoMaxLen[i] as number, len)
      const range = Math.max(1e-3, (autoMaxLen[i] as number) - (autoMinLen[i] as number))
      autoMinLen[i] = (autoMinLen[i] as number) + 0.001 * range
      autoMaxLen[i] = (autoMaxLen[i] as number) - 0.001 * range

      const m = clamp((len - (autoMinLen[i] as number)) / Math.max(1e-6, (autoMaxLen[i] as number) - (autoMinLen[i] as number)), 0, 1)

      let lx = (1 - DIR_BETA) * lastDir[i].x + DIR_BETA * dir.x
      let ly = (1 - DIR_BETA) * lastDir[i].y + DIR_BETA * dir.y
      const lnorm = Math.hypot(lx, ly) || 1
      lastDir[i] = { x: lx / lnorm, y: ly / lnorm }
      const dirUse = lastDir[i]

      const center = { x: canvas.width * 0.5, y: canvas.height * 0.5 }
      const edge = intersectRayWithRect(center, dirUse, canvas.width, canvas.height)
      if (!edge) continue
      drawX = center.x + m * (edge.x - center.x)
      drawY = center.y + m * (edge.y - center.y)
    }

    if (!filteredPos[i]) {
      filteredPos[i] = { x: drawX, y: drawY }
    } else {
      filteredPos[i]!.x += SMOOTH_ALPHA * (drawX - filteredPos[i]!.x)
      filteredPos[i]!.y += SMOOTH_ALPHA * (drawY - filteredPos[i]!.y)
    }
    const fx = clamp(filteredPos[i]!.x, 0, canvas.width)
    const fy = clamp(filteredPos[i]!.y, 0, canvas.height)

    ctx.save()
    ctx.fillStyle = i === 0 ? 'rgba(255, 215, 0, 0.95)' : 'rgba(0, 200, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(fx, fy, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Thumb-flex shoot: when thumb middle (3) is above thumb tip (4)
    const isFlexed = isThumbFlexed(i, len, wasFlexed[i])
    if (isFlexed && !wasFlexed[i]) {
      shots.push({ x: fx, y: fy, t: now, hand: i })
      if (shots.length > 100) shots.shift()
      // Play shooting sound with slight pan based on screen position
      const pan = (fx / canvas.width) * 2 - 1
      soundPlayer.play({
        type: 'square',
        frequencyStart: 1200,
        frequencyEnd: 700,
        frequencyDuration: 0.08,
        gainStart: 0.2,
        gainEnd: 0.0001,
        gainDuration: 0.12,
        duration: 0.12,
        pan
      })
    }
    wasFlexed[i] = isFlexed
  }
}

function getTipAndDirection(handIndex: number = 0) {
  const canvas = screenCanvasRef.value
  const hands = landmarks.value
  if (!canvas || !hands || hands.length === 0 || !hands[handIndex]) return { tip: { x: 0, y: 0 }, dir: { x: 0, y: 0 }, len: 0, valid: false }
  const lm = hands[handIndex]
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

function isThumbFlexed(handIndex: number, indexLen: number, prev: boolean): boolean {
  const canvas = screenCanvasRef.value
  const hands = landmarks.value
  if (!canvas || !hands || !hands[handIndex]) return false
  const lm = hands[handIndex]
  const tip = { x: lm[4].x * canvas.width, y: lm[4].y * canvas.height } // thumb tip
  const mid = { x: lm[3].x * canvas.width, y: lm[3].y * canvas.height } // thumb middle (IP)
  // In canvas coords, smaller y is visually higher (up)
  const onThresh = tip.y + FLEX_ON_FACTOR * indexLen
  const offThresh = tip.y + FLEX_OFF_FACTOR * indexLen
  if (!prev) {
    return mid.y < onThresh
  } else {
    return mid.y < offThresh
  }
}

function drawMiniHandOverlay() {
  const canvas = miniCanvasRef.value
  const ctx = canvas?.getContext('2d')
  const hands = landmarks.value
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!hands || hands.length === 0) return

  for (let i = 0; i < Math.min(hands.length, 2); i++) {
    const lm = hands[i]
    const base = { x: lm[5].x * canvas.width, y: lm[5].y * canvas.height } // index base (MCP)
    const tip = { x: lm[8].x * canvas.width, y: lm[8].y * canvas.height }   // index tip
    const thumb = { x: lm[4].x * canvas.width, y: lm[4].y * canvas.height } // thumb tip
    const thumbMid = { x: lm[3].x * canvas.width, y: lm[3].y * canvas.height } // thumb middle (IP)

    ctx.strokeStyle = i === 0 ? 'rgba(255, 215, 0, 0.9)' : 'rgba(0, 200, 255, 0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(base.x, base.y)
    ctx.lineTo(tip.x, tip.y)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath(); ctx.arc(base.x, base.y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = i === 0 ? 'rgba(255, 215, 0, 1)' : 'rgba(0, 200, 255, 1)'
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2); ctx.fill()
    // Draw thumb tip as well (pink)
    ctx.fillStyle = 'rgba(255, 105, 180, 1)'
    ctx.beginPath(); ctx.arc(thumb.x, thumb.y, 4, 0, Math.PI * 2); ctx.fill()
    // Draw thumb middle (orange)
    ctx.fillStyle = 'rgba(255, 165, 0, 1)'
    ctx.beginPath(); ctx.arc(thumbMid.x, thumbMid.y, 4, 0, Math.PI * 2); ctx.fill()
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

function calibrateTopLeft() {
  const idx = getActiveHandIndex()
  const { dir, len, valid } = getTipAndDirection(idx)
  if (valid) calibTopLeft.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateTopRight() {
  const idx = getActiveHandIndex()
  const { dir, len, valid } = getTipAndDirection(idx)
  if (valid) calibTopRight.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateBottomLeft() {
  const idx = getActiveHandIndex()
  const { dir, len, valid } = getTipAndDirection(idx)
  if (valid) calibBottomLeft.value = { dx: dir.x, dy: dir.y, len }
}

function calibrateBottomRight() {
  const idx = getActiveHandIndex()
  const { dir, len, valid } = getTipAndDirection(idx)
  if (valid) calibBottomRight.value = { dx: dir.x, dy: dir.y, len }
}

function resetCalibration() {
  calibTopLeft.value = null
  calibTopRight.value = null
  calibBottomLeft.value = null
  calibBottomRight.value = null
}

function getActiveHandIndex(): number {
  let best = 0
  let bestLen = -1
  for (let i = 0; i < Math.min(2, landmarks.value.length); i++) {
    const r = getTipAndDirection(i)
    if (r.valid && r.len > bestLen) {
      bestLen = r.len
      best = i
    }
  }
  return best
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
