<template>
  <div class="main-menu">
    <div class="menu-header">
      <a class="gh-link" href="https://github.com/imvenx/airfit" target="_blank" rel="noopener noreferrer">
        <q-btn round dense outline color="white" :size="$q.screen.lt.md ? 'sm' : 'md'" icon="img:github.svg" aria-label="GitHub" />
      </a>
      <div class="app-title">
        <div class="title-text">{{ $t('app.title') }}</div>
        <div class="header-actions">
          <q-btn v-if="canInstall && !installed" outline color="white" size="sm" icon="download" label="Install"
            class="install-btn" @click="installApp" />

          <q-btn outline color="white" :size="$q.screen.lt.md ? 'md' : 'lg'" class="lang-btn"
                 @click="langMenu = !langMenu" @mouseenter="langMenu = true">
            <q-icon name="language" :size="$q.screen.lt.md ? 'md' : 'lg'" class="q-mr-sm" />
            <span class="gt-xs">{{ (locale as string).toUpperCase() }}</span>
            <q-tooltip>Language</q-tooltip>
            <q-menu v-model="langMenu" anchor="bottom right" self="top right" @mouseleave="langMenu = false">
              <q-list separator>
                <q-item v-for="opt in langOptions" :key="opt.value" clickable v-close-popup @click="switchLanguage(opt.value)">
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section side>
                    <q-icon v-if="opt.value === locale" name="check" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
    </div>

    <div class="games-container">
      <div class="games-grid">
        <div v-for="game in mainGames" :key="game.id" class="game-card" :class="{ 'inactive': !game.isActive }"
          @click="game.isActive && selectGame(game.id)">
          <div class="game-icon">{{ game.icon }}</div>
          <div class="game-name">{{ $t(`games.${game.id}.name`) }}</div>
          <div v-if="game.isActive" class="game-max-score">
            <q-icon name="emoji_events" size="sm" />
            {{ $t('game.best') }}: {{ getMaxScore(game.id) }}
          </div>
          <div v-else class="coming-soon">
            <q-chip color="orange" text-color="white" icon="schedule" :label="$t('game.comingSoon')" />
          </div>
        </div>

        <div v-if="hasDevGames" class="game-card" @click="goToTests">
          <div class="game-icon">🧪</div>
          <div class="game-name">Tests</div>
          <div class="game-max-score">
            <q-icon name="folder" size="sm" />
            Dev utilities and experiments
          </div>
        </div>
      </div>

      <div v-if="mainGames.length === 0 && !hasDevGames" class="no-games">
        <q-icon name="games" size="4rem" color="grey" />
        <div class="text-h6 text-grey">{{ $t('game.noGames') }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useScores } from 'src/composables/useScores'
import { useI18n } from 'vue-i18n'
import { getVisibleGames, gameConfigs } from 'src/config/appConfig'
import { usePWAInstall } from 'src/composables/usePWAInstall'

const router = useRouter()
const { getMaxScore } = useScores()
const { locale } = useI18n()
const { canInstall, installed, promptInstall } = usePWAInstall()
const langMenu = ref(false)

const langOptions = [
  { label: 'EN', value: 'en' },
  { label: 'ES', value: 'es' },
  { label: 'FR', value: 'fr' },
  { label: 'PT', value: 'pt' },
  { label: 'DE', value: 'de' },
  { label: 'JA', value: 'ja' },
  { label: 'KO', value: 'ko' },
  { label: 'HI', value: 'hi' }
]

function switchLanguage(lang: string) {
  localStorage.setItem('preferred-language', lang)
  locale.value = lang
}

const mainGames = computed(() => {
  // Show only non-dev games here; dev tests moved under Tests menu
  return getVisibleGames()
    .filter(g => !g.devOnly)
    .sort((a, b) => {
      if (a.isActive === b.isActive) return 0
      return a.isActive ? -1 : 1
    })
})

const hasDevGames = computed(() => gameConfigs.some(g => g.devOnly))

function selectGame(gameId: string) {
  router.push({ name: 'GameWithId', params: { gameId } })
}

function goToTests() {
  router.push({ name: 'TestsMenu' })
}

async function installApp() {
  try { await promptInstall() } catch {}
}

</script>

<style scoped>
.main-menu {
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

.menu-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 45%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.1) 55%,
      transparent 100%);
  animation: headerReflex 8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes headerReflex {

  0%,
  80% {
    left: -100%;
  }

  95% {
    left: 100%;
  }

  100% {
    left: 100%;
  }
}

.app-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
}

.games-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  text-align: center;
  position: relative;
  z-index: 10;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.install-btn {
  border-width: 2px;
}

.lang-btn {
  border-width: 2px;
}

.gh-link {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
}

.title-text {
  font-family: 'Fredoka', cursive;
  font-size: 2.2rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  position: relative;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2),
    0 0 30px rgba(255, 255, 255, 0.2);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
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

.game-card.inactive:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.coming-soon {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0.2rem;
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.game-card:hover {
  transform: translateY(-8px) scale(1.02);
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(0, 255, 255, 0.6);
  box-shadow:
    0 20px 40px rgba(0, 255, 255, 0.2),
    0 0 20px rgba(0, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.game-card:hover::before {
  left: 100%;
}

.game-icon {
  font-size: 3.5rem;
  margin-bottom: 0.3rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.game-name {
  font-family: 'Fredoka', cursive;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.3rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}



.game-max-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  margin-top: 0.2rem;
  color: #FFD700;
  font-weight: 600;
  font-size: 0.85rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}


.no-games {
  text-align: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.7);
}

.language-toggle {
  flex-shrink: 0;
}

@media (orientation: portrait) {
  .title-text {
    font-size: 1.8rem;
  }

  .games-grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 600px;
  }

  .app-title {
    flex-direction: column;
    gap: 0.8rem;
  }

  .menu-header {
    padding: 1rem;
  }

}

@media (max-width: 600px) {
  .title-text {
    font-size: 2.5rem;
  }

  .game-card {
    padding: 1rem;
  }
}
</style>
