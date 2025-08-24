<template>
  <div class="aruco-test-container">
    <div class="split-layout">
      <!-- LEFT SIDE: ArUco Markers + Interactive Grid (Detection Target) -->
      <div class="target-panel">
        <div class="target-display">
          <!-- ArUco Markers -->
          <canvas ref="markerTL" class="marker top-left"></canvas>
          <canvas ref="markerTR" class="marker top-right"></canvas>
          <canvas ref="markerBL" class="marker bottom-left"></canvas>
          <canvas ref="markerBR" class="marker bottom-right"></canvas>
          
          <!-- Interactive Grid -->
          <div class="grid-container">
            <div 
              v-for="i in GRID_CELLS" 
              :key="i"
              :class="['grid-cell', { lit: illuminatedCells.has(i-1) }]"
            ></div>
          </div>
          
          <div class="target-info">
            <h3>Detection Target</h3>
            <p>Point camera at this area</p>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: Camera Feed + Detection Status -->
      <div class="camera-panel">
        <div class="camera-container">
          <video ref="video" class="camera-feed" autoplay playsinline></video>
          <canvas ref="overlay" class="detection-overlay"></canvas>
          
          <div class="camera-controls">
            <q-btn 
              v-if="!cameraActive" 
              @click="startCamera" 
              color="primary" 
              size="lg"
            >
              Start Camera
            </q-btn>
            <q-btn 
              v-else 
              @click="stopCamera" 
              color="negative" 
              size="md"
            >
              Stop Camera
            </q-btn>
          </div>
        </div>
        
        <!-- Detection Status -->
        <div class="detection-status">
          <h4>Detection Status</h4>
          
          <div class="marker-status">
            <div 
              v-for="id in [0,1,2,3]" 
              :key="id"
              :class="['status-item', { detected: detectedMarkers[id] }]"
            >
              {{ getMarkerLabel(id) }}: {{ detectedMarkers[id] ? '✓ Found' : '✗ Not found' }}
            </div>
          </div>
          
          <div v-if="screenBounds" class="bounds-info">
            <h5>Screen Bounds</h5>
            <p>{{ Math.round(screenBounds.width) }} × {{ Math.round(screenBounds.height) }} px</p>
          </div>
          
          <div v-if="handPosition" class="hand-info">
            <h5>Hand Position</h5>
            <p>{{ Math.round(handPosition.x) }}%, {{ Math.round(handPosition.y) }}%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { musicManager } from 'src/utils/musicManager'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

import { ArUcoMarkerGenerator } from './ArUcoMarkerGenerator'
import { ArUcoDetectionService } from './services/ArUcoDetectionService'
import { CoordinateTransformService } from './services/CoordinateTransformService'

const GRID_SIZE = 10
const GRID_CELLS = GRID_SIZE * GRID_SIZE

// State
const cameraActive = ref(false)
const illuminatedCells = ref<Set<number>>(new Set())

// Detection state
const detectedMarkers = ref<Record<number, boolean>>({})
const screenBounds = ref<any>(null)
const handPosition = ref<any>(null)

// Refs
const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const markerTL = ref<HTMLCanvasElement | null>(null)
const markerTR = ref<HTMLCanvasElement | null>(null)
const markerBL = ref<HTMLCanvasElement | null>(null)
const markerBR = ref<HTMLCanvasElement | null>(null)

// Services
let generator: ArUcoMarkerGenerator
let detectionService: ArUcoDetectionService | null = null
let coordinateService: CoordinateTransformService
let updateInterval: number | null = null

// Composables
const camera = useCamera(video)
const handTracking = useHandTracking(video, overlay, 1)

// Music
let previousTrack: string | null = null

onMounted(() => {
  console.log('ArUco Split Screen Test mounted')
  
  previousTrack = musicManager.getCurrentTrack()
  musicManager.stop()
  
  generator = new ArUcoMarkerGenerator()
  coordinateService = new CoordinateTransformService()
  
  drawMarkers()
})

onUnmounted(() => {
  cleanup()
  
  if (previousTrack) {
    musicManager.play(previousTrack as any)
  }
})

function drawMarkers() {
  nextTick(() => {
    const markerSize = 120
    const markers = [
      { canvas: markerTL, id: 0 },
      { canvas: markerTR, id: 1 },
      { canvas: markerBL, id: 2 },
      { canvas: markerBR, id: 3 }
    ]
    
    markers.forEach(({ canvas, id }) => {
      if (canvas.value) {
        const ctx = canvas.value.getContext('2d')!
        canvas.value.width = markerSize
        canvas.value.height = markerSize
        generator.drawMarker(ctx, id, 0, 0, markerSize)
      }
    })
  })
}

