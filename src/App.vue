<template>
  <div style="height: 100%; position: relative;">
    <router-view />
    <AudioVisualizer :enabled="visualizerEnabled" />
  </div>
  <ARWarning />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ARWarning from './components/ARWarning.vue';
import AudioVisualizer from './components/AudioVisualizer.vue';
import { musicManager } from './utils/musicManager';

defineOptions({
  name: 'App'
});

const route = useRoute();
const visualizerEnabled = ref(
  localStorage.getItem('visualizerEnabled') !== 'false'
)

// Watch route changes to manage music
watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'MainMenu') {
    const currentTrack = musicManager.getCurrentTrack()
    if (currentTrack !== 'menu') {
      musicManager.play('menu')
    }
    visualizerEnabled.value = localStorage.getItem('visualizerEnabled') !== 'false'
  }
  // Don't disable immediately on GameWithId route - wait for actual game start
}, { immediate: true })

onMounted(async () => {
  setVH()
  window.addEventListener('resize', setVH)

  // Check music track every 500ms to detect when game music starts
  const musicCheckInterval = window.setInterval(() => {
    const currentTrack = musicManager.getCurrentTrack()
    const currentRoute = route.name

    if (currentRoute === 'GameWithId') {
      if (currentTrack && currentTrack !== 'menu') {
        // Any game music is playing, disable visualizer
        visualizerEnabled.value = false
      } else if (currentTrack === 'menu') {
        // Menu music is playing (loading screen or game over), enable visualizer per preference
        visualizerEnabled.value = localStorage.getItem('visualizerEnabled') !== 'false'
      }
    }
  }, 500)
})

function setVH() {
  const vh = window.innerHeight;
  document.body.style.height = vh + 'px'
}

</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Press+Start+2P&display=swap');

:root {
  --app-bg-color: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

* {
  font-family: 'Fredoka', cursive;
}

body {
  overflow: hidden;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

#q-app {
  height: 100%;
}

/* Global button styles */
.q-btn {
  font-family: 'Fredoka', cursive !important;
  font-weight: 500 !important;
  text-transform: none !important;
  border-radius: 12px !important;
}

.q-btn--outline {
  border-width: 2px !important;
}

/* Global chip styles */
.q-chip {
  font-family: 'Fredoka', cursive !important;
  border-radius: 20px !important;
}
</style>
