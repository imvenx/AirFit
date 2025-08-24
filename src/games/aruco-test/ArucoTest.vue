<template>
  <div class="aruco-test-container">
    <div class="marker-display" v-if="displayMode === 'markers'">
      <canvas ref="markerTL" class="marker top-left"></canvas>
      <canvas ref="markerTR" class="marker top-right"></canvas>
      <canvas ref="markerBL" class="marker bottom-left"></canvas>
      <canvas ref="markerBR" class="marker bottom-right"></canvas>

      <div class="center-info">
        <h2>ArUco Marker Display</h2>
        <p>Point camera at this screen to detect markers</p>
        <q-btn @click="switchToCamera" color="primary" size="lg">
          Switch to Camera View
        </q-btn>
        <q-btn @click="openInNewWindow" color="secondary" size="lg" class="q-ml-md">
          Open in New Window
        </q-btn>
      </div>
    </div>

    <div class="camera-view" v-else>
      <video ref="video" class="camera-feed" autoplay playsinline></video>
      <canvas ref="overlay" class="detection-overlay"></canvas>

      <div class="detection-info">
        <div class="info-panel">
          <h3>Detection Status</h3>
          <div class="marker-status">
            <div :class="['status-item', { detected: detectedMarkers[0] }]">
              TL (ID:0): {{ detectedMarkers[0] ? 'Detected' : 'Not found' }}
            </div>
            <div :class="['status-item', { detected: detectedMarkers[1] }]">
              TR (ID:1): {{ detectedMarkers[1] ? 'Detected' : 'Not found' }}
            </div>
            <div :class="['status-item', { detected: detectedMarkers[2] }]">
              BL (ID:2): {{ detectedMarkers[2] ? 'Detected' : 'Not found' }}
            </div>
            <div :class="['status-item', { detected: detectedMarkers[3] }]">
              BR (ID:3): {{ detectedMarkers[3] ? 'Detected' : 'Not found' }}
            </div>
          </div>

          <div v-if="screenBounds" class="bounds-info">
            <h4>Screen Bounds (pixels)</h4>
            <p>X: {{ Math.round(screenBounds.x) }}, Y: {{ Math.round(screenBounds.y) }}</p>
            <p>Width: {{ Math.round(screenBounds.width) }}, Height: {{ Math.round(screenBounds.height) }}</p>
          </div>

          <q-btn @click="switchToMarkers" color="secondary" size="md">
            Back to Markers
          </q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { musicManager } from 'src/utils/musicManager'
import { ArUcoMarkerGenerator } from './ArUcoMarkerGenerator'
import { useHandTracking } from 'src/composables/useHandTracking'

// Try to import the library files directly
import * as jsAruco from 'js-aruco2/src/aruco.js'
import * as jsCV from 'js-aruco2/src/cv.js'

// Access the AR and CV objects from the imports
const AR = (jsAruco as any).AR || (window as any).AR
const CV = (jsCV as any).CV || (window as any).CV

console.log('AR loaded:', AR)
console.log('CV loaded:', CV)

interface MarkerCorners {
  id: number
  corners: Array<{ x: number; y: number }>
}

interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

const displayMode = ref<'markers' | 'camera'>('markers')
const markerTL = ref<HTMLCanvasElement | null>(null)
const markerTR = ref<HTMLCanvasElement | null>(null)
const markerBL = ref<HTMLCanvasElement | null>(null)
const markerBR = ref<HTMLCanvasElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const detectedMarkers = ref<Record<number, boolean>>({})
const screenBounds = ref<ScreenBounds | null>(null)

let previousTrack: string | null = null
let detector: any = null
let detectionInterval: number | null = null
let stream: MediaStream | null = null
let generator: ArUcoMarkerGenerator
let gridWindow: Window | null = null

// Grid settings
const GRID_SIZE = 10 // 10x10 grid
const illuminatedCells = ref<Set<string>>(new Set())

// Hand tracking
const handTracking = useHandTracking(video, overlay, 1) // Track 1 hand
const handPosition = ref<{ x: number; y: number } | null>(null)

onMounted(() => {
  console.log('ArucoTest mounted')
  previousTrack = musicManager.getCurrentTrack()
  musicManager.stop()

  generator = new ArUcoMarkerGenerator()
  drawMarkers()
})

