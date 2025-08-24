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
        <q-btn @click="openGridWindow" color="secondary" size="lg" class="q-ml-md">
          Open Grid Window
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
          
          <div v-if="handPosition" class="hand-info">
            <h4>Hand Position (%)</h4>
            <p>X: {{ Math.round(handPosition.x) }}%, Y: {{ Math.round(handPosition.y) }}%</p>
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

// Import ArUco library
import * as jsAruco from 'js-aruco2/src/aruco.js'
import * as jsCV from 'js-aruco2/src/cv.js'

const AR = (jsAruco as any).AR
const CV = (jsCV as any).CV

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

// Reactive refs
const displayMode = ref<'markers' | 'camera'>('markers')
const markerTL = ref<HTMLCanvasElement | null>(null)
const markerTR = ref<HTMLCanvasElement | null>(null)
const markerBL = ref<HTMLCanvasElement | null>(null)
const markerBR = ref<HTMLCanvasElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const detectedMarkers = ref<Record<number, boolean>>({})
const screenBounds = ref<ScreenBounds | null>(null)
const handPosition = ref<{ x: number; y: number } | null>(null)

// Variables
let previousTrack: string | null = null
let detector: any = null
let detectionInterval: number | null = null
let stream: MediaStream | null = null
let generator: ArUcoMarkerGenerator
let gridWindow: Window | null = null
let updateInterval: number | null = null

const GRID_SIZE = 10

// Hand tracking
const handTracking = useHandTracking(video, overlay, 1)

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
  if (updateInterval) {
    clearInterval(updateInterval)
  }
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

function openGridWindow() {
  gridWindow = window.open('', 'Grid', 'width=800,height=600')
  
  if (gridWindow) {
    gridWindow.document.write(`
      <html>
        <head>
          <title>Interactive Grid</title>
          <style>
            body { margin: 0; padding: 20px; background: black; }
            #grid { 
              display: grid; 
              grid-template-columns: repeat(${GRID_SIZE}, 1fr);
              grid-template-rows: repeat(${GRID_SIZE}, 1fr);
              gap: 2px; 
              width: 500px; 
              height: 500px; 
            }
            .cell { 
              background: #333; 
              border: 1px solid #666; 
              transition: all 0.2s;
            }
            .cell.lit { 
              background: cyan; 
              box-shadow: 0 0 10px cyan; 
            }
          </style>
        </head>
        <body>
          <h2 style="color: white;">Interactive Grid</h2>
          <div id="grid"></div>
          <script>
            const grid = document.getElementById('grid');
            const cells = [];
            for (let i = 0; i < ${GRID_SIZE * GRID_SIZE}; i++) {
              const cell = document.createElement('div');
              cell.className = 'cell';
              grid.appendChild(cell);
              cells.push(cell);
            }
            
            window.updateGrid = function(litCells) {
              cells.forEach((cell, i) => {
                if (litCells.includes(i)) {
                  cell.classList.add('lit');
                } else {
                  cell.classList.remove('lit');
                }
              });
            };
          </script>
        </body>
      </html>
    `)
    gridWindow.document.close()
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
          handTracking.startTracking()
          
          // Start hand position updates
          updateInterval = setInterval(updateHandPosition, 50) as unknown as number
        } else {
          console.error('AR.Detector not available')
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
  
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  
  if (video.value) {
    video.value.srcObject = null
  }
  
  handTracking.stopTracking()
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
  
  // Draw markers
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
  
  // Draw screen bounds
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
  
  // Draw hand position
  if (handPosition.value && screenBounds.value) {
    const x = screenBounds.value.x + (handPosition.value.x / 100) * screenBounds.value.width
    const y = screenBounds.value.y + (handPosition.value.y / 100) * screenBounds.value.height
    
    ctx.fillStyle = '#ff00ff'
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
  }
}

function updateHandPosition() {
  const hands = handTracking.hands.value
  if (hands.length > 0 && screenBounds.value && video.value) {
    const hand = hands[0]
    const handCenter = hand.landmarks[9] // Middle finger MCP joint
    
    // Convert normalized coordinates to camera pixels
    const cameraX = handCenter.x * video.value.videoWidth
    const cameraY = handCenter.y * video.value.videoHeight
    
    // Map to screen percentage
    const screenX = ((cameraX - screenBounds.value.x) / screenBounds.value.width) * 100
    const screenY = ((cameraY - screenBounds.value.y) / screenBounds.value.height) * 100
    
    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(100, screenX))
    const clampedY = Math.max(0, Math.min(100, screenY))
    
    handPosition.value = { x: clampedX, y: clampedY }
    
    // Update grid
    const cellX = Math.floor((clampedX / 100) * GRID_SIZE)
    const cellY = Math.floor((clampedY / 100) * GRID_SIZE)
    const cellIndex = cellY * GRID_SIZE + cellX
    
    if (gridWindow && !gridWindow.closed && cellIndex >= 0 && cellIndex < GRID_SIZE * GRID_SIZE) {
      try {
        (gridWindow as any).updateGrid([cellIndex])
      } catch (error) {
        console.log('Grid window communication error')
      }
    }
  } else {
    handPosition.value = null
    if (gridWindow && !gridWindow.closed) {
      try {
        (gridWindow as any).updateGrid([])
      } catch (error) {
        console.log('Grid window communication error')
      }
    }
  }
}
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

.bounds-info, .hand-info {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 0, 0.1);
  border-radius: 5px;
}

.bounds-info h4, .hand-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.bounds-info p, .hand-info p {
  margin: 0.25rem 0;
  font-family: monospace;
}
</style>