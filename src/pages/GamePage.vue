<template>
  <div class="game-page">
    <div v-if="!currentGame" class="game-error">
      <div class="error-content">
        <q-icon name="error" size="4rem" color="red" />
        <div class="text-h4">No game selected</div>
        <q-btn @click="goToMenu" color="primary" size="lg">
          Return to Menu
        </q-btn>
      </div>
    </div>

    <div v-else class="game-container">
      <component :is="currentGameComponent" />
    </div>

    <div v-if="currentGame" class="game-controls">
      <q-btn @click="goToMenu" icon="home" round size="xl" outline class="control-button" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameFramework } from 'src/composables/useGameFramework'
import { getGameById } from 'src/config/appConfig'

const router = useRouter()
const route = useRoute()
const gameFramework = useGameFramework()


const currentGame = computed(() => {
  const gameId = route.params.gameId as string
  if (gameId) {
    const game = getGameById(gameId)
    if (game && game.isActive) {
      // Set the game in framework if found via route
      gameFramework.setCurrentGame(game)
      return game
    }
  }
  return gameFramework.currentGame.value
})

// Redirect to menu if no valid game found
if (!currentGame.value) {
  router.push({ name: 'MainMenu' })
}

const currentGameComponent = computed(() => {
  if (!currentGame.value || !currentGame.value.isActive) return null

  // Dynamic component loading based on game configuration
  const componentMap: Record<string, any> = {
    'BubbleBopGame': defineAsyncComponent(() => import('src/games/bubble-bop/BubbleBopGame.vue')),
    'BoxingGame': defineAsyncComponent(() => import('src/games/boxing-trainer/BoxingGame.vue')),
    'SnowboardGame': defineAsyncComponent(() => import('src/games/snowboard/SnowboardGame.vue')),
    'TableBreakGame': defineAsyncComponent(() => import('src/games/table-break/TableBreakGame.vue')),
    'Test3DGame': defineAsyncComponent(() => import('src/games/test-3d/Test3DGame.vue')),
    'RunnerGame': defineAsyncComponent(() => import('src/games/runner/RunnerGame.vue')),
    'MirrorTestGame': defineAsyncComponent(() => import('src/games/mirror-test/MirrorTestGame.vue')),
    'TestSound': defineAsyncComponent(() => import('src/games/test-sound/TestSound.vue')),
    'AuviGridTest': defineAsyncComponent(() => import('src/games/auvi-grid-test/AuviGridTest.vue')),
    'ArucoTest': defineAsyncComponent(() => import('src/games/aruco-test/ArUcoTestSplitScreen.vue')),
    'Test2Aruco2': defineAsyncComponent(() => import('src/games/test2-aruco2/Test2Aruco2.vue')),
    'PointerTest': defineAsyncComponent(() => import('src/games/pointer-test/PointerTest.vue'))
  }

  return componentMap[currentGame.value.component] || null
})

function goToMenu() {
  gameFramework.returnToMenu()
  router.push({ name: 'MainMenu' })
}


</script>

<style scoped>
.game-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.game-error {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.error-content {
  text-align: center;
  color: white;
}

.error-content .text-h4 {
  margin: 1rem 0 2rem 0;
  color: white;
}

.game-container {
  width: 100%;
  height: 100%;
}

.game-controls {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.control-button {
  color: rgba(255, 255, 255, .7);
}

@media (max-width: 600px) {
  .game-controls {
    bottom: 1rem;
    right: 1rem;
    gap: 0.8rem;
  }

  .control-button {
    transform: scale(0.8);
  }
}
</style>
