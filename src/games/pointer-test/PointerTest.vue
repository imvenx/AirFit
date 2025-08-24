<template>
  <div class="pointer-test">
    <div class="content">
      <div class="icon">🖱️</div>
      <h2>Pointer Test</h2>
      <p>This is a placeholder for the Pointer Test minigame.</p>
    </div>

    <!-- Mirrored camera preview -->
    <div class="mini-camera" :class="{ error: !!error }">
      <video ref="videoRef" class="mini-video" autoplay muted playsinline></video>
      <div v-if="error" class="camera-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useCamera } from 'src/composables/useCamera'

const videoRef = ref<HTMLVideoElement | null>(null)
const { enableCamera, stopCamera, error } = useCamera(videoRef)

onMounted(async () => {
  try {
    await enableCamera()
  } catch (e) {
    // Error is already set by useCamera; no-op
  }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.pointer-test {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.content {
  text-align: center;
}

.icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

h2 {
  margin: 0.25rem 0 0.5rem 0;
}

p {
  opacity: 0.85;
}

.mini-camera {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 240px;
  height: 180px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}

.mini-camera.error {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-error {
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
}
</style>
