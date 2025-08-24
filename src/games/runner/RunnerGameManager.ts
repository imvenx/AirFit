import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'

const {
  Engine,
  Scene,
  FreeCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DirectionalLight,
  SceneLoader,
  Animation
} = BABYLON

export class RunnerGameManager {
  private engine: Engine | null = null
  private scene: Scene | null = null
  private camera: FreeCamera | null = null
  private canvas: HTMLCanvasElement
  private character: any = null
  private skeleton: any = null
  private animationGroups: any[] = []
  private currentAnimationGroup: any = null
  private cameraView: any = null
  private isRunning = false
  private isWalking = false
  private currentMovementState = 'idle'
  private previousShoulderY = 0
  private shoulderMovementHistory: number[] = []
  private lastMovementTime = 0
  private readonly STOP_DELAY = 1000 // Continue running for 1 second after movement stops

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async initialize(): Promise<void> {
    console.log('Initializing Runner game...')
    
    // Create engine and scene
    this.engine = new Engine(this.canvas, true)
    this.scene = new Scene(this.engine)
    
    // Setup camera (behind and above character)
    this.camera = new FreeCamera('camera', new Vector3(0, 5, -10), this.scene)
    this.camera.setTarget(new Vector3(0, 2, 0))
    
    // Setup lighting
    const hemisphericLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene)
    hemisphericLight.intensity = 0.6
    
