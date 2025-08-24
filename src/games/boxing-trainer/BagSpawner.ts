import { BoxingBag, HeavyBag, BAG_POSITIONS } from './BoxingBag'

export class BagSpawner {
  private bags: BoxingBag[] = []
  private lastBagSpawn: number = 0
  private initialBagSpawnInterval: number = 2000 // Start at 2 seconds
  private minBagSpawnInterval: number = 1200 // Minimum 1.2 seconds
  private gameStartTime: number = 0
  
  // Difficulty progression constants
  private readonly DIFFICULTY_RAMP_DURATION_SECONDS: number = 240 // 4 minutes
  private readonly INITIAL_ACTIVE_TIME_MS: number = 3000 // 3 seconds
  private readonly MIN_ACTIVE_TIME_MS: number = 1500 // 1.5 seconds
  private readonly INITIAL_ANIMATION_DURATION_MS: number = 500 // 0.5 seconds
  private readonly MIN_ANIMATION_DURATION_MS: number = 250 // 0.25 seconds

  constructor(
    private gameWidth: number,
    private gameHeight: number,
    private onBagDestroyed: (isTimeout: boolean) => void
  ) { }

  startGame() {
    this.gameStartTime = Date.now()
    this.lastBagSpawn = Date.now()
    this.bags = []
  }

  reset() {
    this.bags = []
    this.lastBagSpawn = 0
    this.gameStartTime = 0
  }

  update(deltaTime: number) {
    const now = Date.now()
    const currentSpawnInterval = this.getCurrentBagSpawnInterval()
    if (now - this.lastBagSpawn > currentSpawnInterval) {
      this.spawnBag()
      this.lastBagSpawn = now
    }

    this.bags.forEach(bag => bag.update(deltaTime))
  }

  private getCurrentBagSpawnInterval(): number {
    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const progressRatio = Math.min(gameTimeSeconds / this.DIFFICULTY_RAMP_DURATION_SECONDS, 1)
    return this.initialBagSpawnInterval - (this.initialBagSpawnInterval - this.minBagSpawnInterval) * progressRatio
  }

  private getDifficultyParams() {
    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const progressRatio = Math.min(gameTimeSeconds / this.DIFFICULTY_RAMP_DURATION_SECONDS, 1)

    return {
      activeTime: this.INITIAL_ACTIVE_TIME_MS - ((this.INITIAL_ACTIVE_TIME_MS - this.MIN_ACTIVE_TIME_MS) * progressRatio),
      animationDuration: this.INITIAL_ANIMATION_DURATION_MS - ((this.INITIAL_ANIMATION_DURATION_MS - this.MIN_ANIMATION_DURATION_MS) * progressRatio)
    }
  }

  checkCollisions(landmarks: any[], velocity: number): void {
    this.bags.forEach(bag => {
      if (bag.isActive && bag.checkCollision(landmarks, this.gameWidth, this.gameHeight)) {
        bag.onHit(velocity)
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.bags.forEach(bag => bag.draw(ctx))
  }

  private spawnBag() {
    this.bags = this.bags.filter(bag => bag.isActive)

    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const maxBags = this.getMaxBagsForDifficulty(gameTimeSeconds)

    if (this.bags.length >= maxBags) return

    const numBagsToSpawn = this.getBagsToSpawn(gameTimeSeconds)
    const bagsToSpawn = Math.min(numBagsToSpawn, maxBags - this.bags.length)

    this.spawnMultipleBags(bagsToSpawn)
  }

  private getMaxBagsForDifficulty(gameTimeSeconds: number): number {
    if (gameTimeSeconds < 15) return 1
    if (gameTimeSeconds < 30) return 2
    return 3
  }

  private getBagsToSpawn(gameTimeSeconds: number): number {
    if (gameTimeSeconds < 15) return 1
    if (gameTimeSeconds < 30) return Math.random() < 0.7 ? 1 : 2
    return Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3
  }

  private spawnMultipleBags(count: number) {
    const usedPositions = new Set(this.bags.map(bag => bag.positionIndex))
    const availablePositions = BAG_POSITIONS.map((_, index) => index)
      .filter(index => !usedPositions.has(index))

    const difficultyParams = this.getDifficultyParams()

    for (let i = 0; i < count && availablePositions.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length)
      const positionIndex = availablePositions.splice(randomIndex, 1)[0]

      const bag = new HeavyBag(
        positionIndex,
        (isTimeout: boolean) => this.handleBagDestroyed(isTimeout),
        this.gameWidth,
        this.gameHeight,
        difficultyParams
      )

      bag.activate()
      this.bags.push(bag)
    }
  }

  private handleBagDestroyed(isTimeout: boolean) {
    this.onBagDestroyed(isTimeout)

    if (!isTimeout) return

    const gameTimeSeconds = (Date.now() - this.gameStartTime) / 1000
    const maxBags = this.getMaxBagsForDifficulty(gameTimeSeconds)

    if (this.bags.filter(bag => bag.isActive).length < maxBags) {
      this.spawnMultipleBags(1)
    }
  }

  cleanup() {
    this.bags = []
  }

  updateDimensions(newDimensions: { width: number; height: number }) {
    this.gameWidth = newDimensions.width
    this.gameHeight = newDimensions.height
  }
}