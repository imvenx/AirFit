// Import all necessary Babylon.js modules
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'

// Destructure what we need
const {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DirectionalLight,
  SceneLoader,
  Matrix,
  Space,
  Animation
} = BABYLON

export class Test3DGameManager {
  private engine: Engine | null = null
  private scene: Scene | null = null
  private camera: ArcRotateCamera | null = null
  private canvas: HTMLCanvasElement
  private character: any = null
  private skeleton: any = null
  private poseLandmarks: any = null
  private leftArmBone: any = null
  private rightArmBone: any = null
  private leftForearmBone: any = null
  private rightForearmBone: any = null
  private spineBone: any = null
  private neckBone: any = null
  private headBone: any = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async initialize(): Promise<void> {
    console.log('Initializing Babylon.js engine...')
    
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    })

    console.log('Engine created, canvas size:', this.canvas.width, 'x', this.canvas.height)

    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color3(0.1, 0.1, 0.2).toColor4()

    this.setupCamera()
    this.setupLighting()
    await this.createTestObjects()

    console.log('Starting render loop...')
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.scene.render()
      }
    })

    window.addEventListener('resize', this.handleResize.bind(this))
    console.log('3D scene initialized successfully')
  }

  private setupCamera(): void {
    if (!this.scene) return

    this.camera = new ArcRotateCamera(
      'camera',
      0,
      Math.PI / 3,
      8,
      new Vector3(0, 1, 0),
      this.scene
    )

    // Set camera as active camera first
    this.scene.activeCamera = this.camera
    
    // Try different approach for camera controls
    try {
      if (this.camera.attachControls) {
        this.camera.attachControls(this.canvas, true)
      } else {
        console.warn('attachControls not available, camera controls disabled')
      }
    } catch (error) {
      console.error('Error setting up camera controls:', error)
    }
    
    this.camera.setTarget(new Vector3(0, 1, 0))
    this.camera.lowerRadiusLimit = 2
    this.camera.upperRadiusLimit = 20
    
    console.log('Camera setup complete, position:', this.camera.position)
    console.log('Camera methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.camera)))
  }

  private setupLighting(): void {
    if (!this.scene) return

    const hemisphericLight = new HemisphericLight(
      'hemisphericLight',
      new Vector3(0, 1, 0),
      this.scene
    )
    hemisphericLight.intensity = 0.7

    const directionalLight = new DirectionalLight(
      'directionalLight',
      new Vector3(-1, -1, -1),
      this.scene
    )
    directionalLight.intensity = 0.5
  }

  private async createTestObjects(): Promise<void> {
    if (!this.scene) return

    console.log('Loading GLB character...')

    try {
      console.log('Loading GLB using Babylon.js best practices...')
      
      // Simple, clean GLB loading as per documentation
      const importResult = await SceneLoader.ImportMeshAsync(
        "", // importMeshes - empty means import all
        "/models3d/", // rootUrl 
        "female-character-1348.glb", // sceneFilename - rigged character
        this.scene // scene
      )
      
      console.log('✅ GLB Import Result:')
      console.log('Meshes:', importResult.meshes.length)
      console.log('Skeletons:', importResult.skeletons?.length || 0)
      console.log('AnimationGroups:', importResult.animationGroups?.length || 0)
      
      if (importResult.meshes.length === 0) {
        throw new Error('No meshes found in GLB file')
      }
      
      // Position and scale the character
      const rootMesh = importResult.meshes[0]
      rootMesh.position = Vector3.Zero()
      rootMesh.scaling = new Vector3(1, 1, 1) // Start with normal scale, adjust if needed
      
      // Rotate all meshes to face camera
      importResult.meshes.forEach(mesh => {
        mesh.rotation.y = -Math.PI / 2 // Rotate 90 degrees right to face camera
      })
      
      console.log('📍 Character positioned and scaled')
      console.log('Character name:', rootMesh.name)
      console.log('Character bounds:', rootMesh.getBoundingInfo())
      
      // Store character for pose tracking
      this.character = importResult
      
      // Check for skeleton (this should have one!)
      if (importResult.skeletons && importResult.skeletons.length > 0) {
        const skeleton = importResult.skeletons[0]
        console.log('🎯 SKELETON FOUND!')
        console.log('Bones:', skeleton.bones.length)
        console.log('Root bone:', skeleton.bones[0]?.name)
        
        // Log all bone names for pose mapping
        console.log('All bone names:', skeleton.bones.map(b => b.name))
        
        // Look for standard humanoid bones
        const humanoidBones = {
          hips: skeleton.bones.find(b => b.name.toLowerCase().includes('hips')),
          spine: skeleton.bones.find(b => b.name.toLowerCase().includes('spine')),
          leftArm: skeleton.bones.find(b => b.name.toLowerCase().includes('arm') && b.name.toLowerCase().includes('l')),
          rightArm: skeleton.bones.find(b => b.name.toLowerCase().includes('arm') && b.name.toLowerCase().includes('r')),
          leftLeg: skeleton.bones.find(b => b.name.toLowerCase().includes('leg') && b.name.toLowerCase().includes('l')),
          rightLeg: skeleton.bones.find(b => b.name.toLowerCase().includes('leg') && b.name.toLowerCase().includes('r'))
        }
        
        console.log('🦴 Key humanoid bones found:')
        Object.entries(humanoidBones).forEach(([key, bone]) => {
          console.log(`${key}: ${bone ? bone.name : 'NOT FOUND'}`)
        })
        
        // Store skeleton for pose tracking
        this.skeleton = skeleton
        
        // Stop any default animations
        if (importResult.animationGroups) {
          importResult.animationGroups.forEach(animGroup => {
            animGroup.stop()
            console.log(`Stopped animation: ${animGroup.name}`)
          })
        }
        
        // Store bone references for pose tracking
        this.leftArmBone = skeleton.bones.find((b: any) => b.name === 'UpperArm.L')
        this.rightArmBone = skeleton.bones.find((b: any) => b.name === 'UpperArm.R')
        this.leftForearmBone = skeleton.bones.find((b: any) => b.name === 'Forearm.L')
        this.rightForearmBone = skeleton.bones.find((b: any) => b.name === 'Forearm.R')
        this.spineBone = skeleton.bones.find((b: any) => b.name === 'Torso')
        this.neckBone = skeleton.bones.find((b: any) => b.name === 'Neck')
        this.headBone = skeleton.bones.find((b: any) => b.name === 'Head')
        
        console.log('All bone references stored for pose tracking:')
        console.log('Left arm:', this.leftArmBone?.name)
        console.log('Right arm:', this.rightArmBone?.name)
        console.log('Left forearm:', this.leftForearmBone?.name)
        console.log('Right forearm:', this.rightForearmBone?.name)
        console.log('Spine:', this.spineBone?.name)
        console.log('Neck:', this.neckBone?.name)
        console.log('Head:', this.headBone?.name)
        
        console.log('🚀 READY FOR POSE TRACKING!')
        
      } else {
        console.warn('❌ No skeleton found - need a rigged character for pose tracking')
      }
      
      // Apply simple materials to prevent white appearance
      importResult.meshes.forEach((mesh, index) => {
        if (!mesh.material && mesh.name !== '__root__') {
          const mat = new StandardMaterial(`char_mat_${index}`, this.scene!)
          mat.diffuseColor = new Color3(0.85, 0.75, 0.65) // Skin tone
          mesh.material = mat
        }
      })

      // Add simple ground for reference
      const ground = MeshBuilder.CreateGround('ground', { width: 5, height: 5 }, this.scene)
      const groundMaterial = new StandardMaterial('groundMaterial', this.scene)
      groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3)
      ground.material = groundMaterial

    } catch (error) {
      console.error('Failed to load GLB character:', error)
      
      // Fallback to cube if GLB fails
      const box = MeshBuilder.CreateBox('fallbackBox', { size: 2 }, this.scene)
      box.position = new Vector3(0, 1, 0)
      console.log('Created fallback cube')
    }
  }

  setPoseLandmarks(landmarks: any): void {
    this.poseLandmarks = landmarks
  }

  startGame(): void {
    console.log('3D Test game started')
    
    // Start pose tracking animation loop
    if (this.scene) {
      this.scene.registerBeforeRender(() => {
        this.updateCharacterPose()
      })
    }
  }

  private updateCharacterPose(): void {
    if (!this.skeleton || !this.poseLandmarks?.value || this.poseLandmarks.value.length === 0) {
      return
    }

    const pose = this.poseLandmarks.value
    if (!pose || pose.length < 33) return

    try {
      this.mapPoseToSkeleton(pose)
    } catch (error) {
      console.error('Error updating character pose:', error)
    }
  }

  private mapPoseToSkeleton(pose: any[]): void {
    // MediaPipe pose landmark indices
    const landmarks = {
      leftShoulder: pose[11],
      rightShoulder: pose[12], 
      leftElbow: pose[13],
      rightElbow: pose[14],
      leftWrist: pose[15],
      rightWrist: pose[16],
      nose: pose[0],
      leftEye: pose[1],
      rightEye: pose[4],
      leftHip: pose[23],
      rightHip: pose[24]
    }

    // LEFT ARM (Upper arm)
    if (this.leftArmBone && landmarks.leftShoulder && landmarks.leftElbow) {
      const armVector = {
        x: landmarks.leftElbow.x - landmarks.leftShoulder.x,
        y: landmarks.leftElbow.y - landmarks.leftShoulder.y
      }
      const angle = Math.atan2(-armVector.y, armVector.x)
      const transformNode = this.leftArmBone.getTransformNode()
      if (transformNode) {
        transformNode.rotation = new Vector3(0, 0, angle)
      }
    }

    // RIGHT ARM (Upper arm) - Mirror the angle
    if (this.rightArmBone && landmarks.rightShoulder && landmarks.rightElbow) {
      const armVector = {
        x: landmarks.rightElbow.x - landmarks.rightShoulder.x,
        y: landmarks.rightElbow.y - landmarks.rightShoulder.y
      }
      const angle = Math.atan2(-armVector.y, armVector.x)
      const transformNode = this.rightArmBone.getTransformNode()
      if (transformNode) {
        // Mirror the angle for right arm (flip around Y axis)
        transformNode.rotation = new Vector3(0, 0, Math.PI - angle)
      }
    }

    // LEFT FOREARM
    if (this.leftForearmBone && landmarks.leftElbow && landmarks.leftWrist) {
      const forearmVector = {
        x: landmarks.leftWrist.x - landmarks.leftElbow.x,
        y: landmarks.leftWrist.y - landmarks.leftElbow.y
      }
      const angle = Math.atan2(-forearmVector.y, forearmVector.x)
      const transformNode = this.leftForearmBone.getTransformNode()
      if (transformNode) {
        transformNode.rotation = new Vector3(0, 0, angle)
      }
    }

    // RIGHT FOREARM - Mirror the angle
    if (this.rightForearmBone && landmarks.rightElbow && landmarks.rightWrist) {
      const forearmVector = {
        x: landmarks.rightWrist.x - landmarks.rightElbow.x,
        y: landmarks.rightWrist.y - landmarks.rightElbow.y
      }
      const angle = Math.atan2(-forearmVector.y, forearmVector.x)
      const transformNode = this.rightForearmBone.getTransformNode()
      if (transformNode) {
        // Mirror the angle for right forearm
        transformNode.rotation = new Vector3(0, 0, Math.PI - angle)
      }
    }

    // HEAD ROTATION (subtle tilt based on eye line)
    if (this.headBone && landmarks.leftEye && landmarks.rightEye) {
      const eyeVector = {
        x: landmarks.rightEye.x - landmarks.leftEye.x,
        y: landmarks.rightEye.y - landmarks.leftEye.y
      }
      const eyeAngle = Math.atan2(eyeVector.y, eyeVector.x)
      const transformNode = this.headBone.getTransformNode()
      if (transformNode) {
        // Very subtle head tilt - reduce intensity significantly
        transformNode.rotation = new Vector3(0, 0, -eyeAngle * 0.2)
      }
    }

    // SPINE/TORSO ROTATION
    if (this.spineBone && landmarks.leftShoulder && landmarks.rightShoulder && landmarks.leftHip && landmarks.rightHip) {
      const shoulderCenter = {
        x: (landmarks.leftShoulder.x + landmarks.rightShoulder.x) / 2,
        y: (landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2
      }
      const hipCenter = {
        x: (landmarks.leftHip.x + landmarks.rightHip.x) / 2,
        y: (landmarks.leftHip.y + landmarks.rightHip.y) / 2
      }
      
      const spineVector = {
        x: shoulderCenter.x - hipCenter.x,
        y: shoulderCenter.y - hipCenter.y
      }
      const spineAngle = Math.atan2(-spineVector.x, spineVector.y) // Different axis for spine
      const transformNode = this.spineBone.getTransformNode()
      if (transformNode) {
        transformNode.rotation = new Vector3(0, 0, spineAngle * 0.3) // Reduce intensity
      }
    }
  }

  private handleResize(): void {
    if (this.engine) {
      this.engine.resize()
    }
  }

  cleanup(): void {
    window.removeEventListener('resize', this.handleResize.bind(this))
    
    if (this.scene) {
      this.scene.dispose()
      this.scene = null
    }
    
    if (this.engine) {
      this.engine.dispose()
      this.engine = null
    }
  }
}