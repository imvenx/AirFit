<template>
  <div class="boxing-game">
    <div v-if="!showLoadingScreen" class="game-ui">
      <div class="score-display">
        {{ $t('game.score') }}: {{ score }}
      </div>
      <div class="combo-display">
        {{ $t('game.combo') }}: {{ combo }}x
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
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCamera } from 'src/composables/useCamera'
import { usePoseTracking } from 'src/composables/usePoseTracking'
import { useGameFramework } from 'src/composables/useGameFramework'
import { useOrientationHandler } from 'src/composables/useOrientationHandler'
import { musicManager } from 'src/utils/musicManager'
import { BoxingGameManager } from './BoxingGameManager'
import MinimalistGameLoading from 'src/components/MinimalistGameLoading.vue'
import GameOver from 'src/components/GameOver.vue'
import Heart from 'src/components/Heart.vue'
import { getGameById } from 'src/config/appConfig'

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const router = useRouter()
const { t } = useI18n()
const camera = useCamera(videoEl)
const poseTracking = usePoseTracking(videoEl, canvasEl)
const gameFramework = useGameFramework()

function refreshCanvasOnOrientationChange() {
  if (boxingGameManager && videoEl.value && canvasEl.value) {
    const { videoWidth, videoHeight } = videoEl.value
    const scaleFactor = 4
    canvasEl.value.width = videoWidth * scaleFactor
    canvasEl.value.height = videoHeight * scaleFactor

    const ctx = canvasEl.value.getContext('2d')
    if (ctx) {
      ctx.scale(scaleFactor, scaleFactor)
    }

    boxingGameManager.updateDimensions({
      width: videoWidth,
      height: videoHeight
    })
  }
}

const orientationHandler = useOrientationHandler(videoEl, canvasEl, refreshCanvasOnOrientationChange)

const showLoadingScreen = ref(true)
const isGameReady = ref(false)
const isGameOver = ref(false)
const combo = ref(0)
const lives = ref(3)
const initialLives = ref(3)
const lastCombo = ref(0)

let boxingGameManager: BoxingGameManager | null = null

const score = computed(() => gameFramework.score.value)
const gameConfig = computed(() => getGameById('boxing-trainer')!)

onMounted(async () => {
  try {
    // Initialize camera and pose tracking
    await camera.enableCamera()
    await poseTracking.initializePoseTracking()

    // Set up canvas dimensions with higher resolution for better shape definition
    if (videoEl.value && canvasEl.value) {
      const { videoWidth, videoHeight } = videoEl.value
      // Scale up canvas resolution for sharper shapes
      const scaleFactor = 4
      canvasEl.value.width = videoWidth * scaleFactor
      canvasEl.value.height = videoHeight * scaleFactor

      // Scale the drawing context to match
      const ctx = canvasEl.value.getContext('2d')
      if (ctx) {
        ctx.scale(scaleFactor, scaleFactor)
      }
    }

    // Initialize game manager (but don't start yet)
    const canvasCtx = canvasEl.value?.getContext('2d')
    if (canvasCtx && videoEl.value) {
      // Use original video dimensions for game logic, scaled canvas is handled internally
      const { videoWidth, videoHeight } = videoEl.value
      boxingGameManager = new BoxingGameManager(canvasCtx, {
        width: videoWidth || 640,
        height: videoHeight || 480
      }, t('game.dodge'))
    }

    // Start pose tracking
    await poseTracking.startTracking()

    isGameReady.value = true

  } catch (error) {
    // Game initialization failed silently
  }
})

function startActualGame() {
  showLoadingScreen.value = false
  gameFramework.startGame('boxing-trainer')
  musicManager.play('boxing')
  
  // Play boxing bells sound effect
  const bellsSound = new Audio('/boxing-bells.mp3')
  bellsSound.volume = 0.7
  bellsSound.play().catch(console.warn)
  
  startGameLoop()
}

