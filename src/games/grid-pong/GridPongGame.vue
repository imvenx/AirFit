<template>
  <div class="grid-pong">
    <canvas ref="screenCanvasRef" class="screen-canvas"></canvas>

    <div class="hud">
      <div class="title">Grid Pong</div>
      <div class="hint">
        Calibrate 4 corners on the camera view, then hit the pixel-ball with your hands. Bigger grid squares for a chunky look.
      </div>
      <div class="controls">
        <q-btn dense color="primary" @click="startCalibration" :disable="useMirrored">Calibrate Corners</q-btn>
        <q-btn dense flat color="white" @click="resetCalibration" :disable="useMirrored">Reset</q-btn>
        <div class="grid-inputs">
          <q-input dense outlined type="number" min="1" max="100" style="width: 88px" v-model.number="gridCols" label="Cols" />
          <q-input dense outlined type="number" min="1" max="100" style="width: 88px" v-model.number="gridRows" label="Rows" />
          <q-input dense outlined type="number" min="2" max="40" style="width: 120px" v-model.number="ballCellRadius" label="Ball cells" />
          <q-toggle v-model="useMirrored" label="Mirror mode" />
        </div>
        <div class="score">Score: {{ score }}</div>
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

// Grid defaults — higher resolution by default
const gridCols = ref(200)
const gridRows = ref(200)
// Ball size in number of grid cells (radius)
const ballCellRadius = ref(12)
// Mirror mode (maps to whole viewport with horizontal flip; ignores calibration)
const useMirrored = ref(false)

// Hand highlight tuning (copied from grid test, slightly simplified)
const sampleDensityFactor = ref(2.0)
const fingerRadiusFactor = ref(0.08)
const jointRadiusFactor = ref(0.06)

// Calibration state (manual only)
const isCalibrating = ref(false)
const nextCornerIndex = ref(0)
const cornerNames = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left']
let srcCorners: Pt[] = [] // in video pixel coords
let Hhomo: number[][] | null = null // homography matrix from video px -> canvas px

// Game state
const score = ref(0)
let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 0 } // r in px
let rafId: number | null = null
let lastTs = 0

function startCalibration() {
  isCalibrating.value = true
  nextCornerIndex.value = 0
  srcCorners = []
  Hhomo = null
  drawMiniOverlay()
  saveSettings()
}

function resetCalibration() {
  isCalibrating.value = false
  nextCornerIndex.value = 0
  srcCorners = []
  Hhomo = null
  drawMiniOverlay()
  saveSettings()
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
  saveSettings()
}

function computeHomographyForCurrentCanvas() {
  const canvas = screenCanvasRef.value
  if (!canvas || srcCorners.length !== 4) { Hhomo = null; return }
  const W = canvas.width
  const Hc = canvas.height
  const dst = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: Hc },
    { x: 0, y: Hc }
  ]
  Hhomo = computeHomography(srcCorners, dst)
  saveSettings()
}

function applyH(p: Pt): Pt | null {
  if (!Hhomo) return null
  const x = p.x, y = p.y
  const w = Hhomo[2][0] * x + Hhomo[2][1] * y + Hhomo[2][2]
  if (Math.abs(w) < 1e-6) return null
  const u = (Hhomo[0][0] * x + Hhomo[0][1] * y + Hhomo[0][2]) / w
  const v = (Hhomo[1][0] * x + Hhomo[1][1] * y + Hhomo[1][2]) / w
  return { x: u, y: v }
}

function drawMiniOverlay() {
  const overlay = miniOverlayRef.value
  const ctx = overlay?.getContext('2d')
  const video = videoRef.value
  if (!overlay || !ctx || !video) return

  const rect = video.getBoundingClientRect()
  if (overlay.width !== Math.floor(rect.width)) overlay.width = Math.floor(rect.width)
  if (overlay.height !== Math.floor(rect.height)) overlay.height = Math.floor(rect.height)

  ctx.clearRect(0, 0, overlay.width, overlay.height)
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
      if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy)
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
  // Ball sizing after resize
  recomputeBallRadius()
}

