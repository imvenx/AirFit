<template>
  <div class="game-loading-screen">
    <!-- Background effects (customizable per game) -->
    <component v-if="backgroundComponent" :is="backgroundComponent" />

    <div class="loading-content">
      <div class="game-info">
        <div class="game-icon">{{ gameConfig.icon }}</div>
        <div class="game-title">{{ gameConfig.name }}</div>
        <div class="game-description">{{ gameConfig.description }}</div>
      </div>

      <div class="game-rules" v-if="gameConfig.rules && gameConfig.rules.length > 0">
        <h3>How to Play:</h3>
        <ul>
          <li v-for="rule in gameConfig.rules" :key="rule">{{ rule }}</li>
        </ul>
      </div>

      <div class="loading-section">
        <div class="loading-text">{{ loadingText }}</div>
        <q-linear-progress v-if="showProgress" :value="progress" color="primary" class="loading-bar" />
        <q-spinner-dots v-else color="primary" size="2rem" />
      </div>

      <div class="action-buttons" v-if="showStartButton">
        <q-btn @click="$emit('start-game')" color="primary" size="xl" :loading="isStarting" :disabled="!isReady">
          {{ startButtonText }}
        </q-btn>
        <q-btn v-if="showBackButton" @click="$emit('back-to-menu')" color="secondary" size="lg" outline>
          Back to Menu
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'
import { GameConfig } from 'src/types/game'

export interface GameLoadingConfig {
  rules?: string[]
  backgroundComponent?: string
  loadingText?: string
  startButtonText?: string
  showBackButton?: boolean
}

interface Props {
  gameConfig: GameConfig & GameLoadingConfig
  isReady?: boolean
  isStarting?: boolean
  showProgress?: boolean
  progress?: number
  showStartButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReady: false,
  isStarting: false,
  showProgress: false,
  progress: 0,
  showStartButton: false
})

defineEmits<{
  'start-game': []
  'back-to-menu': []
}>()

const backgroundComponent = computed(() => {
  if (!props.gameConfig.backgroundComponent) return null

  const componentMap: Record<string, any> = {
    'BubblesBg': defineAsyncComponent(() => import('./BubblesBg.vue'))
  }

  return componentMap[props.gameConfig.backgroundComponent] || null
})

const loadingText = computed(() => {
  if (!props.isReady) return props.gameConfig.loadingText || 'Loading game...'
  return 'Ready to play!'
})

const startButtonText = computed(() => {
  return props.gameConfig.startButtonText || 'Start Game'
})

const showBackButton = computed(() => {
  return props.gameConfig.showBackButton !== false
})
</script>

<style scoped>
.game-loading-screen {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
}

.loading-content {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 3rem;
  max-width: 600px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 10;
}

.game-info {
  margin-bottom: 2rem;
}

.game-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.game-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.game-description {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 1rem;
}

.game-rules {
  text-align: left;
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.game-rules h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.game-rules ul {
  list-style: none;
  padding: 0;
}

.game-rules li {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  color: #555;
}

.game-rules li:last-child {
  border-bottom: none;
}

.game-rules li::before {
  content: "";
  margin-right: 0;
}

.loading-section {
  margin-bottom: 2rem;
}

.loading-text {
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 1rem;
}

.loading-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}


@media (max-width: 600px) {
  .loading-content {
    padding: 2rem;
    margin: 1rem;
  }

  .game-icon {
    font-size: 3rem;
  }

  .game-title {
    font-size: 2rem;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>