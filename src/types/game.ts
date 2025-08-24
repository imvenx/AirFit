export interface GameConfig {
  id: string
  name: string
  description: string
  icon: string
  component: string
  requiresCamera: boolean
  requiresHandTracking: boolean
  requiresPoseTracking: boolean
  requiresGestureRecognition: boolean
  category: 'fitness' | 'puzzle' | 'action' | 'rehabilitation' | 'utility'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedDuration: number // in minutes
  isActive: boolean
  is3D?: boolean
  devOnly?: boolean
  // Loading screen configuration
  rules?: string[] | string
  backgroundComponent?: string
  loadingText?: string
  startButtonText?: string
  showBackButton?: boolean
}

export interface GameState {
  currentGameId: string | null
  isGameActive: boolean
  score: number
  lives: number
  gameStartTime: number | null
  gameEndTime: number | null
}

export interface GameResult {
  gameId: string
  score: number
  duration: number
  completed: boolean
  timestamp: number
}

export interface CameraConfig {
  width: number
  height: number
  aspectRatio: number
}

export interface MediaPipeConfig {
  modelsPath: string
  handLandmarkerPath: string
  poseLandmarkerPath: string
  gestureRecognizerPath: string
}