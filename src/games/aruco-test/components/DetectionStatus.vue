<template>
  <div class="detection-info">
    <div class="info-panel">
      <h3>Detection Status</h3>
      
      <div class="marker-status">
        <div 
          v-for="(detected, id) in detectedMarkers" 
          :key="id"
          :class="['status-item', { detected }]"
        >
          {{ getMarkerLabel(Number(id)) }} (ID:{{ id }}): {{ detected ? 'Detected' : 'Not found' }}
        </div>
      </div>
      
      <div v-if="screenBounds" class="bounds-info">
        <h4>Screen Bounds (pixels)</h4>
        <p>X: {{ Math.round(screenBounds.x) }}, Y: {{ Math.round(screenBounds.y) }}</p>
        <p>Width: {{ Math.round(screenBounds.width) }}, Height: {{ Math.round(screenBounds.height) }}</p>
      </div>
      
      <div v-if="handPosition" class="hand-info">
        <h4>Hand Position (%)</h4>
        <p>X: {{ Math.round(handPosition.x) }}%, Y: {{ Math.round(handPosition.y) }}%</p>
      </div>
      
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

interface HandPosition {
  x: number
  y: number
}

const props = defineProps<{
  detectedMarkers: Record<number, boolean>
  screenBounds: ScreenBounds | null
  handPosition: HandPosition | null
}>()

function getMarkerLabel(id: number): string {
  const labels = ['TL', 'TR', 'BL', 'BR']
  return labels[id] || 'Unknown'
}

// Debug logging
console.log('DetectionStatus props:', props)
</script>

<style scoped>
.detection-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  padding: 1.5rem;
  border-radius: 10px;
  min-width: 250px;
  color: white;
}

.info-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.marker-status {
  margin-bottom: 1rem;
}

.status-item {
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: rgba(255, 0, 0, 0.2);
  border-radius: 5px;
  border-left: 3px solid #ff0000;
}

.status-item.detected {
  background: rgba(0, 255, 0, 0.2);
  border-left-color: #00ff00;
}

.bounds-info, .hand-info {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 0, 0.1);
  border-radius: 5px;
}

.bounds-info h4, .hand-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.bounds-info p, .hand-info p {
  margin: 0.25rem 0;
  font-family: monospace;
}
</style>