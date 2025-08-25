<template>
  <div class="hdmi-grid-test">
    <canvas ref="screenCanvasRef" class="screen-canvas"></canvas>

    <div class="hud">
      <div class="title">HDMI Grid Test</div>
      <div class="hint">
        Calibrate 4 corners on the camera view, then move your hand to illuminate cells.
      </div>
      <div class="buttons">
        <q-btn dense color="primary" @click="startCalibration">Calibrate Corners</q-btn>
        <q-btn dense flat color="white" @click="resetCalibration">Reset</q-btn>
      </div>
    </div>

    <div class="mini-camera" :class="{ error: !!error }">
      <video ref="videoRef" class="mini-video" autoplay muted playsinline></video>
      <canvas ref="miniOverlayRef" class="mini-overlay" @click="onMiniOverlayClick"></canvas>
      <div v-if="error" class="camera-error">{{ error }}</div>
      <div v-else class="calib-instructions" v-if="isCalibrating">
        Click corners: {{ cornerNames[nextCornerIndex] }} ({{ nextCornerIndex+1 }}/4)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

type Pt = { x: number, y: number }

const videoRef = ref<HTMLVideoElement | null>(null)
const screenCanvasRef = ref<HTMLCanvasElement | null>(null)
const miniOverlayRef = ref<HTMLCanvasElement | null>(null)

const { enableCamera, stopCamera, error } = useCamera(videoRef)
const { initializeHandTracking, startTracking, stopTracking, landmarks } = useHandTracking(videoRef, miniOverlayRef, 2)

// Grid settings
const GRID_COLS = 6
const GRID_ROWS = 4
let activeCell: { c: number, r: number } | null = null

// Calibration state
const isCalibrating = ref(false)
const nextCornerIndex = ref(0)
const cornerNames = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left']
let srcCorners: Pt[] = [] // in video pixel coords
let H: number[][] | null = null // homography matrix from video px -> canvas px

function startCalibration() {
  isCalibrating.value = true
  nextCornerIndex.value = 0
  srcCorners = []
  H = null
  drawMiniOverlay()
}

function resetCalibration() {
  isCalibrating.value = false
  nextCornerIndex.value = 0
  srcCorners = []
  H = null
  drawMiniOverlay()
}

function onMiniOverlayClick(e: MouseEvent) {
  if (!isCalibrating.value) return
  const video = videoRef.value
  const overlay = miniOverlayRef.value
  if (!video || !overlay) return
  const rect = overlay.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  // Map click from overlay size to video pixel coordinates
  const vx = (cx / Math.max(1, rect.width)) * Math.max(1, video.videoWidth)
  const vy = (cy / Math.max(1, rect.height)) * Math.max(1, video.videoHeight)
  srcCorners.push({ x: vx, y: vy })
  nextCornerIndex.value = srcCorners.length
  if (srcCorners.length === 4) {
    isCalibrating.value = false
    computeHomographyForCurrentCanvas()
  }
  drawMiniOverlay()
}

function computeHomographyForCurrentCanvas() {
  const canvas = screenCanvasRef.value
  if (!canvas || srcCorners.length !== 4) { H = null; return }
  const W = canvas.width
  const Hh = canvas.height
  const dst = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: Hh },
    { x: 0, y: Hh }
  ]
  H = computeHomography(srcCorners, dst)
}

function applyH(p: Pt): Pt | null {
  if (!H) return null
  const x = p.x, y = p.y
  const w = H[2][0] * x + H[2][1] * y + H[2][2]
  if (Math.abs(w) < 1e-6) return null
  const u = (H[0][0] * x + H[0][1] * y + H[0][2]) / w
  const v = (H[1][0] * x + H[1][1] * y + H[1][2]) / w
  return { x: u, y: v }
}

function drawMiniOverlay() {
  const overlay = miniOverlayRef.value
  const ctx = overlay?.getContext('2d')
  const video = videoRef.value
  if (!overlay || !ctx || !video) return

  // Resize overlay to match video element on screen
  const rect = video.getBoundingClientRect();
  if (overlay.width !== Math.floor(rect.width)) overlay.width = Math.floor(rect.width)
  if (overlay.height !== Math.floor(rect.height)) overlay.height = Math.floor(rect.height)

  ctx.clearRect(0, 0, overlay.width, overlay.height)

  // Draw clicked points (project from video px to overlay px)
  ctx.save()
  ctx.lineWidth = 2
  for (let i = 0; i < srcCorners.length; i++) {
    const p = srcCorners[i]
    const ox = (p.x / Math.max(1, video.videoWidth)) * overlay.width
    const oy = (p.y / Math.max(1, video.videoHeight)) * overlay.height
    ctx.fillStyle = '#00FFAA'
    ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '12px sans-serif'
    ctx.fillText(String(i + 1), ox + 8, oy - 8)
  }
  if (srcCorners.length >= 2) {
    ctx.strokeStyle = 'rgba(0,255,170,0.8)'
    ctx.beginPath()
    for (let i = 0; i < srcCorners.length; i++) {
      const p = srcCorners[i]
      const ox = (p.x / Math.max(1, video.videoWidth)) * overlay.width
      const oy = (p.y / Math.max(1, video.videoHeight)) * overlay.height
      if (i === 0) {
        ctx.moveTo(ox, oy)
      } else {
        ctx.lineTo(ox, oy)
      }
    }
    ctx.stroke()
  }
  ctx.restore()
}

