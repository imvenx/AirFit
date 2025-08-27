<template>
  <div class="table-break-game">
    <div v-if="!showLoadingScreen" class="game-ui">
      <div class="score-display">
        🥋 Tables Broken: {{ brokenTablesCount }}
      </div>
      <div class="timer-display" :class="{ low: timeRemaining <= 10, bump: timerBump, gain: timerGain }">
        ⏱️ {{ formattedTime }}
      </div>
    </div>

    <div v-if="!showLoadingScreen" class="debug-panel">
      <div>Left Hand on Table: {{ leftHandOnTable }}</div>
      <div>Right Hand on Table: {{ rightHandOnTable }}</div>
    </div>

    <div class="game-area">
      <MinimalistGameLoading v-if="showLoadingScreen" :game-config="gameConfig" :is-ready="isGameReady"
        :show-start-button="isGameReady" @start-game="startActualGame" />
      <GameOver v-if="isGameOver" @restart="resetGame" @menu="returnToMenu" />

      <video ref="videoEl" autoplay playsinline
        style="transform: rotateY(180deg); position: absolute; width: 100%; height: 100%; object-fit: contain;" />

      <canvas ref="canvasEl"
        style="transform: rotateY(180deg); position: absolute; width: 100%; height: 100%; object-fit: contain;" />

      <!-- Floating +seconds bonuses -->
      <div v-for="bonus in timeBonuses" :key="bonus.id" class="time-bonus"
           :style="{ left: bonus.left, top: bonus.top }">
        +{{ bonus.amount }}s
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCamera } from 'src/composables/useCamera'
import { useHandTracking } from 'src/composables/useHandTracking'
import { usePoseTracking } from 'src/composables/usePoseTracking'
import { useGameFramework } from 'src/composables/useGameFramework'
import { musicManager } from 'src/utils/musicManager'
import MinimalistGameLoading from 'src/components/MinimalistGameLoading.vue'
import GameOver from 'src/components/GameOver.vue'
import { getGameById } from 'src/config/appConfig'
import tableImageUrl from 'src/assets/images/table.png'
import tableBrokenImageUrl from 'src/assets/images/table-broken.png'

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const router = useRouter()
const camera = useCamera(videoEl)
const handTracking = useHandTracking(videoEl, canvasEl, 2)
const poseTracking = usePoseTracking(videoEl, canvasEl)
const gameFramework = useGameFramework()

const showLoadingScreen = ref(true)
const isGameReady = ref(false)
const isGameOver = ref(false)
const leftHandOnTable = ref(false)
const rightHandOnTable = ref(false)
const tableX = ref(0)
const tableY = ref(50)
const isTablePickedUp = ref(false)
const showExplosion = ref(false)
const explosionX = ref(0)
const explosionY = ref(0)
const brokenTablesCount = ref(0)
const tableImage = ref<HTMLImageElement | null>(null)
const tableBrokenImage = ref<HTMLImageElement | null>(null)

const gameConfig = computed(() => getGameById('table-break')!)

