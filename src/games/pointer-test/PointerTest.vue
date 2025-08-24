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
      <canvas ref="canvasRef" class="mini-overlay"></canvas>
      <div v-if="error" class="camera-error">{{ error }}</div>
    </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { enableCamera, stopCamera, error } = useCamera(videoRef)
const { initializeHandTracking, startTracking, stopTracking, landmarks } = useHandTracking(videoRef, canvasRef, 1)

function resizeCanvasToVideo() {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return
  const rect = video.getBoundingClientRect()
  canvas.width = Math.floor(rect.width)
  canvas.height = Math.floor(rect.height)
}

function drawHands() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  const hands = landmarks.value
  if (!canvas || !ctx) return

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw each detected hand
  for (const lm of hands) {
    // Convert normalized coords to pixels
    const pts = lm.map(p => ({ x: p.x * canvas.width, y: p.y * canvas.height }))

    // Connection map (basic fingers + wrist connections)
    const connections: Array<[number, number]> = [
      // thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // pinky
      [0, 17], [17, 18], [18, 19], [19, 20]
    ]

    // Draw connections
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Palm/fingers in subtle color
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
    ctx.lineWidth = 2
    for (const [a, b] of connections) {
      ctx.beginPath()
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
      ctx.stroke()
    }

    // Highlight index finger chain (5-6-7-8)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)'
    ctx.lineWidth = 3.5
    const indexChain = [5, 6, 7, 8]
    ctx.beginPath()
    ctx.moveTo(pts[indexChain[0]].x, pts[indexChain[0]].y)
    for (let i = 1; i < indexChain.length; i++) {
      const id = indexChain[i]
      ctx.lineTo(pts[id].x, pts[id].y)
    }
    ctx.stroke()

    // Draw joints as dots
    for (let i = 0; i < pts.length; i++) {
      const { x, y } = pts[i]
      const isIndex = indexChain.includes(i)
      ctx.beginPath()
      ctx.fillStyle = isIndex ? 'rgba(255, 215, 0, 1)' : 'rgba(0, 255, 255, 0.9)'
      ctx.arc(x, y, isIndex ? 4 : 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

onMounted(async () => {
  try {
    await enableCamera()
    // Ensure canvas matches video size
    resizeCanvasToVideo()
    await initializeHandTracking()
    await startTracking()
  } catch (e) {
    // Error is already set by useCamera; no-op
  }
  // Redraw on resize just in case
  window.addEventListener('resize', resizeCanvasToVideo)
})

onUnmounted(() => {
  stopCamera()
  stopTracking()
  window.removeEventListener('resize', resizeCanvasToVideo)
})

// Watch landmarks and redraw overlay
watch(landmarks, () => {
  resizeCanvasToVideo()
  drawHands()
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

.mini-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Mirror drawing to match video */
  transform: scaleX(-1);
}

.camera-error {
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
}
</style>
