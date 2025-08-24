<template>
  <div class="aruco-test-container">
    <!-- SINGLE VIEW: Markers + Grid Display -->
    <div class="display-view" v-if="displayMode === 'display'">
      <!-- ArUco Markers at corners -->
      <canvas ref="markerTL" class="marker top-left"></canvas>
      <canvas ref="markerTR" class="marker top-right"></canvas>
      <canvas ref="markerBL" class="marker bottom-left"></canvas>
      <canvas ref="markerBR" class="marker bottom-right"></canvas>
      
      <!-- Grid overlay on same view -->
      <div id="grid" class="grid-overlay">
        <div 
          v-for="i in gridCells" 
          :key="i"
          :class="['grid-cell', { lit: illuminatedCells.has(i-1) }]"
        ></div>
      </div>
      
      <div class="center-info">
        <h2>ArUco Markers + Interactive Grid</h2>
        <p>Point camera at this view to detect markers and interact with grid</p>
        <q-btn @click="switchToCamera" color="primary" size="lg">
          Start Camera Detection
        </q-btn>
        <q-btn @click="openInNewWindow" color="secondary" size="lg" class="q-ml-md">
          Open in New Window
        </q-btn>
      </div>
    </div>

    <!-- Camera Detection View -->
    <div class="camera-view" v-else>
      <video ref="video" class="camera-feed" autoplay playsinline></video>
      <canvas ref="overlay" class="detection-overlay"></canvas>
      
      <DetectionStatus
        :detected-markers="detectionService?.detectedMarkers.value || {}"
        :screen-bounds="detectionService?.screenBounds.value || null"
        :hand-position="handTracker?.handPosition.value || null"
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { musicManager } from 'src/utils/musicManager'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

import DetectionStatus from './components/DetectionStatus.vue'
import { ArUcoMarkerGenerator } from './ArUcoMarkerGenerator'
import { ArUcoDetectionService } from './services/ArUcoDetectionService'
import { GridWindowManager } from './services/GridWindowManager'
import { HandPositionTracker } from './services/HandPositionTracker'

const GRID_SIZE = 10

// Reactive state
const displayMode = ref<'display' | 'camera'>('display')
const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const illuminatedCells = ref<Set<number>>(new Set())

// Marker refs
const markerTL = ref<HTMLCanvasElement | null>(null)
const markerTR = ref<HTMLCanvasElement | null>(null)
const markerBL = ref<HTMLCanvasElement | null>(null)
const markerBR = ref<HTMLCanvasElement | null>(null)

// Computed
const gridCells = computed(() => GRID_SIZE * GRID_SIZE)

// Services
let generator: ArUcoMarkerGenerator
let detectionService: ArUcoDetectionService | null = null
let gridManager: GridWindowManager
let handTracker: HandPositionTracker | null = null

// Composables
const camera = useCamera(video)
const handTracking = useHandTracking(video, overlay, 1)

// Music state
let previousTrack: string | null = null

onMounted(() => {
  console.log('ArUco Test mounted')
  
  // Store and stop music
  previousTrack = musicManager.getCurrentTrack()
  musicManager.stop()
  
  // Initialize services
  generator = new ArUcoMarkerGenerator()
  gridManager = new GridWindowManager(GRID_SIZE)
  
  // Draw markers
  drawMarkers()
})