async function startCamera() {
  try {
    await camera.enableCamera()
    cameraActive.value = true
    
    await new Promise<void>((resolve, reject) => {
      if (video.value) {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata timeout'))
        }, 10000)
        
        video.value.onloadedmetadata = () => {
          clearTimeout(timeout)
          if (overlay.value && video.value) {
            overlay.value.width = video.value.videoWidth
            overlay.value.height = video.value.videoHeight
          }
          resolve()
        }
        
        if (video.value.readyState >= 1) {
          clearTimeout(timeout)
          if (overlay.value && video.value) {
            overlay.value.width = video.value.videoWidth
            overlay.value.height = video.value.videoHeight
          }
          resolve()
        }
      } else {
        reject(new Error('Video element not available'))
      }
    })
    
    detectionService = new ArUcoDetectionService(video, overlay)
    const started = detectionService.startDetection()
    
    if (!started) {
      throw new Error('Failed to start ArUco detection')
    }
    
    try {
      await handTracking.startTracking()
    } catch (handError) {
      console.warn('Hand tracking failed to start, continuing without it:', handError)
    }
    
    startPositionUpdates()
    
  } catch (error) {
    console.error('Failed to start camera:', error)
    cameraActive.value = false
  }
}

function stopCamera() {
  cleanup()
  cameraActive.value = false
}

function startPositionUpdates() {
  updateInterval = setInterval(() => {
    if (!detectionService || !video.value) return
    
    // Update reactive state from detection service
    detectedMarkers.value = { ...detectionService.detectedMarkers.value }
    screenBounds.value = detectionService.screenBounds.value
    
    // Update hand position and grid
    const hands = handTracking.hands?.value || []
    if (hands.length > 0 && screenBounds.value) {
      const hand = hands[0]
      const handCenter = hand.landmarks[9] // Middle finger MCP
      
      // Convert to camera coordinates
      const cameraPos = coordinateService.convertHandLandmarkToCamera(
        handCenter,
        video.value.videoWidth,
        video.value.videoHeight
      )
      
      // Transform to screen percentage
      const screenPos = coordinateService.transformCameraToScreen(
        cameraPos.x,
        cameraPos.y,
        screenBounds.value
      )
      
      if (screenPos) {
        handPosition.value = screenPos
        
        // Update grid
        const cellIndex = coordinateService.getGridCellFromPosition(screenPos, GRID_SIZE)
        
        illuminatedCells.value.clear()
        if (cellIndex >= 0 && cellIndex < GRID_CELLS) {
          illuminatedCells.value.add(cellIndex)
        }
        
        // Draw hand position on overlay
        if (detectionService) {
          detectionService.drawHandPosition(screenPos)
        }
      }
    } else {
      handPosition.value = null
      illuminatedCells.value.clear()
    }
  }, 50) as unknown as number
}

function cleanup() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
  
  detectionService?.stopDetection()
  handTracking.stopTracking()
  camera.stopCamera()
  
  detectionService = null
  illuminatedCells.value.clear()
  detectedMarkers.value = {}
  screenBounds.value = null
  handPosition.value = null
}

function getMarkerLabel(id: number): string {
  const labels = ['TL', 'TR', 'BL', 'BR']
  return labels[id] || 'Unknown'
}
</script>

<style scoped>
.aruco-test-container {
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.split-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

/* LEFT SIDE: Detection Target */
.target-panel {
  width: 50%;
  height: 100%;
  background: white;
  position: relative;
  border-right: 3px solid #333;
}

.target-display {
  width: 100%;
  height: 100%;
  position: relative;
}

.marker {
  position: absolute;
  z-index: 10;
}

.marker.top-left { top: 20px; left: 20px; }
.marker.top-right { top: 20px; right: 20px; }
.marker.bottom-left { bottom: 20px; left: 20px; }
.marker.bottom-right { bottom: 20px; right: 20px; }

.grid-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(v-bind(GRID_SIZE), 1fr);
  grid-template-rows: repeat(v-bind(GRID_SIZE), 1fr);
  gap: 1px;
  padding: 1px;
  z-index: 5;
}

.grid-cell {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.grid-cell.lit {
  background: rgba(0, 255, 255, 0.8);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
  border-color: cyan;
}

.target-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  z-index: 20;
}

/* RIGHT SIDE: Camera */
.camera-panel {
  width: 50%;
  height: 100%;
  background: #111;
  display: flex;
  flex-direction: column;
}

.camera-container {
  flex: 1;
  position: relative;
  background: #000;
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

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.detection-status {
  background: #222;
  color: white;
  padding: 1rem;
  border-top: 2px solid #444;
  max-height: 200px;
  overflow-y: auto;
}

.detection-status h4, .detection-status h5 {
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.marker-status {
  margin-bottom: 1rem;
}

.status-item {
  padding: 0.3rem 0.5rem;
  margin: 0.2rem 0;
  background: rgba(255, 0, 0, 0.2);
  border-radius: 4px;
  border-left: 3px solid #ff0000;
  font-size: 0.9rem;
}

.status-item.detected {
  background: rgba(0, 255, 0, 0.2);
  border-left-color: #00ff00;
}

.bounds-info, .hand-info {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: rgba(255, 255, 0, 0.1);
  border-radius: 4px;
  font-size: 0.8rem;
}

.bounds-info p, .hand-info p {
  margin: 0;
  font-family: monospace;
}
</style>