function recomputeBallRadius() {
  const canvas = screenCanvasRef.value
  if (!canvas) return
  const minCell = Math.min(canvas.width / Math.max(1, gridCols.value), canvas.height / Math.max(1, gridRows.value))
  // Ball radius expressed in cells for consistent pixelated look
  ball.r = Math.max(8, Math.round(minCell * Math.max(2, Math.min(40, ballCellRadius.value))))
}

function clampInt(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v | 0)) }
function clampFloat(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

function computeActiveCells(cols: number, rows: number, cellW: number, cellH: number): Set<string> {
  const active = new Set<string>()
  const video = videoRef.value
  if (!video) return active
  const hands = landmarks.value
  if (!hands || hands.length === 0) return active

  const CONNS: Array<[number, number]> = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ]

  const minCell = Math.min(cellW, cellH)
  const baseRadiusPx = 0.35 * minCell

  const canvasW = cols * cellW
  const canvasH = rows * cellH

  function mapNorm(nx: number, ny: number): Pt {
    const x = (useMirrored.value ? (1 - nx) : nx) * canvasW
    const y = ny * canvasH
    return { x, y }
  }

  for (const lm of hands) {
    const mapped: Array<Pt | null> = new Array(lm.length).fill(null)
    for (let i = 0; i < lm.length; i++) {
      if (useMirrored.value || !Hhomo) {
        mapped[i] = mapNorm(lm[i].x, lm[i].y)
      } else {
        const px = lm[i].x * video.videoWidth
        const py = lm[i].y * video.videoHeight
        mapped[i] = applyH({ x: px, y: py })
      }
    }
    const WRIST = 0, MID_TIP = 12
    const wrist = mapped[WRIST]
    const midTip = mapped[MID_TIP]
    if (!wrist || !midTip) continue
    const Lref = Math.hypot(midTip.x - wrist.x, midTip.y - wrist.y)
    const jointR = clampFloat(Lref * jointRadiusFactor.value, baseRadiusPx * 0.4, baseRadiusPx * 1.5)
    const boneR = clampFloat(Lref * fingerRadiusFactor.value, baseRadiusPx * 0.6, baseRadiusPx * 2.0)
    for (let i = 0; i < mapped.length; i++) {
      const p = mapped[i]
      if (!p) continue
      stampCircleCells(active, p.x, p.y, jointR, cols, rows, cellW, cellH)
    }
    for (const [a, b] of CONNS) {
      const pa = mapped[a]
      const pb = mapped[b]
      if (!pa || !pb) continue
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const L = Math.hypot(dx, dy)
      const samples = clampInt(Math.round((L / minCell) * sampleDensityFactor.value) + 2, 3, 80)
      for (let s = 0; s < samples; s++) {
        const t = s / (samples - 1)
        const cx = pa.x + t * dx
        const cy = pa.y + t * dy
        stampCircleCells(active, cx, cy, boneR, cols, rows, cellW, cellH)
      }
    }
  }
  return active
}

function stampCircleCells(active: Set<string>, cx: number, cy: number, r: number, cols: number, rows: number, cellW: number, cellH: number) {
  const c0 = clampInt(Math.floor((cx - r) / cellW), 0, cols - 1)
  const r0 = clampInt(Math.floor((cy - r) / cellH), 0, rows - 1)
  const c1 = clampInt(Math.floor((cx + r) / cellW), 0, cols - 1)
  const r1 = clampInt(Math.floor((cy + r) / cellH), 0, rows - 1)
  const r2 = r * r
  for (let rix = r0; rix <= r1; rix++) {
    const cyc = (rix + 0.5) * cellH
    for (let cix = c0; cix <= c1; cix++) {
      const cxc = (cix + 0.5) * cellW
      const d2 = (cxc - cx) * (cxc - cx) + (cyc - cy) * (cyc - cy)
      if (d2 <= r2) active.add(`${cix},${rix}`)
    }
  }
}

