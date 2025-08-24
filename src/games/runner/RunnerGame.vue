<template>
  <div class="runner-game">
    <canvas ref="canvasRef" class="game-canvas"></canvas>
    
    <CameraView ref="cameraViewRef" />
    
    <div class="game-ui">
      <div class="info">
        Runner Game - Move your body to run!
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RunnerGameManager } from './RunnerGameManager'
import CameraView from 'src/components/CameraView.vue'

const canvasRef = ref<HTMLCanvasElement>()
const cameraViewRef = ref<InstanceType<typeof CameraView>>()

let gameManager: RunnerGameManager | null = null

onMounted(async () => {
  if (canvasRef.value) {
    gameManager = new RunnerGameManager(canvasRef.value)
    await gameManager.initialize()
    
    // Wait a bit for camera view to initialize, then connect game manager
    setTimeout(() => {
      if (cameraViewRef.value && gameManager) {
        console.log('Connecting game manager to camera view')
        
        // Pass the camera view component itself so game manager can access fresh landmarks each frame
        gameManager.setCameraView(cameraViewRef.value)
      }
    }, 2000) // Wait 2 seconds for camera to initialize
  }
})

onUnmounted(() => {
  gameManager?.cleanup()
})
</script>

<style scoped>
.runner-game {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #87CEEB, #98FB98);
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.game-ui {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-family: Arial, sans-serif;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
}

.info {
  font-size: 18px;
  font-weight: bold;
}
</style>