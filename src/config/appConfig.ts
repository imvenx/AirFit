import { ref } from 'vue'
import { GameConfig, MediaPipeConfig } from 'src/types/game'

export const mediaPipeConfig: MediaPipeConfig = {
  modelsPath: '/models/tasks-vision@0.10.18',
  handLandmarkerPath: '/models/hand_landmarker.task',
  poseLandmarkerPath: '/models/pose_landmarker.task',
  gestureRecognizerPath: '/models/gesture_recognizer.task'
}

export const gameConfigs: GameConfig[] = [
  {
    id: 'boxing-trainer',
    name: 'Boxing Trainer',
    description: 'Punch boxing bags with speed and precision!',
    icon: '🥊',
    component: 'BoxingGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'fitness',
    difficulty: 'medium',
    estimatedDuration: 3,
    isActive: true,
    // Loading screen configuration
    rules: 'rules.boxing-trainer',
    loadingText: 'Setting up camera and pose tracking...',
    startButtonText: 'game.startTraining',
    showBackButton: true
  },
  {
    id: 'bubble-bop',
    name: 'Bubble Bop',
    description: 'Pop bubbles using hand gestures in this fun AR game!',
    icon: '🫧',
    component: 'BubbleBopGame',
    requiresCamera: true,
    requiresHandTracking: true,
    requiresPoseTracking: false,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'easy',
    estimatedDuration: 5,
    isActive: true,
    // Loading screen configuration
    rules: 'rules.bubble-bop',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and hand tracking...',
    startButtonText: 'game.startPopping',
    showBackButton: true
  },
  {
    id: 'snowboard',
    name: 'Snowboard',
    description: 'Control your snowboarder with body movements!',
    icon: '🏂',
    component: 'SnowboardGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'medium',
    estimatedDuration: 5,
    isActive: false,
    // Loading screen configuration
    rules: 'rules.snowboard',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and pose tracking...',
    startButtonText: 'game.startSnowboarding',
    showBackButton: true
  },
  {
    id: 'archer',
    name: 'Archery',
    description: 'Aim and shoot targets with gesture-based archery!',
    icon: '🏹',
    component: 'ArcherGame',
    requiresCamera: true,
    requiresHandTracking: true,
    requiresPoseTracking: false,
    requiresGestureRecognition: true,
    category: 'action',
    difficulty: 'hard',
    estimatedDuration: 5,
    isActive: false,
    // Loading screen configuration
    rules: 'rules.archer',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and hand tracking...',
    startButtonText: 'game.startArchery',
    showBackButton: true
  },
  {
    id: 'ski',
    name: 'Ski',
    description: 'Ski down the slopes with body movements!',
    icon: '⛷️',
    component: 'SkiGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'medium',
    estimatedDuration: 5,
    isActive: false,
    rules: 'rules.ski',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and pose tracking...',
    startButtonText: 'game.startSkiing',
    showBackButton: true
  },
  {
    id: 'table-break',
    name: 'Table Break',
    description: 'Break boards with powerful strikes!',
    icon: '🥋',
    component: 'TableBreakGame',
    requiresCamera: true,
    requiresHandTracking: true,
    requiresPoseTracking: false,
    requiresGestureRecognition: true,
    category: 'fitness',
    difficulty: 'hard',
    estimatedDuration: 3,
    isActive: true,
    rules: 'rules.table-break',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and hand tracking...',
    startButtonText: 'game.startBreaking',
    showBackButton: true
  },
  {
    id: 'zombies',
    name: 'Zombies',
    description: 'Survive the zombie apocalypse!',
    icon: '🧟',
    component: 'ZombiesGame',
    requiresCamera: true,
    requiresHandTracking: true,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'hard',
    estimatedDuration: 5,
    isActive: false,
    rules: 'rules.zombies',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and tracking...',
    startButtonText: 'game.startSurviving',
    showBackButton: true
  },
  {
    id: 'runner',
    name: 'Runner',
    description: 'Run and jump through obstacles!',
    icon: '🏃',
    component: 'RunnerGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'fitness',
    difficulty: 'easy',
    estimatedDuration: 5,
    isActive: false,
    rules: 'rules.runner',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and pose tracking...',
    startButtonText: 'game.startRunning',
    showBackButton: true
  },
  {
    id: 'test-3d',
    name: 'Test 3D',
    description: 'Test 3D scene with a rectangle',
    icon: '🎮',
    component: 'Test3DGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'easy',
    estimatedDuration: 2,
    isActive: true,
    is3D: true,
    devOnly: true,
    rules: 'rules.test-3d',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and hand tracking...',
    startButtonText: 'game.start3DTest',
    showBackButton: true
  },
  {
    id: 'mirror-test',
    name: 'Mirror Test',
    description: 'Test 3D mirror with polygonal body shapes',
    icon: '🪞',
    component: 'MirrorTestGame',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: true,
    requiresGestureRecognition: false,
    category: 'action',
    difficulty: 'easy',
    estimatedDuration: 2,
    isActive: true,
    is3D: true,
    devOnly: true,
    rules: 'rules.mirror-test',
    backgroundComponent: 'BubblesBg',
    loadingText: 'Setting up camera and pose tracking...',
    startButtonText: 'game.startMirrorTest',
    showBackButton: true
  },
  {
    id: 'test-sound',
    name: 'Test Sound',
    description: 'Audio testing utility',
    icon: '🔊',
    component: 'TestSound',
    requiresCamera: false,
    requiresHandTracking: false,
    requiresPoseTracking: false,
    requiresGestureRecognition: false,
    category: 'utility',
    difficulty: 'easy',
    estimatedDuration: 1,
    isActive: true,
    devOnly: true,
    rules: 'Test audio playback on different devices',
    loadingText: 'Loading audio test...',
    startButtonText: 'Start Test',
    showBackButton: true
  },
  {
    id: 'auvi-grid-test',
    name: 'Auvi Grid Test',
    description: 'Grid-based audio visual testing',
    icon: '🎯',
    component: 'AuviGridTest',
    requiresCamera: false,
    requiresHandTracking: false,
    requiresPoseTracking: false,
    requiresGestureRecognition: false,
    category: 'utility',
    difficulty: 'easy',
    estimatedDuration: 2,
    isActive: true,
    devOnly: true,
    rules: 'Test grid-based audio visual interactions',
    loadingText: 'Loading grid test...',
    startButtonText: 'Start Grid Test',
    showBackButton: true
  },
  {
    id: 'aruco-test',
    name: 'Aruco Test',
    description: 'ArUco marker detection testing',
    icon: '🎲',
    component: 'ArucoTest',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: false,
    requiresGestureRecognition: false,
    category: 'utility',
    difficulty: 'easy',
    estimatedDuration: 2,
    isActive: true,
    devOnly: true,
    rules: 'Test ArUco marker detection and tracking',
    loadingText: 'Loading ArUco test...',
    startButtonText: 'Start ArUco Test',
    showBackButton: true
  },
  {
    id: 'test2-aruco2',
    name: 'Test2 ArUco2',
    description: 'Test2 ArUco2 game',
    icon: '🎯',
    component: 'Test2Aruco2',
    requiresCamera: true,
    requiresHandTracking: false,
    requiresPoseTracking: false,
    requiresGestureRecognition: false,
    category: 'utility',
    difficulty: 'easy',
    estimatedDuration: 2,
    isActive: true,
    devOnly: true,
    rules: 'Test2 ArUco2 rules',
    loadingText: 'Loading Test2 ArUco2...',
    startButtonText: 'Start Test2 ArUco2',
    showBackButton: true
  }
]

export const appConfig = ref({
  currentGameId: null as string | null,
  isGameMenuActive: true,
  games: gameConfigs,
  devMode: import.meta.env.DEV && !import.meta.env.VITE_PREVIEW_MODE
})

// Helper functions
export function getGameById(id: string): GameConfig | undefined {
  return gameConfigs.find(game => game.id === id)
}

export function getActiveGames(): GameConfig[] {
  return gameConfigs.filter(game => {
    if (game.devOnly && !appConfig.value.devMode) return false
    return game.isActive
  })
}

export function getVisibleGames(): GameConfig[] {
  return gameConfigs.filter(game => {
    // Hide dev-only games in production
    if (game.devOnly && !appConfig.value.devMode) return false
    return true
  })
}

export function getGamesByCategory(category: string): GameConfig[] {
  return gameConfigs.filter(game => game.category === category && game.isActive)
}