onUnmounted(() => {
  cleanup()
  
  // Restore music
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

function openInNewWindow() {
  // Open the SAME view (markers + grid) in new window
  const newWindow = window.open('', 'ArUco Display', 'width=1200,height=800')
  
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head>
          <title>ArUco Markers + Grid</title>
          <style>
            body { 
              margin: 0; 
              background: white; 
              position: relative;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
            }
            .marker { position: absolute; z-index: 10; }
            .top-left { top: 20px; left: 20px; }
            .top-right { top: 20px; right: 20px; }
            .bottom-left { bottom: 20px; left: 20px; }
            .bottom-right { bottom: 20px; right: 20px; }
            .grid-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: grid;
              grid-template-columns: repeat(${GRID_SIZE}, 1fr);
              grid-template-rows: repeat(${GRID_SIZE}, 1fr);
              gap: 2px;
              padding: 2px;
              background: transparent;
            }
            .grid-cell {
              background: rgba(0,0,0,0.1);
              border: 1px solid rgba(0,0,0,0.2);
              transition: all 0.2s ease;
            }
            .grid-cell.lit {
              background: cyan;
              box-shadow: 0 0 15px cyan;
            }
          </style>
        </head>
        <body>
          <div class="grid-overlay" id="grid"></div>
          <canvas id="markerTL" class="marker top-left"></canvas>
          <canvas id="markerTR" class="marker top-right"></canvas>
          <canvas id="markerBL" class="marker bottom-left"></canvas>
          <canvas id="markerBR" class="marker bottom-right"></canvas>
          
          <script>
            // Create grid cells
            const grid = document.getElementById('grid');
            const cells = [];
            for (let i = 0; i < ${GRID_SIZE * GRID_SIZE}; i++) {
              const cell = document.createElement('div');
              cell.className = 'grid-cell';
              grid.appendChild(cell);
              cells.push(cell);
            }
            
            // Update grid function
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
    newWindow.document.close()
    
    // Draw markers in new window
    setTimeout(() => {
      const markerSize = 150
      const markers = [
        { id: 'markerTL', arucoId: 0 },
        { id: 'markerTR', arucoId: 1 },
        { id: 'markerBL', arucoId: 2 },
        { id: 'markerBR', arucoId: 3 }
      ]
      
      markers.forEach(({ id, arucoId }) => {
        const canvas = newWindow.document.getElementById(id) as HTMLCanvasElement
        if (canvas) {
          canvas.width = markerSize
          canvas.height = markerSize
          const ctx = canvas.getContext('2d')!
          generator.drawMarker(ctx, arucoId, 0, 0, markerSize)
        }
      })
    }, 100)
    
    // Store reference for grid updates
    gridManager = new GridWindowManager(GRID_SIZE)
    ;(gridManager as any).gridWindow = newWindow
  }
}

async function switchToCamera() {
  displayMode.value = 'camera'
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
    
    // Initialize detection service
    detectionService = new ArUcoDetectionService(video, overlay)
    const detectionStarted = detectionService.startDetection()
    if (!detectionStarted) {
      throw new Error('Failed to start ArUco detection')
    }
    
    // Start hand tracking
    await handTracking.startTracking()
    
    // Initialize hand position tracker with grid update callback
    handTracker = new HandPositionTracker(
      video,
      overlay,
      detectionService.screenBounds,
      gridManager,
      handTracking,
      GRID_SIZE
    )
    
    // Custom grid update logic
    const originalUpdate = handTracker.startTracking.bind(handTracker)
    handTracker.startTracking = () => {
      originalUpdate()
      
      // Watch for hand position changes and update local grid too
      setInterval(() => {
        if (handTracker?.handPosition.value) {
          const pos = handTracker.handPosition.value
          const cellX = Math.floor((pos.x / 100) * GRID_SIZE)
          const cellY = Math.floor((pos.y / 100) * GRID_SIZE)
          const cellIndex = cellY * GRID_SIZE + cellX
          
          // Update local grid
          illuminatedCells.value.clear()
          if (cellIndex >= 0 && cellIndex < GRID_SIZE * GRID_SIZE) {
            illuminatedCells.value.add(cellIndex)
          }
        } else {
          illuminatedCells.value.clear()
        }
      }, 50)
    }
    
    handTracker.startTracking()
    
    console.log('Camera mode started successfully')
    
  } catch (error) {
    console.error('Failed to start camera mode:', error)
    switchToDisplay()
  }
}

function switchToDisplay() {
  displayMode.value = 'display'
  cleanup()
}

function cleanup() {
  detectionService?.stopDetection()
  handTracker?.stopTracking()
  handTracking.stopTracking()
  camera.stopCamera()
  
  detectionService = null
  handTracker = null
  illuminatedCells.value.clear()
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

.display-view {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

.marker {
  position: absolute;
  z-index: 20;
}

.marker.top-left { top: 20px; left: 20px; }
.marker.top-right { top: 20px; right: 20px; }
.marker.bottom-left { bottom: 20px; left: 20px; }
.marker.bottom-right { bottom: 20px; right: 20px; }

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(v-bind(GRID_SIZE), 1fr);
  grid-template-rows: repeat(v-bind(GRID_SIZE), 1fr);
  gap: 2px;
  padding: 2px;
  background: transparent;
  z-index: 5;
}

.grid-cell {
  background: rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.grid-cell.lit {
  background: cyan;
  box-shadow: 0 0 15px cyan;
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
  z-index: 30;
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
</style>