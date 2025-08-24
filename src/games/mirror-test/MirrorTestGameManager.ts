import * as BABYLON from '@babylonjs/core'

const {
  Engine,
  Scene,
  FreeCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DirectionalLight
} = BABYLON

export class MirrorTestGameManager {
  private engine: Engine | null = null
  private scene: Scene | null = null
  private camera: FreeCamera | null = null
  private canvas: HTMLCanvasElement
  private cameraView: any = null
  
  // 3D shapes for body parts
  private headSphere: any = null
  private leftHandSphere: any = null
  private leftElbowSphere: any = null
  private leftShoulderSphere: any = null
  private leftForearmCylinder: any = null
  private leftUpperArmCylinder: any = null
  private rightHandSphere: any = null
  private rightElbowSphere: any = null
  private rightShoulderSphere: any = null
  private rightForearmCylinder: any = null
  private rightUpperArmCylinder: any = null
  private torsoCylinder: any = null

  // Smoothing properties
  private smoothingBuffer: Map<string, Vector3[]> = new Map()
  private readonly BUFFER_SIZE = 5
  private readonly LERP_FACTOR = 0.15
  private readonly MIN_MOVEMENT_THRESHOLD = 0.005

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async initialize(): Promise<void> {
    console.log('Initializing Mirror Test game...')
    
    // Create engine and scene
    this.engine = new Engine(this.canvas, true)
    this.scene = new Scene(this.engine)
    
    // Setup camera
    this.camera = new FreeCamera('camera', new Vector3(0, 1.6, -3), this.scene)
    this.camera.setTarget(Vector3.Zero())
    
    // Setup lighting
    const hemisphericLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene)
    hemisphericLight.intensity = 0.7
    
    const directionalLight = new DirectionalLight('dirLight', new Vector3(-1, -1, 1), this.scene)
    directionalLight.intensity = 0.5
    