onUnmounted(() => {
  if (previousTrack) {
    musicManager.play(previousTrack as any)
  }
  stopCamera()
})

function drawMarkers() {
  nextTick(() => {
    const markerSize = 150

    if (markerTL.value) {
      const ctx = markerTL.value.getContext('2d')!
      markerTL.value.width = markerSize
      markerTL.value.height = markerSize
      generator.drawMarker(ctx, 0, 0, 0, markerSize)
    }

    if (markerTR.value) {
      const ctx = markerTR.value.getContext('2d')!
      markerTR.value.width = markerSize
      markerTR.value.height = markerSize
      generator.drawMarker(ctx, 1, 0, 0, markerSize)
    }

    if (markerBL.value) {
      const ctx = markerBL.value.getContext('2d')!
      markerBL.value.width = markerSize
      markerBL.value.height = markerSize
      generator.drawMarker(ctx, 2, 0, 0, markerSize)
    }

    if (markerBR.value) {
      const ctx = markerBR.value.getContext('2d')!
      markerBR.value.width = markerSize
      markerBR.value.height = markerSize
      generator.drawMarker(ctx, 3, 0, 0, markerSize)
    }
  })
}

async function switchToCamera() {
  displayMode.value = 'camera'
  await nextTick()
  startCamera()
}

function switchToMarkers() {
  displayMode.value = 'markers'
  stopCamera()
  nextTick(() => drawMarkers())
}

function openInNewWindow() {
  gridWindow = window.open('', 'ArUco Markers & Grid', 'width=1920,height=1080,fullscreen=yes')

  if (gridWindow) {
    const gridCells = GRID_SIZE * GRID_SIZE
    const htmlContent = 
      '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<title>ArUco Markers & Grid</title>' +
        '<style>' +
          'body {' +
            'margin: 0;' +
            'padding: 0;' +
            'background: black;' +
            'width: 100vw;' +
            'height: 100vh;' +
            'position: relative;' +
            'overflow: hidden;' +
          '}' +
          '.marker {' +
            'position: absolute;' +
            'z-index: 10;' +
          '}' +
          '.top-left { top: 20px; left: 20px; }' +
          '.top-right { top: 20px; right: 20px; }' +
          '.bottom-left { bottom: 20px; left: 20px; }' +
          '.bottom-right { bottom: 20px; right: 20px; }' +
          '#grid {' +
            'position: absolute;' +
            'top: 0;' +
            'left: 0;' +
            'width: 100%;' +
            'height: 100%;' +
            'display: grid;' +
            'grid-template-columns: repeat(' + GRID_SIZE + ', 1fr);' +
            'grid-template-rows: repeat(' + GRID_SIZE + ', 1fr);' +
            'gap: 2px;' +
            'padding: 2px;' +
            'background: black;' +
          '}' +
          '.grid-cell {' +
            'background: black;' +
            'border: 1px solid #333;' +
            'transition: background-color 0.1s ease;' +
          '}' +
          '.grid-cell.illuminated {' +
            'background: cyan;' +
            'box-shadow: 0 0 10px cyan;' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div id="grid"></div>' +
        '<canvas id="markerTL" class="marker top-left"></canvas>' +
        '<canvas id="markerTR" class="marker top-right"></canvas>' +
        '<canvas id="markerBL" class="marker bottom-left"></canvas>' +
        '<canvas id="markerBR" class="marker bottom-right"></canvas>' +
        '<script>' +
          'const grid = document.getElementById("grid");' +
          'const cells = [];' +
          'for (let i = 0; i < ' + gridCells + '; i++) {' +
            'const cell = document.createElement("div");' +
            'cell.className = "grid-cell";' +
            'cell.id = "cell-" + i;' +
            'grid.appendChild(cell);' +
            'cells.push(cell);' +
          '}' +
          'window.updateGrid = function(illuminatedIndices) {' +
            'cells.forEach((cell, index) => {' +
              'if (illuminatedIndices.includes(index)) {' +
                'cell.classList.add("illuminated");' +
              '} else {' +
                'cell.classList.remove("illuminated");' +
              '}' +
            '});' +
          '};' +
        '</script>' +
      '</body>' +
      '</html>'
    
    gridWindow.document.write(htmlContent)
    gridWindow.document.close()

    setTimeout(() => {
      const markerSize = 150
      const doc = gridWindow.document

      const canvasTL = doc.getElementById('markerTL') as HTMLCanvasElement
      const canvasTR = doc.getElementById('markerTR') as HTMLCanvasElement
      const canvasBL = doc.getElementById('markerBL') as HTMLCanvasElement
      const canvasBR = doc.getElementById('markerBR') as HTMLCanvasElement

      if (canvasTL) {
        canvasTL.width = markerSize
        canvasTL.height = markerSize
        const ctx = canvasTL.getContext('2d')!
        generator.drawMarker(ctx, 0, 0, 0, markerSize)
      }

      if (canvasTR) {
        canvasTR.width = markerSize
        canvasTR.height = markerSize
        const ctx = canvasTR.getContext('2d')!
        generator.drawMarker(ctx, 1, 0, 0, markerSize)
      }

      if (canvasBL) {
        canvasBL.width = markerSize
        canvasBL.height = markerSize
        const ctx = canvasBL.getContext('2d')!
        generator.drawMarker(ctx, 2, 0, 0, markerSize)
      }

      if (canvasBR) {
        canvasBR.width = markerSize
        canvasBR.height = markerSize
        const ctx = canvasBR.getContext('2d')!
        generator.drawMarker(ctx, 3, 0, 0, markerSize)
      }
    }, 100)
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 1280, height: 720 }
    })

    if (video.value) {
      video.value.srcObject = stream

      video.value.onloadedmetadata = () => {
        if (overlay.value && video.value) {
          overlay.value.width = video.value.videoWidth
          overlay.value.height = video.value.videoHeight
        }

        if (AR && AR.Detector) {
          detector = new AR.Detector()
          startDetection()
          
          // Start hand tracking
          handTracking.startTracking()
        } else {
          console.error('AR.Detector not available', AR)
        }
      }
    }
  } catch (error) {
    console.error('Error accessing camera:', error)
  }
}