function stepAndDraw(ts: number) {
  const canvas = screenCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) { rafId = requestAnimationFrame(stepAndDraw); return }
  if (!lastTs) lastTs = ts
  const dt = Math.min(0.04, Math.max(0, (ts - lastTs) / 1000))
  lastTs = ts

  // Physics
  updateBall(dt, canvas)

  // Render grid + hand shadow + pixel-ball
  drawGridScene(ctx, canvas)

  rafId = requestAnimationFrame(stepAndDraw)
}

function updateBall(dt: number, canvas: HTMLCanvasElement) {
  const cols = Math.max(1, gridCols.value)
  const rows = Math.max(1, gridRows.value)
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  if (ball.vx === 0 && ball.vy === 0) {
    // Initialize ball with a gentle speed
    const speed = Math.max(160, Math.min(canvas.width, canvas.height) * 0.35)
    const angle = (Math.random() * 0.9 - 0.45) // tilt a bit
    ball.vx = speed * Math.cos(angle)
    ball.vy = speed * Math.sin(angle)
    ball.x = canvas.width / 2
    ball.y = canvas.height / 2
  }

  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  // Wall collisions
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) }
  if (ball.x + ball.r > canvas.width) { ball.x = canvas.width - ball.r; ball.vx = -Math.abs(ball.vx) }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) }
  if (ball.y + ball.r > canvas.height) { ball.y = canvas.height - ball.r; ball.vy = -Math.abs(ball.vy) }

  // Hand collisions: get active (hand-shadow) cells and ball-occupied cells
  const active = computeActiveCells(cols, rows, cellW, cellH)

  // Ball occupied cells
  const c0 = clampInt(Math.floor((ball.x - ball.r) / cellW), 0, cols - 1)
  const r0 = clampInt(Math.floor((ball.y - ball.r) / cellH), 0, rows - 1)
  const c1 = clampInt(Math.floor((ball.x + ball.r) / cellW), 0, cols - 1)
  const r1 = clampInt(Math.floor((ball.y + ball.r) / cellH), 0, rows - 1)

  const hitCenters: Pt[] = []
  for (let rix = r0; rix <= r1; rix++) {
    const cyc = (rix + 0.5) * cellH
    for (let cix = c0; cix <= c1; cix++) {
      const cxc = (cix + 0.5) * cellW
      const d2 = (cxc - ball.x) ** 2 + (cyc - ball.y) ** 2
      if (d2 <= ball.r * ball.r) {
        if (active.has(`${cix},${rix}`)) {
          hitCenters.push({ x: cxc, y: cyc })
        }
      }
    }
  }

  if (hitCenters.length > 0) {
    // Compute average collision normal from hit cells towards ball center
    let ax = 0, ay = 0
    for (const p of hitCenters) { ax += (ball.x - p.x); ay += (ball.y - p.y) }
    ax /= hitCenters.length; ay /= hitCenters.length
    const len = Math.hypot(ax, ay) || 1
    const nx = ax / len, ny = ay / len
    const speed = Math.hypot(ball.vx, ball.vy) * 1.03 // slight acceleration on hit
    // Reflect velocity along normal (simple push-away)
    ball.vx = nx * speed
    ball.vy = ny * speed
    score.value += 1
  }
}

function drawGridScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const cols = Math.max(1, gridCols.value)
  const rows = Math.max(1, gridRows.value)
  const cellW = canvas.width / cols
  const cellH = canvas.height / rows

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw grid lines
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = Math.max(1, Math.floor(Math.min(cellW, cellH) * 0.06))
  for (let c = 1; c < cols; c++) {
    const x = Math.round(c * cellW)
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let r = 1; r < rows; r++) {
    const y = Math.round(r * cellH)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }
  ctx.restore()

  // Hand "shadow" cells
  const active = computeActiveCells(cols, rows, cellW, cellH)
  if (active.size > 0) {
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    for (const key of active) {
      const [cStr, rStr] = key.split(',')
      const c = parseInt(cStr, 10)
      const r = parseInt(rStr, 10)
      ctx.fillRect(c * cellW, r * cellH, cellW, cellH)
    }
    ctx.restore()
  }

  // Pixelated ball: fill the grid cells overlapping its circle
  ctx.save()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.85)'
  const c0 = clampInt(Math.floor((ball.x - ball.r) / cellW), 0, cols - 1)
  const r0 = clampInt(Math.floor((ball.y - ball.r) / cellH), 0, rows - 1)
  const c1 = clampInt(Math.floor((ball.x + ball.r) / cellW), 0, cols - 1)
  const r1 = clampInt(Math.floor((ball.y + ball.r) / cellH), 0, rows - 1)
  for (let rix = r0; rix <= r1; rix++) {
    const cyc = (rix + 0.5) * cellH
    for (let cix = c0; cix <= c1; cix++) {
      const cxc = (cix + 0.5) * cellW
      const d2 = (cxc - ball.x) ** 2 + (cyc - ball.y) ** 2
      if (d2 <= ball.r * ball.r) {
        ctx.fillRect(cix * cellW, rix * cellH, cellW, cellH)
      }
    }
  }
  ctx.restore()
}

// ---- Math helpers for homography ----
function computeHomography(src: Pt[], dst: Pt[]): number[][] | null {
  if (src.length !== 4 || dst.length !== 4) return null
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
  const h = solveLinearSystem(A, b)
  if (!h) return null
  return [ [h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1] ]
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
  // Load any persisted settings (corners/grid/ball size) and recompute H
  loadPersistedSettings()

  window.addEventListener('resize', () => {
    resizeScreenCanvas()
    drawMiniOverlay()
  })

  rafId = requestAnimationFrame(stepAndDraw)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  stopTracking()
  stopCamera()
})

// Redraw more frequently when landmarks change to keep shadow responsive
watch(landmarks, () => {
  const canvas = screenCanvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  drawGridScene(ctx, canvas)
})

// Keep ball size updated when grid or ball cell radius changes
watch([gridCols, gridRows, ballCellRadius], () => {
  recomputeBallRadius()
  saveSettings()
})
watch(useMirrored, () => {
  saveSettings()
})

// ---- Persistence (localStorage) ----
const STORAGE_KEY = 'gridPongSettings_v1'

function saveSettings() {
  try {
    const payload = {
      srcCorners,
      gridCols: gridCols.value,
      gridRows: gridRows.value,
      ballCellRadius: ballCellRadius.value,
      useMirrored: useMirrored.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    // ignore
  }
}

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.srcCorners) && parsed.srcCorners.length === 4) {
      srcCorners = parsed.srcCorners.map((p: any) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }))
      isCalibrating.value = false
      nextCornerIndex.value = 4
      computeHomographyForCurrentCanvas()
      drawMiniOverlay()
    }
    if (typeof parsed.gridCols === 'number') gridCols.value = parsed.gridCols
    if (typeof parsed.gridRows === 'number') gridRows.value = parsed.gridRows
    if (typeof parsed.ballCellRadius === 'number') ballCellRadius.value = parsed.ballCellRadius
    if (typeof parsed.useMirrored === 'boolean') useMirrored.value = parsed.useMirrored
  } catch (e) {
    // ignore
  }
}
</script>

<style scoped>
.grid-pong {
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
.title { font-size: 20px; font-weight: 700; }
.hint { opacity: 0.85; margin: 4px 0 8px; max-width: 720px; }
.controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.grid-inputs { display: flex; gap: 8px; }
.score { font-weight: 700; margin-left: 4px; }

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
.calib-instructions { position: absolute; bottom: 6px; left: 6px; color: #fff; background: rgba(0,0,0,0.45); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