function resizeScreenCanvas() {
  const canvas = screenCanvasRef.value
  if (!canvas) return
  const w = Math.floor(window.innerWidth)
  const h = Math.floor(window.innerHeight)
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  if (srcCorners.length === 4) computeHomographyForCurrentCanvas()
}

function drawGridAndHighlight() {
  const canvas = screenCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw grid lines
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  const cellW = canvas.width / GRID_COLS
  const cellH = canvas.height / GRID_ROWS
  for (let c = 1; c < GRID_COLS; c++) {
    const x = Math.round(c * cellW)
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let r = 1; r < GRID_ROWS; r++) {
    const y = Math.round(r * cellH)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }

  // Highlight active cell
  if (activeCell) {
    const x = activeCell.c * cellW
    const y = activeCell.r * cellH
    ctx.fillStyle = 'rgba(255, 215, 0, 0.4)'
    ctx.fillRect(x, y, cellW, cellH)
  }
  ctx.restore()
}

// Compute homography from 4 point pairs
function computeHomography(src: Pt[], dst: Pt[]): number[][] | null {
  if (src.length !== 4 || dst.length !== 4) return null
  // Unknowns: h11 h12 h13 h21 h22 h23 h31 h32 (h33=1)
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const x = src[i].x, y = src[i].y
    const u = dst[i].x, v = dst[i].y
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  const h = solveLinearSystem(A, b) // length 8
  if (!h) return null
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ]
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length
  if (n === 0) return null
  const m = A[0].length
  const M = A.map((row, i) => [...row, b[i]])
  const rows = n, cols = m + 1
  let r = 0
  for (let c = 0; c < m && r < rows; c++) {
    let piv = r
    for (let i = r + 1; i < rows; i++) if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i
    if (Math.abs(M[piv][c]) < 1e-12) continue
    if (piv !== r) { const tmp = M[r]; M[r] = M[piv]; M[piv] = tmp }
    const div = M[r][c]
    for (let j = c; j < cols; j++) M[r][j] /= div
    for (let i = 0; i < rows; i++) {
      if (i === r) continue
      const factor = M[i][c]
      if (factor === 0) continue
      for (let j = c; j < cols; j++) M[i][j] -= factor * M[r][j]
    }
    r++
  }
  const x = new Array(m).fill(0)
  for (let i = 0; i < m; i++) x[i] = M[i][cols - 1]
  return x
}

onMounted(async () => {
  await enableCamera().catch(() => {})
  resizeScreenCanvas()
  setTimeout(drawMiniOverlay, 50)
  await initializeHandTracking().catch(() => {})
  await startTracking().catch(() => {})
  window.addEventListener('resize', () => {
    resizeScreenCanvas()
    drawMiniOverlay()
    drawGridAndHighlight()
  })
})

onUnmounted(() => {
  stopTracking()
  stopCamera()
})

watch(landmarks, () => {
  const video = videoRef.value
  const canvas = screenCanvasRef.value
  if (!video || !canvas) { drawGridAndHighlight(); return }
  const hands = landmarks.value
  if (!hands || hands.length === 0) { activeCell = null; drawGridAndHighlight(); return }
  const lm = hands[0]
  const ptCam = { x: lm[8].x * video.videoWidth, y: lm[8].y * video.videoHeight }
  const mapped = applyH(ptCam)
  if (!mapped) { activeCell = null; drawGridAndHighlight(); return }
  // Compute cell index
  const c = Math.floor((mapped.x / Math.max(1, canvas.width)) * GRID_COLS)
  const r = Math.floor((mapped.y / Math.max(1, canvas.height)) * GRID_ROWS)
  if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) {
    activeCell = null
  } else {
    activeCell = { c, r }
  }
  drawGridAndHighlight()
})
</script>

<style scoped>
.hdmi-grid-test {
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
}
.hud .title { font-size: 20px; font-weight: 700; }
.hud .hint { opacity: 0.8; margin: 4px 0 8px; }
.buttons { display: flex; gap: 8px; }

.mini-camera {
  position: absolute;
  bottom: 16px; left: 16px;
  width: 320px; height: 240px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0,0,0,0.35);
  z-index: 10;
}
.mini-video { width: 100%; height: 100%; object-fit: cover; }
.mini-overlay { position: absolute; inset: 0; }
.calib-instructions {
  position: absolute;
  bottom: 6px; left: 6px;
  color: white;
  background: rgba(0,0,0,0.4);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
</style>

