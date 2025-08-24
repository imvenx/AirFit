import { ref, computed } from 'vue'
import { LocalStorage } from 'quasar'

const SCORES_KEY = 'game-scores'

interface GameScore {
  gameId: string
  score: number
  timestamp: number
}

const scores = ref<GameScore[]>(LocalStorage.getItem(SCORES_KEY) || [])

export function useScores() {
  function saveScore(gameId: string, score: number) {
    const newScore: GameScore = {
      gameId,
      score,
      timestamp: Date.now()
    }

    scores.value.push(newScore)
    LocalStorage.setItem(SCORES_KEY, scores.value)
  }

  function getMaxScore(gameId: string): number {
    const gameScores = scores.value.filter(s => s.gameId === gameId)
    return gameScores.length > 0 ? Math.max(...gameScores.map(s => s.score)) : 0
  }

  function getAllScores() {
    return scores.value
  }

  function clearScores() {
    scores.value = []
    LocalStorage.setItem(SCORES_KEY, [])
  }

  return {
    saveScore,
    getMaxScore,
    getAllScores,
    clearScores,
    scores: computed(() => scores.value)
  }
}