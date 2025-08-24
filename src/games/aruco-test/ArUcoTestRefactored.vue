<template>
  <div class="aruco-test-container">
    <!-- Marker Display Mode -->
    <ArUcoMarkerDisplay v-if="displayMode === 'markers'">
      <template #actions>
        <q-btn @click="switchToCamera" color="primary" size="lg">
          Switch to Camera View
        </q-btn>
        <q-btn @click="openGridWindow" color="secondary" size="lg" class="q-ml-md">
          Open Grid Window
        </q-btn>
      </template>
    </ArUcoMarkerDisplay>

    <!-- Camera Detection Mode -->
    <div v-else class="camera-view">
      <video ref="video" class="camera-feed" autoplay playsinline></video>
      <canvas ref="overlay" class="detection-overlay"></canvas>
      
      <DetectionStatus
        :detected-markers="detectionService.detectedMarkers.value"
        :screen-bounds="detectionService.screenBounds.value"
        :hand-position="handTracker?.handPosition.value || null"
      >
        <template #actions>
          <q-btn @click="switchToMarkers" color="secondary" size="md">
            Back to Markers
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

import ArUcoMarkerDisplay from './components/ArUcoMarkerDisplay.vue'
import DetectionStatus from './components/DetectionStatus.vue'

import { ArUcoDetectionService } from './services/ArUcoDetectionService'
import { GridWindowManager } from './services/GridWindowManager'
import { HandPositionTracker } from './services/HandPositionTracker'

const GRID_SIZE = 10

// Reactive state
const displayMode = ref<'markers' | 'camera'>('markers')
const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)

// Services
let detectionService: ArUcoDetectionService
let gridManager: GridWindowManager
let handTracker: HandPositionTracker | null = null

// Camera and hand tracking composables
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
  detectionService = new ArUcoDetectionService(video, overlay)
  gridManager = new GridWindowManager(GRID_SIZE)
})

onUnmounted(() => {
  cleanup()
  
  // Restore music
  if (previousTrack) {
    musicManager.play(previousTrack as any)
  }
})

async function switchToCamera() {
  displayMode.value = 'camera'
  await nextTick()
  
  try {
    // Start camera using the correct method
    await camera.enableCamera()
    
    // Wait for video metadata to load
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
    
    // Start ArUco detection
    const detectionStarted = detectionService.startDetection()
    if (!detectionStarted) {
      throw new Error('Failed to start ArUco detection')
    }
    
    // Start hand tracking
    await handTracking.startTracking()
    
    // Initialize hand position tracker
    handTracker = new HandPositionTracker(
      video,
      overlay,
      detectionService.screenBounds,
      gridManager,
      handTracking,
      GRID_SIZE
    )
    handTracker.startTracking()
    
    console.log('Camera mode started successfully')
    
  } catch (error) {
    console.error('Failed to start camera mode:', error)
    switchToMarkers()
  }
}

function switchToMarkers() {
  displayMode.value = 'markers'
  cleanup()
}

function openGridWindow() {
  const success = gridManager.openWindow()
  if (!success) {
    console.error('Failed to open grid window')
  }
}

function cleanup() {
  // Stop all tracking and detection
  detectionService?.stopDetection()
  handTracker?.stopTracking()
  handTracking.stopTracking()
  camera.stopCamera()
  
  // Reset trackers
  handTracker = null
}

// Expose services for debugging
defineExpose({
  detectionService,
  gridManager,
  handTracker
})
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