function handleScoreChange(event: Event) {
  const customEvent = event as CustomEvent
  const basePoints = customEvent.detail?.changeBy || 0

  if (basePoints > 0) {
    const totalPoints = basePoints + combo.value
    gameFramework.updateScore(totalPoints)
    combo.value++
  }
}

function handleComboReset() {
  combo.value = 0
}

function handleLivesChange(event: Event) {
  const customEvent = event as CustomEvent
  lives.value = customEvent.detail?.lives || 0
}

function handleGameOver(event: Event) {
  const customEvent = event as CustomEvent
  if (customEvent.detail?.reason === 'lives') {
    endGame()
  }
}

function handleFloatingText(event: Event) {
  const customEvent = event as CustomEvent
  const { text, x, y, color, fontSize, basePoints } = customEvent.detail

  let displayText = text
  if (basePoints !== undefined) {
    if (combo.value > 0) {
      const totalPoints = basePoints + combo.value
      displayText = `+${totalPoints}(+${combo.value})`
    } else {
      displayText = `+${basePoints}`
    }
  }

  boxingGameManager?.addFloatingText(displayText, x, y, color, fontSize)
}

onMounted(() => {
  window.addEventListener('scoreChange', handleScoreChange)
  window.addEventListener('livesChange', handleLivesChange)
  window.addEventListener('gameOver', handleGameOver)
  window.addEventListener('addFloatingText', handleFloatingText)
  window.addEventListener('comboReset', handleComboReset)
})

onUnmounted(() => {
  window.removeEventListener('scoreChange', handleScoreChange)
  window.removeEventListener('livesChange', handleLivesChange)
  window.removeEventListener('gameOver', handleGameOver)
  window.removeEventListener('addFloatingText', handleFloatingText)
  window.removeEventListener('comboReset', handleComboReset)


  camera.stopCamera()
  poseTracking.stopTracking()
  boxingGameManager?.cleanup()
})


function startGameLoop() {
  if (!boxingGameManager) return

  const gameLoop = (timestamp: number) => {
    if (!gameFramework.isGameActive.value) return

    const poseLandmarks = poseTracking.landmarks.value
    const boxingLandmarks = poseTracking.getBoxingLandmarks()

    if (boxingLandmarks.length > 0) {
      boxingGameManager?.update(timestamp, boxingLandmarks, poseLandmarks)
    } else {
      boxingGameManager?.update(timestamp, [], poseLandmarks)
    }

    requestAnimationFrame(gameLoop)
  }

  boxingGameManager.startGame()
  requestAnimationFrame(gameLoop)
}


function endGame() {
  isGameOver.value = true
  boxingGameManager?.pauseGame()
  musicManager.play('menu')
  gameFramework.endGame()

}

function resetGame() {
  isGameOver.value = false
  combo.value = 0
  lastCombo.value = 0
  lives.value = 3
  gameFramework.resetGame()
  boxingGameManager?.resetGame()
  musicManager.play('boxing')
  
  // Play boxing bells sound effect
  const bellsSound = new Audio('/boxing-bells.mp3')
  bellsSound.volume = 0.7
  bellsSound.play().catch(console.warn)
  
  startGameLoop()
}

function returnToMenu() {
  musicManager.play('menu')
  gameFramework.returnToMenu()
  router.push({ name: 'MainMenu' })
}
</script>

<style scoped>
.boxing-game {
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
  align-items: flex-start;
  padding: 2rem;
  z-index: 10;
  flex-wrap: wrap;
  gap: 1rem;
}

@media (orientation: portrait) {
  .game-ui {
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 0.5rem;
  }

  .game-ui>* {
    margin: 0;
  }
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

.combo-display {
  font-family: 'Fredoka', cursive;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 165, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 165, 0, 0.3);
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
}

.lives-display {
  display: flex;
  gap: 0.5rem;
  background: rgba(244, 67, 54, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(244, 67, 54, 0.3);
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
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
</style>