<template>
  <div class="aruco-test-container">
    <!-- Display Mode: Markers + Grid -->
    <div v-if="mode === 'display'" class="display-mode">
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
      
      <!-- Controls -->
      <div class="controls">
        <h2>ArUco + Interactive Grid</h2>
        <p>Point camera at this screen to detect markers</p>
        <q-btn @click="switchToCamera" color="primary" size="lg">
          Start Camera Detection
        </q-btn>
      </div>
    </div>

    <!-- Camera Mode: Detection -->
    <div v-else class="camera-mode">
      <video ref="video" class="camera-feed" autoplay playsinline></video>
      <canvas ref="overlay" class="detection-overlay"></canvas>
      
      <DetectionStatus
        :detected-markers="detectedMarkers"
        :screen-bounds="screenBounds"
        :hand-position="handPosition"
      >
        <template #actions>
          <q-btn @click="switchToDisplay" color="secondary" size="md">
            Back to Display
          </q-btn>
        </template>
      </DetectionStatus>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { musicManager } from 'src/utils/musicManager'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

import DetectionStatus from './components/DetectionStatus.vue'
import { ArUcoMarkerGenerator } from './ArUcoMarkerGenerator'
import { ArUcoDetectionService } from './services/ArUcoDetectionService'
import { CoordinateTransformService } from './services/CoordinateTransformService'

const GRID_SIZE = 10
const GRID_CELLS = GRID_SIZE * GRID_SIZE

// State
const mode = ref<'display' | 'camera'>('display')
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
  console.log('ArUco Test mounted')
  
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
    const markerSize = 150
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

async function switchToCamera() {
  mode.value = 'camera'
  await nextTick()
  
  try {
    // Start camera
    await camera.enableCamera()
    
    // Wait for video metadata
    await new Promise<void>((resolve) => {
      if (video.value) {
        video.value.onloadedmetadata = () => {
          if (overlay.value && video.value) {
            overlay.value.width = video.value.videoWidth
            overlay.value.height = video.value.videoHeight
          }
          resolve()
        }
      }
    })
    
    // Start detection
    detectionService = new ArUcoDetectionService(video, overlay)
    detectionService.startDetection()
    
    // Start hand tracking
    await handTracking.startTracking()
    
    // Start position updates
    startPositionUpdates()
    
    console.log('Camera detection started')
    
  } catch (error) {
    console.error('Failed to start camera:', error)
    switchToDisplay()
  }
}

function switchToDisplay() {
  mode.value = 'display'
  cleanup()
}

function startPositionUpdates() {
  updateInterval = setInterval(() => {
    if (!detectionService || !video.value) return
    
    // Update reactive state from detection service
    detectedMarkers.value = { ...detectionService.detectedMarkers.value }
    screenBounds.value = detectionService.screenBounds.value
    
    console.log('Detection update:', {
      markers: detectedMarkers.value,
      bounds: screenBounds.value,
      handsCount: handTracking.hands.value.length
    })
    
    // Update hand position and grid
    const hands = handTracking.hands.value
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
</script>

<style scoped>
.aruco-test-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.display-mode {
  width: 100%;
  height: 100%;
  background: white;
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

.controls {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2rem;
  border-radius: 10px;
  z-index: 20;
}

.camera-mode {
  width: 100%;
  height: 100%;
  background: black;
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
</style>