// Timer state
const startingTime = 30
const timeRemaining = ref(startingTime)
const timerBump = ref(false)
const timerGain = ref(false)
const formattedTime = computed(() => {
  const t = Math.max(0, Math.ceil(timeRemaining.value))
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

// Floating time bonus notifications
let bonusId = 1
const timeBonuses = ref<{ id: number; left: string; top: string; amount: number }[]>([])

onMounted(async () => {
  try {
    // Load table images
    tableImage.value = new Image()
    tableImage.value.src = tableImageUrl
    
    tableBrokenImage.value = new Image()
    tableBrokenImage.value.src = tableBrokenImageUrl
    
    await camera.enableCamera()
    await handTracking.initializeHandTracking()
    await poseTracking.initializePoseTracking()

    if (videoEl.value && canvasEl.value) {
      const { videoWidth, videoHeight } = videoEl.value
      canvasEl.value.width = videoWidth
      canvasEl.value.height = videoHeight
    }

    await handTracking.startTracking()
    await poseTracking.startTracking()
    isGameReady.value = true

  } catch (error) {
    console.error('Failed to initialize table break game:', error)
  }
})

function startActualGame() {
  showLoadingScreen.value = false
  gameFramework.startGame('table-break')
  musicManager.play('table-break')

  // Initialize table position
  if (canvasEl.value) {
    tableX.value = (canvasEl.value.width - 300) / 2
  }
  // Reset state
  timeRemaining.value = startingTime
  isGameOver.value = false

  startGameLoop()
}

function startGameLoop() {
  let lastTs: number | null = null
  const gameLoop = (ts: number) => {
    if (!gameFramework.isGameActive.value) return

    // Update timer
    if (lastTs === null) lastTs = ts
    const dt = (ts - lastTs) / 1000
    lastTs = ts
    timeRemaining.value -= dt
    if (timeRemaining.value <= 0) {
      timeRemaining.value = 0
      endGame()
      return
    }

    checkHandsOnTable()
    checkKneeCollision()
    drawTable()
    drawLandmarks()
    requestAnimationFrame(gameLoop)
  }

  requestAnimationFrame(gameLoop)
}

function checkHandsOnTable() {
  if (!canvasEl.value) return

  const poseLandmarks = poseTracking.landmarks.value
  if (poseLandmarks.length === 0) return

  let tableWidth = 300
  let tableHeight = 100
  
  // Use actual table dimensions if image is loaded
  if (tableImage.value && tableImage.value.complete) {
    const imageAspect = tableImage.value.naturalWidth / tableImage.value.naturalHeight
    tableWidth = 300
    tableHeight = tableWidth / imageAspect
  }

  // Get wrist landmarks (15 = left wrist, 16 = right wrist)
  const leftWrist = poseLandmarks[15]
  const rightWrist = poseLandmarks[16]

  if (leftWrist) {
    const leftX = leftWrist.x * canvasEl.value.width
    const leftY = leftWrist.y * canvasEl.value.height
    leftHandOnTable.value = leftX >= tableX.value && leftX <= tableX.value + tableWidth &&
      leftY >= tableY.value && leftY <= tableY.value + tableHeight
  }

  if (rightWrist) {
    const rightX = rightWrist.x * canvasEl.value.width
    const rightY = rightWrist.y * canvasEl.value.height
    rightHandOnTable.value = rightX >= tableX.value && rightX <= tableX.value + tableWidth &&
      rightY >= tableY.value && rightY <= tableY.value + tableHeight
  }

  // Check if we should pick up the table (both hands just touched)
  if (leftHandOnTable.value && rightHandOnTable.value && !isTablePickedUp.value) {
    isTablePickedUp.value = true
  }

  // If table is picked up, move it to follow hands regardless of whether they're still "on" table
  if (isTablePickedUp.value && leftWrist && rightWrist) {
    const leftX = leftWrist.x * canvasEl.value.width
    const leftY = leftWrist.y * canvasEl.value.height
    const rightX = rightWrist.x * canvasEl.value.width
    const rightY = rightWrist.y * canvasEl.value.height

    // Calculate center point between both hands
    const centerX = (leftX + rightX) / 2
    const centerY = (leftY + rightY) / 2

    // Position table centered on hands
    tableX.value = centerX - tableWidth / 2
    tableY.value = centerY - tableHeight / 2
  }
}

function checkKneeCollision() {
  if (!canvasEl.value || !isTablePickedUp.value) return

  const poseLandmarks = poseTracking.landmarks.value
  if (poseLandmarks.length === 0) return

  let tableWidth = 300
  let tableHeight = 100
  
  // Use actual table dimensions if image is loaded
  if (tableImage.value && tableImage.value.complete) {
    const imageAspect = tableImage.value.naturalWidth / tableImage.value.naturalHeight
    tableWidth = 300
    tableHeight = tableWidth / imageAspect
  }

  // Get knee landmarks (25 = left knee, 26 = right knee)
  const leftKnee = poseLandmarks[25]
  const rightKnee = poseLandmarks[26]

  let collision = false

  if (leftKnee) {
    const kneeX = leftKnee.x * canvasEl.value.width
    const kneeY = leftKnee.y * canvasEl.value.height

    if (kneeX >= tableX.value && kneeX <= tableX.value + tableWidth &&
      kneeY >= tableY.value && kneeY <= tableY.value + tableHeight) {
      collision = true
    }
  }

  if (rightKnee) {
    const kneeX = rightKnee.x * canvasEl.value.width
    const kneeY = rightKnee.y * canvasEl.value.height

    if (kneeX >= tableX.value && kneeX <= tableX.value + tableWidth &&
      kneeY >= tableY.value && kneeY <= tableY.value + tableHeight) {
      collision = true
    }
  }

  if (collision) {
    destroyAndCreateNewTable()
  }
}

function destroyAndCreateNewTable() {
  // Increment broken tables counter
  brokenTablesCount.value++
  // Keep global score in sync (used by GameOver)
  gameFramework.updateScore(1)

  // Time bonus per break: +3s for first 10s, +2s for next 10s, then +1s
  const elapsed = gameFramework.getGameDuration()
  const bonus = elapsed < 10 ? 3 : elapsed < 20 ? 2 : 1
  timeRemaining.value += bonus

  // Trigger timer bump animation
  timerBump.value = false
  requestAnimationFrame(() => { timerBump.value = true })
  setTimeout(() => { timerBump.value = false }, 250)

  // Temporary gain color state
  timerGain.value = true
  setTimeout(() => { timerGain.value = false }, 350)

  // Spawn floating bonus text at table center
  if (canvasEl.value) {
    const cw = canvasEl.value.width
    const ch = canvasEl.value.height
    const leftPct = ((explosionX.value / cw) * 100).toFixed(2) + '%'
    const topPct = ((explosionY.value / ch) * 100).toFixed(2) + '%'
    const id = bonusId++
    timeBonuses.value.push({ id, left: leftPct, top: topPct, amount: bonus })
    // Remove after animation completes
    setTimeout(() => {
      timeBonuses.value = timeBonuses.value.filter(b => b.id !== id)
    }, 900)
  }

  // Play table break sound
  const breakSound = new Audio('table-break.mp3')
  breakSound.volume = 0.35
  breakSound.play().catch(console.warn)

  // Show explosion at table center
  let tableWidth = 300
  let tableHeight = 100
  
  // Use actual table dimensions if image is loaded
  if (tableImage.value && tableImage.value.complete) {
    const imageAspect = tableImage.value.naturalWidth / tableImage.value.naturalHeight
    tableWidth = 300
    tableHeight = tableWidth / imageAspect
  }
  
  explosionX.value = tableX.value + tableWidth / 2 // table center
  explosionY.value = tableY.value + tableHeight / 2
  showExplosion.value = true

  // Hide explosion after short time
  setTimeout(() => {
    showExplosion.value = false
  }, 300)

  // Immediately reset table to original position
  if (canvasEl.value) {
    tableX.value = (canvasEl.value.width - 300) / 2
    tableY.value = 50
  }

  // Reset pickup state immediately
  isTablePickedUp.value = false
  leftHandOnTable.value = false
  rightHandOnTable.value = false
}

function drawTable() {
  if (!canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height)

  // Draw table image with preserved aspect ratio
  let tableWidth = 300
  let tableHeight = 100

  if (tableImage.value && tableImage.value.complete) {
    // Calculate proper dimensions maintaining aspect ratio
    const imageAspect = tableImage.value.naturalWidth / tableImage.value.naturalHeight
    tableWidth = 300
    tableHeight = tableWidth / imageAspect
    
    ctx.drawImage(tableImage.value, tableX.value, tableY.value, tableWidth, tableHeight)
  } else {
    // Fallback to drawn table if image not loaded
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(tableX.value, tableY.value, tableWidth, tableHeight)
    
    ctx.strokeStyle = '#654321'
    ctx.lineWidth = 3
    ctx.strokeRect(tableX.value, tableY.value, tableWidth, tableHeight)
  }

  // Draw broken table animation
  if (showExplosion.value && tableBrokenImage.value && tableBrokenImage.value.complete) {
    // Calculate proper dimensions maintaining aspect ratio for broken table
    const brokenImageAspect = tableBrokenImage.value.naturalWidth / tableBrokenImage.value.naturalHeight
    const brokenTableWidth = 300
    const brokenTableHeight = brokenTableWidth / brokenImageAspect
    
    ctx.save()
    ctx.translate(explosionX.value, explosionY.value)
    ctx.rotate(Math.PI) // 180 degrees
    ctx.drawImage(tableBrokenImage.value, -brokenTableWidth/2, -brokenTableHeight/2, brokenTableWidth, brokenTableHeight)
    ctx.restore()
  }
}

function drawLandmarks() {
  if (!canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')
  if (!ctx) return

  const poseLandmarks = poseTracking.landmarks.value
  if (poseLandmarks.length === 0) return

  // Draw wrists (hands)
  const leftWrist = poseLandmarks[15]  // Left wrist
  const rightWrist = poseLandmarks[16] // Right wrist

  if (leftWrist) {
    const x = leftWrist.x * canvasEl.value.width
    const y = leftWrist.y * canvasEl.value.height

    ctx.beginPath()
    ctx.arc(x, y, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#FF0000' // Red for left hand
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  if (rightWrist) {
    const x = rightWrist.x * canvasEl.value.width
    const y = rightWrist.y * canvasEl.value.height

    ctx.beginPath()
    ctx.arc(x, y, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#00FF00' // Green for right hand
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Draw knees
  const leftKnee = poseLandmarks[25]   // Left knee
  const rightKnee = poseLandmarks[26]  // Right knee

  if (leftKnee) {
    const x = leftKnee.x * canvasEl.value.width
    const y = leftKnee.y * canvasEl.value.height

    ctx.beginPath()
    ctx.arc(x, y, 10, 0, 2 * Math.PI)
    ctx.fillStyle = '#FF00FF' // Magenta for left knee
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  if (rightKnee) {
    const x = rightKnee.x * canvasEl.value.width
    const y = rightKnee.y * canvasEl.value.height

    ctx.beginPath()
    ctx.arc(x, y, 10, 0, 2 * Math.PI)
    ctx.fillStyle = '#00FFFF' // Cyan for right knee
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

onUnmounted(() => {
  camera.stopCamera()
  handTracking.stopTracking()
  poseTracking.stopTracking()
  musicManager.stop()
})

// Show overlay when game ends
watch(() => gameFramework.isGameActive.value, (isActive) => {
  if (!isActive) {
    isGameOver.value = true
  }
})

function endGame() {
  if (!gameFramework.isGameActive.value) return
  gameFramework.endGame()
  musicManager.play('menu')
}

function resetGame() {
  isGameOver.value = false
  brokenTablesCount.value = 0
  gameFramework.resetGame()
  musicManager.play('table-break')
  startActualGame()
}

function returnToMenu() {
  musicManager.play('menu')
  gameFramework.returnToMenu()
  router.push({ name: 'MainMenu' })
}

</script>

<style scoped>
.table-break-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  z-index: 10;
}

.score-display {
  font-family: 'Fredoka', cursive;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  background: rgba(139, 69, 19, 0.4);
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
  padding: 1rem 2rem;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.timer-display {
  position: absolute;
  right: 2rem;
  top: 1.2rem;
  font-family: 'Fredoka', cursive;
  font-size: clamp(1.8rem, 3.2vw, 3rem);
  line-height: 1;
  font-weight: 800;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  border: 4px solid rgba(255, 255, 255, 0.3);
  padding: 0.6rem 1.2rem;
  border-radius: 18px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.6);
  transform-origin: center;
  transition: transform 120ms ease-out, background 200ms ease;
}

.timer-display.low {
  animation: timerPulse 1s infinite;
  background: rgba(180, 20, 20, 0.45);
  border-color: rgba(255, 90, 90, 0.6);
}

.timer-display.bump {
  transform: scale(1.08);
}

.timer-display.gain {
  background: rgba(0, 128, 64, 0.45);
  border-color: rgba(0, 255, 157, 0.7);
  box-shadow: 0 8px 28px rgba(0, 255, 157, 0.35);
}

.debug-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  z-index: 100;
  font-size: 0.8rem;
}

.game-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.time-bonus {
  position: absolute;
  z-index: 50;
  transform: translate(-50%, -50%);
  color: #00ff9d;
  font-family: 'Fredoka', cursive;
  font-weight: 900;
  font-size: clamp(2.4rem, 4.4vw, 4rem);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 255, 157, 0.75);
  animation: floatUp 0.9s ease-out forwards;
  pointer-events: none;
}

@keyframes floatUp {
  0% { opacity: 0; transform: translate(-50%, -20%); }
  10% { opacity: 1; transform: translate(-50%, -40%); }
  100% { opacity: 0; transform: translate(-50%, -120%); }
}

@keyframes timerPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 6px 24px rgba(255, 0, 0, 0.25); }
  50% { transform: scale(1.05); box-shadow: 0 8px 28px rgba(255, 0, 0, 0.45); }
}
</style>
