<template>
  <div class="minimalist-loading">
    <!-- Background effects -->
    <component v-if="backgroundComponent" :is="backgroundComponent" />

    <div class="loading-content">
      <div class="game-title">{{ $t(`games.${gameConfig.id}.name`) }}</div>

      <div class="rules-section" v-if="gameConfig.rules">
        <div v-if="gameConfig.id === 'boxing-trainer'" class="boxing-animation">
          <object data="boxing_animation.svg" type="image/svg+xml" class="boxing-svg">
            <img src="boxing_animation.svg" alt="Boxing Animation" />
          </object>
        </div>
        <div v-else>
          <div class="rules-title">{{ $t('game.gameRules') }}</div>
          <div class="rules-list">
            <div v-for="(rule, index) in getRulesArray()" :key="index" class="rule-item">
              {{ rule }}
            </div>
          </div>
        </div>
      </div>

      <div class="loading-status">
        <div v-if="!isReady" class="loading-text">{{ $t('game.loadingText') }}</div>
      </div>

      <div class="action-section" v-if="showStartButton">
        <q-btn @click="$emit('start-game')" size="xl" outline :loading="isStarting" :disabled="!isReady"
          class="start-btn">
          {{ $t(gameConfig.startButtonText) }}
        </q-btn>

      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { GameConfig } from 'src/types/game'

export interface GameLoadingConfig {
  rules?: string[] | string
  backgroundComponent?: string
  loadingText?: string
  startButtonText?: string
}

interface Props {
  gameConfig: GameConfig & GameLoadingConfig
  isReady?: boolean
  isStarting?: boolean
  showStartButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReady: false,
  isStarting: false,
  showStartButton: false
})

defineEmits<{
  'start-game': []
}>()

const { t, tm } = useI18n()

const backgroundComponent = computed(() => {
  if (!props.gameConfig.backgroundComponent) return null

  const componentMap: Record<string, any> = {
    'BubblesBg': defineAsyncComponent(() => import('./BubblesBg.vue'))
  }

  return componentMap[props.gameConfig.backgroundComponent] || null
})

const getRulesArray = () => {
  if (!props.gameConfig.rules) return []

  // Handle the case where rules is a translation key like 'rules.bubble-bop'
  if (typeof props.gameConfig.rules === 'string') {
    try {
      const rulesKey = props.gameConfig.rules as string
      const keyParts = rulesKey.split('.')
      if (keyParts.length === 2 && keyParts[0] === 'rules') {
        const gameId = keyParts[1]
        // Use tm() to get the raw message object, then access the nested property
        const rulesObject = tm('rules') as any
        const rules = rulesObject ? rulesObject[gameId] : null
        console.log('Rules lookup result:', rules, 'for key:', props.gameConfig.rules)
        return Array.isArray(rules) ? rules : []
      }
    } catch (error) {
      console.error('Error getting rules:', error)
    }
  }

  // Fallback: treat as direct array
  return Array.isArray(props.gameConfig.rules) ? props.gameConfig.rules : []
}


</script>

<style scoped>
.minimalist-loading {
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
  text-align: center;
  color: white;
  max-width: 90vw;
  z-index: 10;
}


.game-title {
  font-family: 'Fredoka', cursive;
  font-size: 3rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: #ffffff;
  letter-spacing: 1px;
}

.rules-section {
  margin-bottom: 2rem;
  text-align: left;
}

.boxing-animation {
  text-align: center;
  margin: 2rem 0;
}

.boxing-svg {
  max-width: 300px;
  max-height: 200px;
  width: auto;
  height: auto;
}

.rules-title {
  font-family: 'Fredoka', cursive;
  font-size: 1.3rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.rules-list {
  max-height: 40vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.rule-item {
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  line-height: 1.5;
  color: #ffffff;
  font-weight: 500;
}

.loading-status {
  margin-bottom: 2rem;
}

.loading-text,
.ready-text {
  font-family: 'Fredoka', cursive;
  font-size: 1.4rem;
  margin-bottom: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.start-btn {
  font-size: 1.1rem;
  padding: 1rem 2rem;
  color: rgba(255, 255, 255, 0.9) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: none !important;
}

.start-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow: none !important;
}

.back-btn {
  font-size: 1rem;
  opacity: 0.8;
}

.back-btn:hover {
  opacity: 1;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .game-title {
    font-size: 2.5rem;
  }

  .rule-item {
    font-size: 1rem;
    margin-bottom: 0.6rem;
  }

  .loading-content {
    max-width: 95vw;
    padding: 1rem;
  }

  .rules-list {
    max-height: 30vh;
  }

  .start-btn {
    min-width: 160px;
    font-size: 1.1rem;
  }
}

@media (max-height: 600px) {
  .game-title {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .rules-section {
    margin-bottom: 1rem;
  }

  .loading-status {
    margin-bottom: 1rem;
  }

  .rules-list {
    max-height: 25vh;
  }

  .rule-item {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }
}
</style>
