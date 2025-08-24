<template>
  <div class="auvi-grid-test-container">
    <h1>Auvi Grid Test</h1>
    <p>Empty test game</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { musicManager } from 'src/utils/musicManager'

let previousTrack: string | null = null

onMounted(() => {
  console.log('AuviGridTest mounted')
  previousTrack = musicManager.getCurrentTrack()
  musicManager.stop()
})

onUnmounted(() => {
  if (previousTrack) {
    musicManager.play(previousTrack as any)
  }
})
</script>

<style scoped>
.auvi-grid-test-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a1a;
  color: white;
}
</style>