function stopCamera() {
  if (detectionInterval) {
    clearInterval(detectionInterval)
    detectionInterval = null
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  if (video.value) {
    video.value.srcObject = null
  }
}

function startDetection() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  detectionInterval = setInterval(() => {
    if (!video.value || !overlay.value || video.value.readyState !== 4) return

    canvas.width = video.value.videoWidth
    canvas.height = video.value.videoHeight
    ctx.drawImage(video.value, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const markers = detector.detect(imageData)

    processMarkers(markers)
    drawOverlay(markers)
  }, 100) as unknown as number
}

function processMarkers(markers: MarkerCorners[]) {
  detectedMarkers.value = {}
  const cornerPositions: Record<number, { x: number; y: number }[]> = {}

  markers.forEach(marker => {
    if (marker.id >= 0 && marker.id <= 3) {
      detectedMarkers.value[marker.id] = true
      cornerPositions[marker.id] = marker.corners
    }
  })

  if (Object.keys(cornerPositions).length === 4) {
    calculateScreenBounds(cornerPositions)
  } else {
    screenBounds.value = null
  }
}

function calculateScreenBounds(corners: Record<number, { x: number; y: number }[]>) {
  const topLeft = corners[0]?.[0]
  const topRight = corners[1]?.[1]
  const bottomLeft = corners[2]?.[3]
  const bottomRight = corners[3]?.[2]

  if (topLeft && topRight && bottomLeft && bottomRight) {
    const minX = Math.min(topLeft.x, bottomLeft.x)
    const maxX = Math.max(topRight.x, bottomRight.x)
    const minY = Math.min(topLeft.y, topRight.y)
    const maxY = Math.max(bottomLeft.y, bottomRight.y)

    screenBounds.value = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
}

function drawOverlay(markers: MarkerCorners[]) {
  if (!overlay.value) return

  const ctx = overlay.value.getContext('2d')!
  ctx.clearRect(0, 0, overlay.value.width, overlay.value.height)

  markers.forEach(marker => {
    ctx.strokeStyle = marker.id <= 3 ? '#00ff00' : '#ff0000'
    ctx.lineWidth = 3
    ctx.beginPath()

    marker.corners.forEach((corner, i) => {
      if (i === 0) {
        ctx.moveTo(corner.x, corner.y)
      } else {
        ctx.lineTo(corner.x, corner.y)
      }
    })
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = marker.id <= 3 ? '#00ff00' : '#ff0000'
    ctx.font = '20px Arial'
    ctx.fillText(`ID: ${marker.id}`, marker.corners[0].x, marker.corners[0].y - 10)
  })

  if (screenBounds.value) {
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 4
    ctx.setLineDash([10, 5])
    ctx.strokeRect(
      screenBounds.value.x,
      screenBounds.value.y,
      screenBounds.value.width,
      screenBounds.value.height
    )
    ctx.setLineDash([])
  }
}

// Coordinate transformation functions
function transformCameraToScreen(cameraX: number, cameraY: number) {
  if (!screenBounds.value) return null
  
  // Map camera coordinates to screen space
  const screenX = ((cameraX - screenBounds.value.x) / screenBounds.value.width) * 100
  const screenY = ((cameraY - screenBounds.value.y) / screenBounds.value.height) * 100
  
  // Clamp to screen bounds
  const clampedX = Math.max(0, Math.min(100, screenX))
  const clampedY = Math.max(0, Math.min(100, screenY))
  
  return { x: clampedX, y: clampedY }
}

function getGridCellFromPosition(x: number, y: number) {
  if (x < 0 || x > 100 || y < 0 || y > 100) return -1
  
  const cellX = Math.floor((x / 100) * GRID_SIZE)
  const cellY = Math.floor((y / 100) * GRID_SIZE)
  
  return cellY * GRID_SIZE + cellX
}

function updateHandPosition() {
  const hands = handTracking.hands.value
  if (hands.length > 0 && screenBounds.value) {
    const hand = hands[0]
    const handCenter = hand.landmarks[9] // Middle finger MCP joint
    
    // Convert normalized coordinates to camera pixel coordinates
    const cameraX = handCenter.x * (video.value?.videoWidth || 0)
    const cameraY = handCenter.y * (video.value?.videoHeight || 0)
    
    // Transform to screen space
    const screenPos = transformCameraToScreen(cameraX, cameraY)
    
    if (screenPos) {
      handPosition.value = screenPos
      
      // Get grid cell
      const cellIndex = getGridCellFromPosition(screenPos.x, screenPos.y)
      
      // Update illuminated cells
      illuminatedCells.value.clear()
      if (cellIndex >= 0) {
        illuminatedCells.value.add(cellIndex.toString())
      }
      
      // Update grid display window
      if (gridWindow && !gridWindow.closed) {
        try {
          (gridWindow as any).updateGrid(Array.from(illuminatedCells.value).map(Number))
        } catch (error) {
          console.error('Error updating grid:', error)
        }
      }
    }
  } else {
    handPosition.value = null
    illuminatedCells.value.clear()
    
    // Clear grid display
    if (gridWindow && !gridWindow.closed) {
      try {
        (gridWindow as any).updateGrid([])
      } catch (error) {
        console.error('Error clearing grid:', error)
      }
    }
  }
}

// Watch for hand position changes
handTracking.hands.value && setInterval(updateHandPosition, 50) // Update 20 FPS
</script>

<style scoped>
.aruco-test-container {
  width: 100vw;
  height: 100vh;
  background: #000;
  color: white;
  position: relative;
  overflow: hidden;
}

.marker-display {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

.marker {
  position: absolute;
}

.marker.top-left {
  top: 20px;
  left: 20px;
}

.marker.top-right {
  top: 20px;
  right: 20px;
}

.marker.bottom-left {
  bottom: 20px;
  left: 20px;
}

.marker.bottom-right {
  bottom: 20px;
  right: 20px;
}

.center-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 2rem;
  border-radius: 10px;
}

.camera-view {
  width: 100%;
  height: 100%;
  position: relative;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.detection-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  padding: 1.5rem;
  border-radius: 10px;
  min-width: 250px;
}

.info-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.marker-status {
  margin-bottom: 1rem;
}

.status-item {
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: rgba(255, 0, 0, 0.2);
  border-radius: 5px;
  border-left: 3px solid #ff0000;
}

.status-item.detected {
  background: rgba(0, 255, 0, 0.2);
  border-left-color: #00ff00;
}

.bounds-info {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 0, 0.1);
  border-radius: 5px;
}

.bounds-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.bounds-info p {
  margin: 0.25rem 0;
  font-family: monospace;
}
</style>