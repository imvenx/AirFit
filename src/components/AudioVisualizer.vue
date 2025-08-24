<template>
  <canvas ref="visualizerCanvas" class="audio-visualizer"></canvas>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { musicManager } from 'src/utils/musicManager'

const visualizerCanvas = ref<HTMLCanvasElement>()

let animationFrameId: number | null = null
let canvasCtx: CanvasRenderingContext2D | null = null
let frameSkip = 0
let checkMusicInterval: number | null = null
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false

const props = defineProps<{
  enabled?: boolean
}>()

const isEnabled = ref(props.enabled !== false && !(isLowEndDevice && isMobile))

watch(() => props.enabled, (newVal) => {
  isEnabled.value = newVal !== false && !(isLowEndDevice && isMobile)
  if (isEnabled.value) {
    setTimeout(() => startVisualization(), 100)
  } else {
    stopVisualization()
  }
})

watch(() => isEnabled.value, (enabled) => {
  if (enabled) {
    setTimeout(() => startVisualization(), 100)
  } else {
    stopVisualization()
  }
})

onMounted(() => {
  if (isEnabled.value) {
    // Check for music every 500ms and start visualization when music is playing
    checkMusicInterval = window.setInterval(() => {
      const currentTrack = musicManager.getCurrentTrack()
      if (currentTrack && !animationFrameId) {
        startVisualization()
        if (checkMusicInterval) {
          clearInterval(checkMusicInterval)
          checkMusicInterval = null
        }
      }
    }, 500)
    
    // Also try to start immediately if music is already playing
    if (musicManager.getCurrentTrack()) {
      startVisualization()
      if (checkMusicInterval) {
        clearInterval(checkMusicInterval)
        checkMusicInterval = null
      }
    }
  }
})

onUnmounted(() => {
  stopVisualization()
  if (checkMusicInterval) {
    clearInterval(checkMusicInterval)
    checkMusicInterval = null
  }
})

function stopVisualization() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (checkMusicInterval) {
    clearInterval(checkMusicInterval)
    checkMusicInterval = null
  }
  // Clear the canvas when stopping
  if (canvasCtx && visualizerCanvas.value) {
    canvasCtx.clearRect(0, 0, visualizerCanvas.value.width, visualizerCanvas.value.height)
  }
}

function startVisualization() {
  const analyzer = musicManager.getAnalyzer()
  
  if (!visualizerCanvas.value) return
  
  const canvas = visualizerCanvas.value
  canvasCtx = canvas.getContext('2d', { 
    alpha: true,
    desynchronized: true
  })
  
  if (!canvasCtx) return
  
  function resizeCanvas() {
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    if (canvasCtx) {
      canvasCtx.scale(dpr, dpr)
    }
  }
  
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  function animate() {
    if (!canvasCtx || !canvas || !isEnabled.value) {
      // Clear canvas and stop if disabled
      if (canvasCtx && canvas) {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
      }
      stopVisualization()
      return
    }
    
    if (isMobile) {
      frameSkip++
      if (frameSkip % 2 !== 0) {
        animationFrameId = requestAnimationFrame(animate)
        return
      }
    }
    
    const frequencyData = analyzer.getFrequencyData()
    
    if (!frequencyData) {
      animationFrameId = requestAnimationFrame(animate)
      return
    }
    
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
    
    const barCount = isMobile ? 16 : 32
    const barWidth = window.innerWidth / barCount
    const barGap = isMobile ? 1 : 2
    
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * frequencyData.length / barCount)
      const barHeight = (frequencyData[dataIndex] / 255) * window.innerHeight * 0.7
      
      const hue = (i * 360 / barCount + Date.now() * 0.01) % 360
      const intensity = frequencyData[dataIndex] / 255
      
      if (isMobile) {
        canvasCtx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.4 + intensity * 0.3})`
      } else {
        const barGradient = canvasCtx.createLinearGradient(
          0, window.innerHeight - barHeight, 
          0, window.innerHeight
        )
        
        barGradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.2 + intensity * 0.3})`)
        barGradient.addColorStop(0.5, `hsla(${hue}, 80%, 50%, ${0.3 + intensity * 0.3})`)
        barGradient.addColorStop(1, `hsla(${hue}, 90%, 40%, ${0.4 + intensity * 0.3})`)
        
        canvasCtx.fillStyle = barGradient
      }
      
      const x = i * barWidth + barGap / 2
      const y = window.innerHeight - barHeight
      const width = barWidth - barGap
      
      if (isMobile) {
        canvasCtx.fillRect(x, y, width, barHeight)
      } else {
        canvasCtx.beginPath()
        canvasCtx.roundRect(x, y, width, barHeight, [5, 5, 0, 0])
        canvasCtx.fill()
      }
      
      if (!isMobile && intensity > 0.7) {
        canvasCtx.shadowBlur = 20
        canvasCtx.shadowColor = `hsla(${hue}, 100%, 50%, ${intensity * 0.5})`
        canvasCtx.fill()
        canvasCtx.shadowBlur = 0
      }
    }
    
    animationFrameId = requestAnimationFrame(animate)
  }
  
  setTimeout(() => {
    animate()
  }, 100)
}
</script>

<style scoped>
.audio-visualizer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
