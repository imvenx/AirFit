<template>
  <div class="tests-menu">
    <div class="menu-header">
      <div class="app-title">
        <q-btn outline color="white" size="lg" icon="arrow_back" label="Back" class="back-btn" @click="goBack" />
        <div class="title-text">Tests</div>
      </div>
    </div>

    <div class="games-container">
      <div class="games-grid">
        <div v-for="game in devGames" :key="game.id" class="game-card" :class="{ 'inactive': !game.isActive }"
          @click="game.isActive && selectGame(game.id)">
          <div class="game-icon">{{ game.icon }}</div>
          <div class="game-name">{{ game.name }}</div>
          <div v-if="game.isActive" class="game-max-score">
            <q-icon name="emoji_events" size="sm" />
            {{ $t('game.best') }}: {{ getMaxScore(game.id) }}
          </div>
          <div v-else class="coming-soon">
            <q-chip color="orange" text-color="white" icon="schedule" :label="$t('game.comingSoon')" />
          </div>
        </div>
      </div>

      <div v-if="devGames.length === 0" class="no-games">
        <q-icon name="science" size="4rem" color="grey" />
        <div class="text-h6 text-grey">No test games available</div>
      </div>
    </div>
  </div>
  
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useScores } from 'src/composables/useScores'
import { gameConfigs } from 'src/config/appConfig'

const router = useRouter()
const { getMaxScore } = useScores()

const devGames = computed(() => {
  return gameConfigs
    .filter(g => g.devOnly)
    .sort((a, b) => {
      if (a.isActive === b.isActive) return 0
      return a.isActive ? -1 : 1
    })
})

function selectGame(gameId: string) {
  router.push({ name: 'GameWithId', params: { gameId } })
}

function goBack() {
  router.push({ name: 'MainMenu' })
}
</script>

<style scoped>
.tests-menu {
  height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.menu-header {
  flex-shrink: 0;
  background: 
    linear-gradient(135deg, 
      rgba(106, 90, 205, 0.8) 0%, 
      rgba(142, 68, 173, 0.7) 25%,
      rgba(86, 70, 185, 0.75) 50%,
      rgba(106, 90, 205, 0.8) 75%,
      rgba(126, 87, 194, 0.7) 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 100;
  padding-bottom: 0.5rem;
  box-shadow: 
    0 2px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  z-index: 10;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.app-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding: 1.2rem 1rem;
}

.title-text {
  font-family: 'Fredoka', cursive;
  font-size: 1.8rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2),
    0 0 30px rgba(255, 255, 255, 0.2);
}

.games-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  text-align: center;
  position: relative;
  z-index: 10;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 900px) {
  .games-grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 800px;
  }
}

.game-card {
  position: relative;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.game-card.inactive {
  cursor: not-allowed;
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.1);
}

.game-icon { font-size: 3.5rem; margin-bottom: 0.3rem; }
.game-name { font-family: 'Fredoka', cursive; font-size: 1.1rem; font-weight: 600; color: #ffffff; }
.game-max-score { display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin-top: 0.2rem; color: #FFD700; font-weight: 600; font-size: 0.85rem; }

.no-games { text-align: center; padding: 4rem; color: rgba(255, 255, 255, 0.7); }

.back-btn {
  border-width: 2px;
  padding: 8px 16px;
}
</style>
