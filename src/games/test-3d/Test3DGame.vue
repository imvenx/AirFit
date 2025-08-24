<template>
  <div class="test-3d-game">
    <canvas ref="canvasRef" class="babylon-canvas"></canvas>
    
    <!-- Camera view in bottom left -->
    <div class="camera-view">
      <video ref="videoRef" class="camera-video" autoplay muted playsinline></video>
      <canvas ref="landmarksCanvasRef" class="landmarks-overlay"></canvas>
    </div>
    
    <div class="game-ui">
      <div class="score-display">3D Test Scene</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Test3DGameManager } from './Test3DGameManager'
import { useCamera } from 'src/composables/useCamera'
import { usePoseTracking } from 'src/composables/usePoseTracking'

const canvasRef = ref<HTMLCanvasElement>()
const videoRef = ref<HTMLVideoElement>()
const landmarksCanvasRef = ref<HTMLCanvasElement>()

let gameManager: Test3DGameManager | null = null

const { enableCamera, stopCamera } = useCamera(videoRef)
const { initializePoseTracking, startTracking, stopTracking, landmarks } = usePoseTracking(videoRef, landmarksCanvasRef)

onMounted(async () => {
  try {
    // Initialize camera
    await enableCamera()
    
    // Initialize pose tracking
    await initializePoseTracking()
    await startTracking()
    
    // Initialize 3D scene
    if (canvasRef.value) {
      gameManager = new Test3DGameManager(canvasRef.value)
      await gameManager.initialize()
      gameManager.startGame()
      
      // Pass pose landmarks to game manager for character animation
      gameManager.setPoseLandmarks(landmarks)
    }
  } catch (error) {
    console.error('Failed to initialize test 3D game:', error)
  }
})

onUnmounted(() => {
  if (gameManager) {
    gameManager.cleanup()
    gameManager = null
  }
  
  stopCamera()
  stopTracking()
})
</script>

<style scoped>
.test-3d-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.babylon-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
  cursor: grab;
}

.babylon-canvas:active {
  cursor: grabbing;
}

.camera-view {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  width: 200px;
  height: 150px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
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

.game-ui {
  position: absolute;
  top: 2rem;
  left: 2rem;
  z-index: 100;
  pointer-events: none;
}

.score-display {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.5rem;
  font-weight: bold;
  backdrop-filter: blur(10px);
}

@media (max-width: 600px) {
  .game-ui {
    top: 1rem;
    left: 1rem;
  }
  
  .score-display {
    padding: 0.75rem 1.5rem;
    font-size: 1.25rem;
  }
  
  .camera-view {
    bottom: 1rem;
    left: 1rem;
    width: 150px;
    height: 112px;
  }
}
</style>