    const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -1, 1), this.scene)
    directionalLight.intensity = 0.8
    
    // Create ground/track
    this.createTrack()
    
    // Load character
    await this.loadCharacter()
    
    // Setup controls
    this.setupControls()
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.updatePoseTracking()
        this.scene.render()
      }
    })
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize())
    
    console.log('Runner game initialized successfully')
  }

  private createTrack(): void {
    // Create ground
    const ground = MeshBuilder.CreateGround('ground', { width: 200, height: 20 }, this.scene)
    const groundMaterial = new StandardMaterial('groundMat', this.scene)
    groundMaterial.diffuseColor = new Color3(0.4, 0.8, 0.4)
    ground.material = groundMaterial
    ground.position.z = 50 // Extend forward
    
    // Create track lanes
    for (let i = -2; i <= 2; i++) {
      const lane = MeshBuilder.CreateBox('lane', { width: 0.1, height: 0.1, depth: 200 }, this.scene)
      const laneMaterial = new StandardMaterial('laneMat', this.scene)
      laneMaterial.diffuseColor = new Color3(1, 1, 1)
      lane.material = laneMaterial
      lane.position.x = i * 2
      lane.position.y = 0.05
      lane.position.z = 50
    }
  }

  private async loadCharacter(): Promise<void> {
    try {
      console.log('Loading character for runner game...')
      
      const importResult = await SceneLoader.ImportMeshAsync(
        '',
        '/models3d/',
        'female-character-1348.glb',
        this.scene
      )
      
      console.log('Character loaded successfully')
      console.log('Meshes:', importResult.meshes.length)
      console.log('Skeletons:', importResult.skeletons.length)
      console.log('AnimationGroups:', importResult.animationGroups.length)
      
      // Setup character
      this.character = importResult.meshes[0]
      this.character.position = new Vector3(0, 0, 0)
      this.character.scaling = new Vector3(1, 1, 1)
      
      // Make character face away from camera
      importResult.meshes.forEach(mesh => {
        mesh.rotation.y = Math.PI // 180 degrees - should face directly away
      })
      
      // Store animation groups
      this.animationGroups = importResult.animationGroups
      
      // Stop all animations initially
      this.animationGroups.forEach(animGroup => {
        animGroup.stop()
      })
      
      // Start idle animation
      this.playAnimation('Female_Idle')
      
      console.log('Available animations:', this.animationGroups.map(a => a.name))
      
    } catch (error) {
      console.error('Failed to load character:', error)
    }
  }

  private playAnimation(animationName: string): void {
    // Stop current animation
    if (this.currentAnimationGroup) {
      this.currentAnimationGroup.stop()
    }
    
    // Find and play new animation
    const animation = this.animationGroups.find(a => a.name.includes(animationName))
    if (animation) {
      this.currentAnimationGroup = animation
      
      // Force looping
      animation.loopAnimation = true
      animation.play(true) // Loop = true
      
      console.log('Playing animation:', animationName)
    } else {
      console.log('Animation not found:', animationName)
    }
  }

  private setupControls(): void {
    const keys: { [key: string]: boolean } = {}
    
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' && !keys['KeyW']) {
        keys['KeyW'] = true
        this.playAnimation('Female_Run')
      }
    })
    
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' && keys['KeyW']) {
        keys['KeyW'] = false
        this.playAnimation('Female_Idle')
      }
    })
  }

  setCameraView(cameraView: any): void {
    this.cameraView = cameraView
    console.log('Camera view connected to game manager')
  }

  private updatePoseTracking(): void {
    if (!this.cameraView || !this.cameraView.landmarks) {
      return
    }
    
    // Get fresh landmarks directly from camera view each frame
    const landmarks = this.cameraView.landmarks
    const pose = landmarks.value || landmarks
    
    if (!pose || pose.length < 33) {
      return
    }

    // Removed debug spam

    // Detect running motion based on pose
    this.detectRunningMotion(pose)
  }

  private detectRunningMotion(pose: any[]): void {
    // Get shoulder landmarks
    const leftShoulder = pose[11]
    const rightShoulder = pose[12]
    
    if (!leftShoulder || !rightShoulder) return

    // Calculate average shoulder Y position
    const currentShoulderY = (leftShoulder.y + rightShoulder.y) / 2
    
    // Initialize previous position on first run
    if (this.previousShoulderY === 0) {
      this.previousShoulderY = currentShoulderY
      return // Skip first frame to avoid false positive
    }
    
    // Calculate movement since last frame
    const movement = Math.abs(currentShoulderY - this.previousShoulderY)
    
    // Removed debug spam
    
    // Store movement in history (keep last 10 frames)
    this.shoulderMovementHistory.push(movement)
    if (this.shoulderMovementHistory.length > 10) {
      this.shoulderMovementHistory.shift()
    }
    
    // Calculate average movement over recent frames
    const avgMovement = this.shoulderMovementHistory.reduce((sum, val) => sum + val, 0) / this.shoulderMovementHistory.length
    
    // Thresholds for different movement types
    const walkingThreshold = 0.001 // Lower threshold for walking
    const runningThreshold = 0.004 // Higher threshold for running
    
    const isWalking = avgMovement > walkingThreshold
    const isRunning = avgMovement > runningThreshold
    const currentTime = Date.now()
    
    // Update last movement time if currently moving
    if (isWalking) {
      this.lastMovementTime = currentTime
    }
    
    // Determine movement state (with grace period)
    const hasRecentMovement = (currentTime - this.lastMovementTime < this.STOP_DELAY)
    let newMovementState = 'idle'
    
    if (isRunning || (hasRecentMovement && this.currentMovementState === 'running')) {
      newMovementState = 'running'
    } else if (isWalking || (hasRecentMovement && this.currentMovementState === 'walking')) {
      newMovementState = 'walking'
    }
    
    // Debug output every 60 frames (roughly every 2 seconds)
    if (this.shoulderMovementHistory.length % 60 === 0) {
      const timeSinceMovement = currentTime - this.lastMovementTime
      console.log(`Movement: ${avgMovement.toFixed(4)} | Walk: ${walkingThreshold} | Run: ${runningThreshold} | State: ${newMovementState}`)
    }
    
    // Only change animation when state actually changes
    if (newMovementState !== this.currentMovementState) {
      this.currentMovementState = newMovementState
      
      if (newMovementState === 'running') {
        this.playAnimation('Female_Run')
        console.log('🏃 Running - movement:', avgMovement.toFixed(4))
      } else if (newMovementState === 'walking') {
        this.playAnimation('Female_Walk')
        console.log('🚶 Walking - movement:', avgMovement.toFixed(4))
      } else {
        this.playAnimation('Female_Idle')
        console.log('🛑 Idle - movement stopped')
      }
    }
    
    // Update previous position
    this.previousShoulderY = currentShoulderY
  }

  private handleResize(): void {
    if (this.engine) {
      this.engine.resize()
    }
  }

  cleanup(): void {
    if (this.engine) {
      this.engine.dispose()
    }
  }
}