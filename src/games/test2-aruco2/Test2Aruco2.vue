<template>
  <div class="test2-aruco2-container">
    <canvas ref="markerCanvas" class="aruco-marker"></canvas>

    <div class="mini-webcam">
      <video ref="videoEl" autoplay playsinline class="video-feed"></video>
      <canvas ref="canvasEl" class="overlay-canvas"></canvas>
      <div class="status-info">
        <div v-if="manager?.indexFingerPos.value" class="finger-status">
          Index: {{ Math.round(manager.indexFingerPos.value.x * 100) }}%, {{ Math.round(manager.indexFingerPos.value.y * 100) }}%
        </div>
        <div v-if="manager?.relativeFingerPos.value" class="relative-status">
          Relative: {{ Math.round(manager.relativeFingerPos.value.x * 100) }}%, {{ Math.round(manager.relativeFingerPos.value.y * 100) }}%
        </div>
        <div class="aruco-status" :class="{ detected: manager?.arucoDetected.value, 'not-detected': !manager?.arucoDetected.value }">
          ● ArUco: {{ manager?.arucoDetected.value ? 'DETECTED' : 'NOT DETECTED' }}
          <br />
          Service: {{ manager?.arucoServiceRunning.value ? 'RUNNING' : 'STOPPED' }}
          <br />
          Confidence: {{ Math.round(manager?.arucoConfidence.value || 0) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Test2Aruco2Manager } from './Test2Aruco2Manager'
import { musicManager } from 'src/utils/musicManager'

const markerCanvas = ref<HTMLCanvasElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let manager: Test2Aruco2Manager | null = null

onMounted(async () => {
  musicManager.stop()

  if (!videoEl.value || !canvasEl.value || !markerCanvas.value) return

  manager = new Test2Aruco2Manager(videoEl, canvasEl)

  manager.drawArUcoMarker(markerCanvas.value)

  try {
    await manager.initialize()

    const updateOverlay = () => {
      if (canvasEl.value && manager) {
        manager.drawIndexFingerOverlay(canvasEl.value)
      }
      if (markerCanvas.value && manager) {
        manager.drawArUcoMarker(markerCanvas.value)
        manager.drawRelativePositionOnMarker(markerCanvas.value)
      }
      requestAnimationFrame(updateOverlay)
    }
    updateOverlay()
  } catch (err) {
    console.error('Failed to start hand tracking:', err)
  }
})

onUnmounted(() => {
  manager?.destroy()
})
</script>

<style scoped>
.test2-aruco2-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  position: relative;
}

.aruco-marker {
  border: 2px solid #333;
  background: white;
}

.mini-webcam {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 320px;
  height: 240px;
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
}

.status-info {
  position: absolute;
  bottom: 5px;
  left: 5px;
  background: rgba(0, 0, 0, 0.8);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1.4;
}

.finger-status {
  color: #00ff00;
}

.relative-status {
  color: #ffff00;
}

.aruco-status {
  font-weight: bold;
}

.detected {
  color: #00ff00;
}

.not-detected {
  color: #ff0000;
}

.relative-pos {
  color: #ffff00;
}

.detected {
  color: #00ff00;
}

.not-detected {
  color: #ff6666;
}
</style>