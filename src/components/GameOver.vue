<template>
    <div class="game-over-overlay">
        <div class="game-over-modal">
            <div class="text-h2 gameOverText">
                {{ $t('game.gameOver') }}
            </div>
            <div class="score-section">
                <div class="text-h4 score-row">
                    {{ $t('game.score') }}: <b class="score-current"> {{ currentScore }} </b>
                </div>
                <div class="text-h4 score-row">
                    {{ $t('game.best') }}: <b class="score-best"> {{ highestScore }} </b>
                </div>
            </div>
            <div class="button-section">
                <q-btn class="game-over-btn" @click="$emit('restart')" color="secondary">{{ $t('game.restart') }}</q-btn>
                <q-btn class="game-over-btn" @click="$emit('menu')" outline color="white" text-color="white">{{ $t('game.menu') }}</q-btn>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { LocalStorage } from 'quasar'
import { useGameFramework } from 'src/composables/useGameFramework'
import { onMounted, ref, computed } from 'vue'

// Props
defineProps<{
  score?: number
}>()

// Emits
defineEmits<{
  restart: []
  menu: []
}>()

const gameFramework = useGameFramework()
const highestScore = ref(0)

const currentScore = computed(() => gameFramework.score.value)

onMounted(() => {
  highestScore.value = (LocalStorage.getItem('highestScore') as number) || 0
  
  // Update highest score if current score is higher
  if (currentScore.value > highestScore.value) {
    highestScore.value = currentScore.value
    LocalStorage.setItem('highestScore', highestScore.value)
  }
})

</script>

<style scoped>
.game-over-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0,0,0,.4);
}

.game-over-modal {
    max-width: 90%;
    max-height: 90vh;
    background-color: rgba(0,0,0,.8);
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    display: grid;
    gap: 1.5rem;
    overflow-y: auto;
}

.gameOverText {
    font-size: 4rem;
    color: brown !important;
    text-align: center;
    margin: 0;
}

.score-section {
    display: grid;
    gap: 0.8rem;
    width: 100%;
    margin: auto;
}

.score-row {
    width: 100%;
    display: grid;
    grid-template-columns: max-content min-content;
    justify-content: space-between;
    color: white !important;
}

.score-current {
    color: gold;
}

.score-best {
    color: burlywood;
}

.button-section {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    flex-wrap: wrap;
}

.game-over-btn {
    font-weight: 600 !important;
    min-width: 120px;
}

/* Portrait orientation */
@media (orientation: portrait) {
    .gameOverText {
        font-size: 3.5rem;
    }
    
    .game-over-modal {
        padding: 1.5rem;
    }
}

/* Landscape mobile - tight height */
@media (orientation: landscape) and (max-height: 500px) {
    .game-over-modal {
        padding: 1rem;
        gap: 1rem;
        max-height: 85vh;
    }
    
    .gameOverText {
        font-size: 2.2rem;
    }
    
    .text-h4 {
        font-size: 1rem !important;
    }
    
    .game-over-btn {
        padding: 6px 12px !important;
        font-size: 0.9rem !important;
        min-width: 100px;
    }
    
    .score-section {
        gap: 0.5rem;
    }
}

/* Very small mobile screens */
@media (max-width: 600px) {
    .gameOverText {
        font-size: 2.8rem;
    }
    
    .text-h4 {
        font-size: 1.1rem !important;
    }
    
    .game-over-modal {
        padding: 1.2rem;
    }
}

/* Extra small landscape (very tight) */
@media (orientation: landscape) and (max-height: 400px) {
    .game-over-modal {
        padding: 0.8rem;
        gap: 0.6rem;
    }
    
    .gameOverText {
        font-size: 1.8rem;
    }
    
    .text-h4 {
        font-size: 0.9rem !important;
    }
    
    .game-over-btn {
        padding: 4px 8px !important;
        font-size: 0.8rem !important;
        min-width: 80px;
    }
    
    .button-section {
        gap: 0.5rem;
    }
}
</style>