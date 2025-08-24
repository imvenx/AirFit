<template>
  <div class="camera-view">
    <video ref="videoRef" class="camera-video" autoplay muted playsinline></video>
    <canvas ref="landmarksCanvasRef" class="landmarks-overlay"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { usePoseTracking } from 'src/composables/usePoseTracking'

const videoRef = ref<HTMLVideoElement>()
const landmarksCanvasRef = ref<HTMLCanvasElement>()

const { enableCamera, stopCamera } = useCamera(videoRef)
const { initializePoseTracking, startTracking, stopTracking, landmarks } = usePoseTracking(videoRef, landmarksCanvasRef)

// Expose landmarks for parent components
defineExpose({
  landmarks
})

onMounted(async () => {
  try {
    await enableCamera()
    await initializePoseTracking()
    await startTracking()
  } catch (error) {
    console.error('Failed to initialize camera view:', error)
  }
})

onUnmounted(() => {
  stopCamera()
  stopTracking()
})
</script>

<style scoped>
.camera-view {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 300px;
  height: 225px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.landmarks-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>