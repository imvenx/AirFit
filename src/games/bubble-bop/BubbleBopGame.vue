<template>
  <div class="bubble-bop-game">
    <div v-if="!showLoadingScreen" class="game-ui">
      <div class="score-display">
        {{ $t('game.score') }}: {{ score }}
      </div>
      <div class="lives-display">
        <Heart v-for="(life, i) in initialLives" :key="i" :is-filled="i < lives" />
      </div>
    </div>

    <div class="game-area">
      <MinimalistGameLoading v-if="showLoadingScreen" :game-config="gameConfig" :is-ready="isGameReady"
        :show-start-button="isGameReady" @start-game="startActualGame" />
      <GameOver v-if="isGameOver" @restart="resetGame" @menu="returnToMenu" />

      <video ref="videoEl" autoplay playsinline :class="{ 'blur': isGameOver }"
        style="transform: rotateY(180deg); position: absolute; width: 100%; height: 100%; object-fit: contain;" />

      <canvas ref="canvasEl" :class="{ 'blur': isGameOver }"
        style="transform: rotateY(180deg); position: absolute; width: 100%; height: 100%; object-fit: contain;" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'
import { useGameFramework } from 'src/composables/useGameFramework'
import { useOrientationHandler } from 'src/composables/useOrientationHandler'
import { musicManager } from 'src/utils/musicManager'
import { BubbleBopGameManager } from './BubbleBopGameManager'
import MinimalistGameLoading from 'src/components/MinimalistGameLoading.vue'
import GameOver from 'src/components/GameOver.vue'
import Heart from 'src/components/Heart.vue'
import { getGameById } from 'src/config/appConfig'

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const router = useRouter()
const camera = useCamera(videoEl)
const handTracking = useHandTracking(videoEl, canvasEl, 10) // Allow multiple players
const gameFramework = useGameFramework()

function refreshCanvasOnOrientationChange() {
  if (bubbleBopManager && videoEl.value && canvasEl.value) {
    const { videoWidth, videoHeight } = videoEl.value
    bubbleBopManager.updateDimensions({
      width: videoWidth,
      height: videoHeight
    })
  }
}

const orientationHandler = useOrientationHandler(videoEl, canvasEl, refreshCanvasOnOrientationChange)

const showLoadingScreen = ref(true)
const isGameReady = ref(false)
const isGameOver = ref(false)
const initialLives = ref(3)

let bubbleBopManager: BubbleBopGameManager | null = null

const score = computed(() => gameFramework.score.value)
const lives = computed(() => gameFramework.lives.value)
const gameConfig = computed(() => getGameById('bubble-bop')!)

onMounted(async () => {
  try {
    // Initialize camera and hand tracking
    await camera.enableCamera()
    await handTracking.initializeHandTracking()

    // Set up canvas dimensions
    if (videoEl.value && canvasEl.value) {
      const { videoWidth, videoHeight } = videoEl.value
      canvasEl.value.width = videoWidth
      canvasEl.value.height = videoHeight
    }

    // Initialize game manager (but don't start yet)
    const canvasCtx = canvasEl.value?.getContext('2d')
    if (canvasCtx) {
      bubbleBopManager = new BubbleBopGameManager(canvasCtx, {
        width: canvasEl.value?.width || 640,
        height: canvasEl.value?.height || 480
      })
    }

    // Start hand tracking
    await handTracking.startTracking()

    isGameReady.value = true

  } catch (error) {
    console.error('Failed to initialize game:', error)
  }
})

function startActualGame() {
  showLoadingScreen.value = false
  gameFramework.startGame('bubble-bop')
  musicManager.play('bubble-bop')
  startGameLoop()
}

// Event handlers
function handlePlayerDamage(event: Event) {
  const customEvent = event as CustomEvent
  const damage = customEvent.detail?.damage || 1
  gameFramework.takeDamage(damage)

  // Screen shake effect
  const gameArea = document.querySelector('.game-area')
  if (gameArea) {
    gameArea.classList.add('shake')
    setTimeout(() => {
      gameArea.classList.remove('shake')
    }, 300)
  }
}

function handleScoreChange(event: Event) {
  const customEvent = event as CustomEvent
  const points = customEvent.detail?.changeBy || 0
  gameFramework.updateScore(points)
}

onMounted(() => {
  // Add event listeners
  window.addEventListener('playerTakeDamage', handlePlayerDamage)
  window.addEventListener('scoreChange', handleScoreChange)
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('playerTakeDamage', handlePlayerDamage)
  window.removeEventListener('scoreChange', handleScoreChange)

  camera.stopCamera()
  handTracking.stopTracking()
  bubbleBopManager?.cleanup()
})

// Watch for game over state
watch(() => gameFramework.isGameActive.value, (isActive) => {
  if (!isActive) {
    isGameOver.value = true
    bubbleBopManager?.pauseGame()
    musicManager.play('bubble-bop')
  }
})


function startGameLoop() {
  if (!bubbleBopManager) return

  const gameLoop = (timestamp: number) => {
    if (!gameFramework.isGameActive.value) return

    // Get all landmarks and fingertips for collision detection
    const allLandmarks = handTracking.landmarks.value
    const fingertips = handTracking.getFingertipLandmarks()

    // Pass all landmarks for drawing, fingertips for collision
    if (allLandmarks.length > 0) {
      const flatLandmarks = allLandmarks.flat()
      bubbleBopManager?.update(timestamp, fingertips)
      // Draw fingertips manually
      drawFingertips(flatLandmarks)
    } else {
      bubbleBopManager?.update(timestamp, [])
    }

    requestAnimationFrame(gameLoop)
  }

  bubbleBopManager.startGame()
  requestAnimationFrame(gameLoop)
}

function drawFingertips(landmarks: any[]) {
  if (!canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')
  if (!ctx) return

  // Draw fingertips over the game canvas
  for (let i = 0; i < landmarks.length; i += 21) {
    const handLandmarks = landmarks.slice(i, i + 21)
    const fingertips = handLandmarks.filter((_, index) => [8, 12, 16, 20].includes(index))

    fingertips.forEach((landmark: any) => {
      const x = landmark.x * canvasEl.value!.width
      const y = landmark.y * canvasEl.value!.height

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = '#FF0000'
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = '#FF0000'
      ctx.stroke()
    })
  }
}

function resetGame() {
  isGameOver.value = false
  gameFramework.resetGame()
  bubbleBopManager?.resetGame()
  musicManager.play('bubble-bop')
  startGameLoop()
}

function returnToMenu() {
  musicManager.play('menu')
  gameFramework.returnToMenu()
  router.push({ name: 'MainMenu' })
}

</script>

<style scoped>
.bubble-bop-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  z-index: 10;
}


.score-display {
  font-family: 'Fredoka', cursive;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
}

.lives-display {
  display: flex;
  gap: 0.5rem;
}

.game-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.blur {
  filter: blur(20px);
  transition: filter 0.3s ease;
}

@keyframes shake {

  0%,
  100% {
    transform: translate(0, 0);
  }

  20% {
    transform: translate(-0.5rem, 0.5rem);
  }

  40% {
    transform: translate(0.5rem, -0.5rem);
  }

  60% {
    transform: translate(-0.5rem, 0.5rem);
  }

  80% {
    transform: translate(0.5rem, -0.5rem);
  }
}

.shake {
  animation: shake 0.3s ease-in-out;
  border: 0.5rem solid red;
}
</style>