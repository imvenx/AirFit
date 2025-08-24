import { ref, computed } from 'vue'
import { GameConfig, GameState } from 'src/types/game'
import { appConfig } from 'src/config/appConfig'
import { useScores } from './useScores'

// Global game state - shared across all components
const gameState = ref<GameState>({
  currentGameId: null,
  isGameActive: false,
  score: 0,
  lives: 3,
  gameStartTime: null,
  gameEndTime: null
})

export function useGameFramework() {
  const { saveScore } = useScores()

  const currentGame = computed(() => {
    if (!gameState.value.currentGameId) return null
    return appConfig.value.games.find(game => game.id === gameState.value.currentGameId)
  })

  const isGameActive = computed(() => gameState.value.isGameActive)
  const score = computed(() => gameState.value.score)
  const lives = computed(() => gameState.value.lives)

  function startGame(gameId: string) {
    const game = appConfig.value.games.find(g => g.id === gameId)
    if (!game) {
      throw new Error(`Game with id ${gameId} not found`)
    }

    gameState.value = {
      currentGameId: gameId,
      isGameActive: true,
      score: 0,
      lives: 3,
      gameStartTime: Date.now(),
      gameEndTime: null
    }

    // Navigate to game
    appConfig.value.currentGameId = gameId
    appConfig.value.isGameMenuActive = false
  }

  function endGame() {
    gameState.value.isGameActive = false
    gameState.value.gameEndTime = Date.now()
    
    if (gameState.value.currentGameId) {
      saveScore(gameState.value.currentGameId, gameState.value.score)
    }
  }

  function returnToMenu() {
    gameState.value.currentGameId = null
    appConfig.value.currentGameId = null
    appConfig.value.isGameMenuActive = true
  }

  function updateScore(points: number) {
    gameState.value.score += points
  }

  function takeDamage(damage: number = 1) {
    gameState.value.lives -= damage
    
    if (gameState.value.lives <= 0) {
      endGame()
    }
  }

  function resetGame() {
    if (gameState.value.currentGameId) {
      startGame(gameState.value.currentGameId)
    }
  }

  function setCurrentGame(game: GameConfig) {
    gameState.value.currentGameId = game.id
    appConfig.value.currentGameId = game.id
  }

  function getGameDuration(): number {
    if (!gameState.value.gameStartTime) return 0
    const endTime = gameState.value.gameEndTime || Date.now()
    return Math.floor((endTime - gameState.value.gameStartTime) / 1000)
  }

  return {
    gameState,
    currentGame,
    isGameActive,
    score,
    lives,
    startGame,
    endGame,
    returnToMenu,
    updateScore,
    takeDamage,
    resetGame,
    setCurrentGame,
    getGameDuration
  }
}