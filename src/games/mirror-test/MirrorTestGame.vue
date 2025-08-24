<template>
  <div class="mirror-test-game">
    <canvas ref="canvasRef" class="game-canvas"></canvas>
    
    <CameraView ref="cameraViewRef" />
    
    <div class="game-ui">
      <div class="info">
        3D Mirror Test - Polygonal Body
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MirrorTestGameManager } from './MirrorTestGameManager'
import CameraView from 'src/components/CameraView.vue'

const canvasRef = ref<HTMLCanvasElement>()
const cameraViewRef = ref<InstanceType<typeof CameraView>>()

let gameManager: MirrorTestGameManager | null = null

onMounted(async () => {
  if (canvasRef.value) {
    gameManager = new MirrorTestGameManager(canvasRef.value)
    await gameManager.initialize()
    
    // Connect camera view after initialization
    setTimeout(() => {
      if (cameraViewRef.value && gameManager) {
        console.log('Connecting camera view to mirror test')
        gameManager.setCameraView(cameraViewRef.value)
      }
    }, 2000)
  }
})

onUnmounted(() => {
  gameManager?.cleanup()
})
</script>

<style scoped>
.mirror-test-game {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #2c3e50, #34495e);
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