    // Create 3D body shapes
    this.createBodyShapes()
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.updatePoseTracking()
        this.scene.render()
      }
    })
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize())
    
    console.log('Mirror Test game initialized successfully')
  }

  private createBodyShapes(): void {
    // Create light blue material for all shapes
    const lightBlueMaterial = new StandardMaterial('lightBlueMat', this.scene)
    lightBlueMaterial.diffuseColor = new Color3(0.4, 0.6, 0.9) // Light blue
    lightBlueMaterial.emissiveColor = new Color3(0.1, 0.15, 0.2) // Slight light blue glow
    
    // Create head sphere (larger and smoother)
    this.headSphere = MeshBuilder.CreateSphere('head', { 
      diameter: 0.35,
      segments: 32 // More segments for smoother appearance
    }, this.scene)
    this.headSphere.position = new Vector3(0, 0, 1)
    this.headSphere.material = lightBlueMaterial
    
    // Create left shoulder sphere (larger and smoother)
    this.leftShoulderSphere = MeshBuilder.CreateSphere('leftShoulder', { 
      diameter: 0.22,
      segments: 32
    }, this.scene)
    this.leftShoulderSphere.position = new Vector3(-0.2, 0.3, 1)
    this.leftShoulderSphere.material = lightBlueMaterial

    // Create left elbow sphere (larger and smoother)
    this.leftElbowSphere = MeshBuilder.CreateSphere('leftElbow', { 
      diameter: 0.18,
      segments: 32
    }, this.scene)
    this.leftElbowSphere.position = new Vector3(-0.3, 0, 1)
    this.leftElbowSphere.material = lightBlueMaterial

    // Create left hand sphere (larger and smoother)
    this.leftHandSphere = MeshBuilder.CreateSphere('leftHand', { 
      diameter: 0.24,
      segments: 32
    }, this.scene)
    this.leftHandSphere.position = new Vector3(-0.5, -0.5, 1)
    this.leftHandSphere.material = lightBlueMaterial

    // Create left upper arm cylinder (thicker with rounded caps)
    this.leftUpperArmCylinder = MeshBuilder.CreateCylinder('leftUpperArm', {
      height: 1,
      diameter: 0.16, // Thicker
      tessellation: 32, // More segments for smoother appearance
      cap: 3 // Rounded caps
    }, this.scene)
    this.leftUpperArmCylinder.position = new Vector3(-0.25, 0.15, 1)
    this.leftUpperArmCylinder.material = lightBlueMaterial

    // Create left forearm cylinder (thicker with rounded caps)
    this.leftForearmCylinder = MeshBuilder.CreateCylinder('leftForearm', {
      height: 1,
      diameter: 0.14, // Thicker
      tessellation: 32, // More segments for smoother appearance
      cap: 3 // Rounded caps
    }, this.scene)
    this.leftForearmCylinder.position = new Vector3(-0.4, -0.25, 1)
    this.leftForearmCylinder.material = lightBlueMaterial

    // Create right shoulder sphere (larger and smoother)
    this.rightShoulderSphere = MeshBuilder.CreateSphere('rightShoulder', { 
      diameter: 0.22,
      segments: 32
    }, this.scene)
    this.rightShoulderSphere.position = new Vector3(0.2, 0.3, 1)
    this.rightShoulderSphere.material = lightBlueMaterial

    // Create right elbow sphere (larger and smoother)
    this.rightElbowSphere = MeshBuilder.CreateSphere('rightElbow', { 
      diameter: 0.18,
      segments: 32
    }, this.scene)
    this.rightElbowSphere.position = new Vector3(0.3, 0, 1)
    this.rightElbowSphere.material = lightBlueMaterial

    // Create right hand sphere (larger and smoother)
    this.rightHandSphere = MeshBuilder.CreateSphere('rightHand', { 
      diameter: 0.24,
      segments: 32
    }, this.scene)
    this.rightHandSphere.position = new Vector3(0.5, -0.5, 1)
    this.rightHandSphere.material = lightBlueMaterial

    // Create right upper arm cylinder (thicker with rounded caps)
    this.rightUpperArmCylinder = MeshBuilder.CreateCylinder('rightUpperArm', {
      height: 1,
      diameter: 0.16, // Thicker
      tessellation: 32, // More segments for smoother appearance
      cap: 3 // Rounded caps
    }, this.scene)
    this.rightUpperArmCylinder.position = new Vector3(0.25, 0.15, 1)
    this.rightUpperArmCylinder.material = lightBlueMaterial

    // Create right forearm cylinder (thicker with rounded caps)
    this.rightForearmCylinder = MeshBuilder.CreateCylinder('rightForearm', {
      height: 1,
      diameter: 0.14, // Thicker
      tessellation: 32, // More segments for smoother appearance
      cap: 3 // Rounded caps
    }, this.scene)
    this.rightForearmCylinder.position = new Vector3(0.4, -0.25, 1)
    this.rightForearmCylinder.material = lightBlueMaterial

    // Create torso box connecting shoulders to belly
    this.torsoCylinder = MeshBuilder.CreateBox('torso', {
      width: 0.3,  // Body thickness (depth)
      height: 0.8, // From shoulders to belly
      depth: 0.6   // Shoulder width (now depth)
    }, this.scene)
    this.torsoCylinder.position = new Vector3(0, 0, 1) // Default position (center of torso)
    this.torsoCylinder.material = lightBlueMaterial
  }

  setCameraView(cameraView: any): void {
    this.cameraView = cameraView
    console.log('Camera view connected to mirror test')
  }

  private updatePoseTracking(): void {
    if (!this.cameraView || !this.cameraView.landmarks) {
      return
    }
    
    // Get fresh landmarks
    const landmarks = this.cameraView.landmarks
    const pose = landmarks.value || landmarks
    
    if (!pose || pose.length < 33) {
      return
    }

    // Update head position based on nose landmark
    this.updateHeadPosition(pose)
    
    // Update left arm positions (elbow, wrist, and connecting forearm)
    this.updateLeftArmPosition(pose)
    
    // Update right arm positions (elbow, wrist, and connecting forearm)
    this.updateRightArmPosition(pose)
    
    // Update torso position connecting both shoulders
    this.updateTorsoPosition(pose)
  }

  private updateHeadPosition(pose: any[]): void {
    // Use nose landmark (index 0) for head tracking
    const nose = pose[0]
    
    if (!nose) return
    
    // Convert MediaPipe coordinates to 3D space with bounded depth range
    const x = (1 - nose.x) * 2 - 1   // Mirror horizontally and scale to -1 to 1
    const y = (1 - nose.y) * 2 - 1   // Flip vertically and scale to -1 to 1  
    const z = Math.max(0.2, (nose.z || 0) * 2 + 1.5)  // Keep minimum distance from camera
    
    const rawPosition = new Vector3(x, y, z)
    const smoothedPosition = this.applySmoothingFilter(rawPosition, 'head')
    
    // Update head sphere position with smoothed data
    this.headSphere.position = Vector3.Lerp(this.headSphere.position, smoothedPosition, this.LERP_FACTOR)
  }

  private updateLeftArmPosition(pose: any[]): void {
    const leftShoulder = pose[11]  // Left shoulder landmark
    const leftElbow = pose[13]     // Left elbow landmark
    const leftWrist = pose[15]     // Left wrist landmark
    
    if (!leftShoulder || !leftElbow || !leftWrist) return
    
    // Convert shoulder coordinates to 3D space with bounded depth range
    const shoulderX = (1 - leftShoulder.x) * 2 - 1
    const shoulderY = (1 - leftShoulder.y) * 2 - 1
    const shoulderZ = Math.max(0.2, (leftShoulder.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Convert elbow coordinates to 3D space with bounded depth range
    const elbowX = (1 - leftElbow.x) * 2 - 1
    const elbowY = (1 - leftElbow.y) * 2 - 1
    const elbowZ = Math.max(0.2, (leftElbow.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Convert wrist coordinates to 3D space with bounded depth range
    const wristX = (1 - leftWrist.x) * 2 - 1
    const wristY = (1 - leftWrist.y) * 2 - 1
    const wristZ = Math.max(0.2, (leftWrist.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Apply smoothing filters to all positions
    const rawShoulderPosition = new Vector3(shoulderX, shoulderY, shoulderZ)
    const rawElbowPosition = new Vector3(elbowX, elbowY, elbowZ)
    const rawWristPosition = new Vector3(wristX, wristY, wristZ)
    
    const shoulderPosition = this.applySmoothingFilter(rawShoulderPosition, 'leftShoulder')
    const elbowPosition = this.applySmoothingFilter(rawElbowPosition, 'leftElbow')
    const wristPosition = this.applySmoothingFilter(rawWristPosition, 'leftWrist')
    
    // Update sphere positions with enhanced smoothing
    this.leftShoulderSphere.position = Vector3.Lerp(this.leftShoulderSphere.position, shoulderPosition, this.LERP_FACTOR)
    this.leftElbowSphere.position = Vector3.Lerp(this.leftElbowSphere.position, elbowPosition, this.LERP_FACTOR)
    this.leftHandSphere.position = Vector3.Lerp(this.leftHandSphere.position, wristPosition, this.LERP_FACTOR)
    
    // Update arm cylinders with smoothed positions
    this.updateUpperArmCylinder(shoulderPosition, elbowPosition)
    this.updateForearmCylinder(elbowPosition, wristPosition)
  }

  private updateRightArmPosition(pose: any[]): void {
    const rightShoulder = pose[12]  // Right shoulder landmark
    const rightElbow = pose[14]     // Right elbow landmark
    const rightWrist = pose[16]     // Right wrist landmark
    
    if (!rightShoulder || !rightElbow || !rightWrist) return
    
    // Convert shoulder coordinates to 3D space with bounded depth range
    const shoulderX = (1 - rightShoulder.x) * 2 - 1
    const shoulderY = (1 - rightShoulder.y) * 2 - 1
    const shoulderZ = Math.max(0.2, (rightShoulder.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Convert elbow coordinates to 3D space with bounded depth range
    const elbowX = (1 - rightElbow.x) * 2 - 1
    const elbowY = (1 - rightElbow.y) * 2 - 1
    const elbowZ = Math.max(0.2, (rightElbow.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Convert wrist coordinates to 3D space with bounded depth range
    const wristX = (1 - rightWrist.x) * 2 - 1
    const wristY = (1 - rightWrist.y) * 2 - 1
    const wristZ = Math.max(0.2, (rightWrist.z || 0) * 2 + 1.5)  // Keep minimum distance
    
    // Apply smoothing filters to all positions
    const rawShoulderPosition = new Vector3(shoulderX, shoulderY, shoulderZ)
    const rawElbowPosition = new Vector3(elbowX, elbowY, elbowZ)
    const rawWristPosition = new Vector3(wristX, wristY, wristZ)
    
    const shoulderPosition = this.applySmoothingFilter(rawShoulderPosition, 'rightShoulder')
    const elbowPosition = this.applySmoothingFilter(rawElbowPosition, 'rightElbow')
    const wristPosition = this.applySmoothingFilter(rawWristPosition, 'rightWrist')
    
    // Update sphere positions with enhanced smoothing
    this.rightShoulderSphere.position = Vector3.Lerp(this.rightShoulderSphere.position, shoulderPosition, this.LERP_FACTOR)
    this.rightElbowSphere.position = Vector3.Lerp(this.rightElbowSphere.position, elbowPosition, this.LERP_FACTOR)
    this.rightHandSphere.position = Vector3.Lerp(this.rightHandSphere.position, wristPosition, this.LERP_FACTOR)
    
    // Update arm cylinders with smoothed positions
    this.updateRightUpperArmCylinder(shoulderPosition, elbowPosition)
    this.updateRightForearmCylinder(elbowPosition, wristPosition)
  }

  private updateForearmCylinder(elbowPos: Vector3, wristPos: Vector3): void {
    // Calculate center point between elbow and wrist
    const centerPos = Vector3.Lerp(elbowPos, wristPos, 0.5)
    
    // Calculate distance (length of forearm)
    const distance = Vector3.Distance(elbowPos, wristPos)
    
    // Calculate rotation to align cylinder with arm direction
    const direction = wristPos.subtract(elbowPos).normalize()
    
    // Update cylinder position and scale with enhanced smoothing
    this.leftForearmCylinder.position = Vector3.Lerp(this.leftForearmCylinder.position, centerPos, this.LERP_FACTOR)
    this.leftForearmCylinder.scaling.y = distance // Scale height to match arm length
    
    // Rotate cylinder to align with arm direction
    this.leftForearmCylinder.lookAt(wristPos.add(direction))
    this.leftForearmCylinder.rotation.x += Math.PI / 2 // Adjust for cylinder orientation
  }

  private updateUpperArmCylinder(shoulderPos: Vector3, elbowPos: Vector3): void {
    // Calculate center point between shoulder and elbow
    const centerPos = Vector3.Lerp(shoulderPos, elbowPos, 0.5)
    
    // Calculate distance (length of upper arm)
    const distance = Vector3.Distance(shoulderPos, elbowPos)
    
    // Calculate rotation to align cylinder with arm direction
    const direction = elbowPos.subtract(shoulderPos).normalize()
    
    // Update cylinder position and scale with enhanced smoothing
    this.leftUpperArmCylinder.position = Vector3.Lerp(this.leftUpperArmCylinder.position, centerPos, this.LERP_FACTOR)
    this.leftUpperArmCylinder.scaling.y = distance // Scale height to match arm length
    
    // Rotate cylinder to align with arm direction
    this.leftUpperArmCylinder.lookAt(elbowPos.add(direction))
    this.leftUpperArmCylinder.rotation.x += Math.PI / 2 // Adjust for cylinder orientation
  }

  private updateRightForearmCylinder(elbowPos: Vector3, wristPos: Vector3): void {
    // Calculate center point between elbow and wrist
    const centerPos = Vector3.Lerp(elbowPos, wristPos, 0.5)
    
    // Calculate distance (length of forearm)
    const distance = Vector3.Distance(elbowPos, wristPos)
    
    // Calculate rotation to align cylinder with arm direction
    const direction = wristPos.subtract(elbowPos).normalize()
    
    // Update cylinder position and scale with enhanced smoothing
    this.rightForearmCylinder.position = Vector3.Lerp(this.rightForearmCylinder.position, centerPos, this.LERP_FACTOR)
    this.rightForearmCylinder.scaling.y = distance // Scale height to match arm length
    
    // Rotate cylinder to align with arm direction
    this.rightForearmCylinder.lookAt(wristPos.add(direction))
    this.rightForearmCylinder.rotation.x += Math.PI / 2 // Adjust for cylinder orientation
  }

  private updateRightUpperArmCylinder(shoulderPos: Vector3, elbowPos: Vector3): void {
    // Calculate center point between shoulder and elbow
    const centerPos = Vector3.Lerp(shoulderPos, elbowPos, 0.5)
    
    // Calculate distance (length of upper arm)
    const distance = Vector3.Distance(shoulderPos, elbowPos)
    
    // Calculate rotation to align cylinder with arm direction
    const direction = elbowPos.subtract(shoulderPos).normalize()
    
    // Update cylinder position and scale with enhanced smoothing
    this.rightUpperArmCylinder.position = Vector3.Lerp(this.rightUpperArmCylinder.position, centerPos, this.LERP_FACTOR)
    this.rightUpperArmCylinder.scaling.y = distance // Scale height to match arm length
    
    // Rotate cylinder to align with arm direction
    this.rightUpperArmCylinder.lookAt(elbowPos.add(direction))
    this.rightUpperArmCylinder.rotation.x += Math.PI / 2 // Adjust for cylinder orientation
  }

  private updateTorsoPosition(pose: any[]): void {
    const leftShoulder = pose[11]   // Left shoulder landmark
    const rightShoulder = pose[12]  // Right shoulder landmark
    const leftHip = pose[23]        // Left hip landmark
    const rightHip = pose[24]       // Right hip landmark
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return
    
    // Convert shoulder coordinates to 3D space
    const leftShoulderX = (1 - leftShoulder.x) * 2 - 1
    const leftShoulderY = (1 - leftShoulder.y) * 2 - 1
    const leftShoulderZ = Math.max(0.2, (leftShoulder.z || 0) * 2 + 1.5)
    
    const rightShoulderX = (1 - rightShoulder.x) * 2 - 1
    const rightShoulderY = (1 - rightShoulder.y) * 2 - 1
    const rightShoulderZ = Math.max(0.2, (rightShoulder.z || 0) * 2 + 1.5)
    
    // Convert hip coordinates to 3D space
    const leftHipX = (1 - leftHip.x) * 2 - 1
    const leftHipY = (1 - leftHip.y) * 2 - 1
    const leftHipZ = Math.max(0.2, (leftHip.z || 0) * 2 + 1.5)
    
    const rightHipX = (1 - rightHip.x) * 2 - 1
    const rightHipY = (1 - rightHip.y) * 2 - 1
    const rightHipZ = Math.max(0.2, (rightHip.z || 0) * 2 + 1.5)
    
    // Calculate center points for shoulders and hips
    const shoulderCenter = new Vector3(
      (leftShoulderX + rightShoulderX) / 2,
      (leftShoulderY + rightShoulderY) / 2,
      (leftShoulderZ + rightShoulderZ) / 2
    )
    
    const hipCenter = new Vector3(
      (leftHipX + rightHipX) / 2,
      (leftHipY + rightHipY) / 2,
      (leftHipZ + rightHipZ) / 2
    )
    
    // Calculate torso center (midpoint between shoulder and hip centers)
    const torsoCenter = Vector3.Lerp(shoulderCenter, hipCenter, 0.5)
    
    // Apply smoothing for torso center
    const smoothedTorsoCenter = this.applySmoothingFilter(torsoCenter, 'torsoCenter')
    
    // Calculate shoulder width and torso height for scaling
    const shoulderWidth = Vector3.Distance(
      new Vector3(leftShoulderX, leftShoulderY, leftShoulderZ),
      new Vector3(rightShoulderX, rightShoulderY, rightShoulderZ)
    )
    const torsoHeight = Vector3.Distance(shoulderCenter, hipCenter)
    
    // Update torso box position and scale
    this.torsoCylinder.position = Vector3.Lerp(this.torsoCylinder.position, smoothedTorsoCenter, this.LERP_FACTOR)
    
    // Scale the box to match body proportions (swapped X and Z axes)
    this.torsoCylinder.scaling.x = 0.8 // Keep consistent body thickness
    this.torsoCylinder.scaling.y = Math.max(0.4, torsoHeight)   // Height from shoulders to hips
    this.torsoCylinder.scaling.z = Math.max(0.3, shoulderWidth) // Shoulder width now maps to Z-axis
    
    // Calculate body rotation based on shoulder orientation
    const shoulderDirection = new Vector3(rightShoulderX - leftShoulderX, 0, rightShoulderZ - leftShoulderZ).normalize()
    
    // Apply rotation to align torso with body orientation
    this.torsoCylinder.rotation.y = Math.atan2(shoulderDirection.x, shoulderDirection.z)
  }

  private applySmoothingFilter(rawPosition: Vector3, key: string): Vector3 {
    // Initialize buffer for this landmark if it doesn't exist
    if (!this.smoothingBuffer.has(key)) {
      this.smoothingBuffer.set(key, [])
    }
    
    const buffer = this.smoothingBuffer.get(key)!
    
    // Add current position to buffer
    buffer.push(rawPosition.clone())
    
    // Keep buffer size limited
    if (buffer.length > this.BUFFER_SIZE) {
      buffer.shift()
    }
    
    // Calculate moving average
    let avgX = 0, avgY = 0, avgZ = 0
    for (const pos of buffer) {
      avgX += pos.x
      avgY += pos.y
      avgZ += pos.z
    }
    
    const smoothedPosition = new Vector3(
      avgX / buffer.length,
      avgY / buffer.length,
      avgZ / buffer.length
    )
    
    // Apply minimum movement threshold to reduce micro-movements
    if (buffer.length > 1) {
      const lastSmoothed = buffer[buffer.length - 2]
      const distance = Vector3.Distance(smoothedPosition, lastSmoothed)
      
      if (distance < this.MIN_MOVEMENT_THRESHOLD) {
        return lastSmoothed // Don't update if movement is too small
      }
    }
    
    return smoothedPosition
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