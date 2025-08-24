<template>
  <div class="marker-display">
    <canvas ref="markerTL" class="marker top-left"></canvas>
    <canvas ref="markerTR" class="marker top-right"></canvas>
    <canvas ref="markerBL" class="marker bottom-left"></canvas>
    <canvas ref="markerBR" class="marker bottom-right"></canvas>
    
    <div class="center-info">
      <h2>ArUco Marker Display</h2>
      <p>Point camera at this screen to detect markers</p>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ArUcoMarkerGenerator } from '../ArUcoMarkerGenerator'

const markerTL = ref<HTMLCanvasElement | null>(null)
const markerTR = ref<HTMLCanvasElement | null>(null)
const markerBL = ref<HTMLCanvasElement | null>(null)
const markerBR = ref<HTMLCanvasElement | null>(null)

let generator: ArUcoMarkerGenerator

onMounted(() => {
  generator = new ArUcoMarkerGenerator()
  drawMarkers()
})

function drawMarkers() {
  nextTick(() => {
    const markerSize = 150
    
    const markers = [
      { canvas: markerTL, id: 0 },
      { canvas: markerTR, id: 1 },
      { canvas: markerBL, id: 2 },
      { canvas: markerBR, id: 3 }
    ]
    
    markers.forEach(({ canvas, id }) => {
      if (canvas.value) {
        const ctx = canvas.value.getContext('2d')!
        canvas.value.width = markerSize
        canvas.value.height = markerSize
        generator.drawMarker(ctx, id, 0, 0, markerSize)
      }
    })
  })
}

defineExpose({
  drawMarkers
})
</script>

<style scoped>
.marker-display {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

.marker {
  position: absolute;
}

.marker.top-left { top: 20px; left: 20px; }
.marker.top-right { top: 20px; right: 20px; }
.marker.bottom-left { bottom: 20px; left: 20px; }
.marker.bottom-right { bottom: 20px; right: 20px; }

.center-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 2rem;
  border-radius: 10px;
  color: white;
}
</style>