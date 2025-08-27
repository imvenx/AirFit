// Shared audio context for all instances
let sharedAudioContext: AudioContext | null = null
let sharedPunchBuffer: AudioBuffer | null = null
let sharedPunchLoading: boolean = false

export class AudioManager {
  private async initEffectsAudio() {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume()
    }
  }

  private async loadPunchSound() {
    if (sharedPunchBuffer || sharedPunchLoading || !sharedAudioContext) return
    
    sharedPunchLoading = true
    try {
      const response = await fetch('punch-sound.mp3')
      const arrayBuffer = await response.arrayBuffer()
      sharedPunchBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer)
    } catch (error) {
      sharedPunchBuffer = null
    } finally {
      sharedPunchLoading = false
    }
  }

  async playPunchSound(intensity: number = 1.0) {
    try {
      await this.initEffectsAudio()
      if (!sharedAudioContext) return
      
      if (!sharedPunchBuffer && !sharedPunchLoading) {
        await this.loadPunchSound()
      }
      
      if (!sharedPunchBuffer) {
        // Fallback to procedural sound if MP3 fails
        const oscillator = sharedAudioContext.createOscillator()
        const gainNode = sharedAudioContext.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(150, sharedAudioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(50, sharedAudioContext.currentTime + 0.1)

        const normalizedIntensity = Math.min(1.0, intensity * 5.0)
        gainNode.gain.setValueAtTime(normalizedIntensity, sharedAudioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, sharedAudioContext.currentTime + 0.15)

        oscillator.connect(gainNode)
        gainNode.connect(sharedAudioContext.destination)

        oscillator.start()
        oscillator.stop(sharedAudioContext.currentTime + 0.15)
        return
      }

      const source = sharedAudioContext.createBufferSource()
      const gainNode = sharedAudioContext.createGain()
      
      source.buffer = sharedPunchBuffer
      
      const normalizedIntensity = Math.min(1.0, intensity * 5.0)
      const volume = 0.2 + (normalizedIntensity * 0.6)
      gainNode.gain.setValueAtTime(volume, sharedAudioContext.currentTime)
      source.playbackRate.setValueAtTime(0.95 + normalizedIntensity * 0.1, sharedAudioContext.currentTime)
      
      source.connect(gainNode)
      gainNode.connect(sharedAudioContext.destination)
      
      source.start()
    } catch (error) {
      // Audio failed silently
    }
  }

  async playDodgeSound() {
    try {
      await this.initEffectsAudio()
      if (!sharedAudioContext) return

      // Create clean whoosh with oscillator sweep
      const oscillator = sharedAudioContext.createOscillator()
      const filter = sharedAudioContext.createBiquadFilter()
      const gainNode = sharedAudioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(500, sharedAudioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, sharedAudioContext.currentTime + 0.3)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1500, sharedAudioContext.currentTime)
      filter.Q.setValueAtTime(2, sharedAudioContext.currentTime)

      gainNode.gain.setValueAtTime(0.01, sharedAudioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.03, sharedAudioContext.currentTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.005, sharedAudioContext.currentTime + 0.3)

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(sharedAudioContext.destination)

      oscillator.start()
      oscillator.stop(sharedAudioContext.currentTime + 0.3)
    } catch (error) {
      // Audio failed silently
    }
  }

  async playDamageSound() {
    try {
      await this.initEffectsAudio()
      if (!sharedAudioContext) return

      // Create impact/damage sound with quick burst
      const oscillator1 = sharedAudioContext.createOscillator()
      const oscillator2 = sharedAudioContext.createOscillator()
      const gainNode = sharedAudioContext.createGain()
      const noiseBuffer = sharedAudioContext.createBuffer(1, sharedAudioContext.sampleRate * 0.2, sharedAudioContext.sampleRate)
      const noiseSource = sharedAudioContext.createBufferSource()

      // Sharp noise burst for impact
      const noiseData = noiseBuffer.getChannelData(0)
      for (let i = 0; i < noiseData.length; i++) {
        const decay = Math.exp(-i / (noiseData.length * 0.1))
        noiseData[i] = (Math.random() * 2 - 1) * decay
      }
      noiseSource.buffer = noiseBuffer

      // Low frequency thud
      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(120, sharedAudioContext.currentTime)
      oscillator1.frequency.exponentialRampToValueAtTime(60, sharedAudioContext.currentTime + 0.15)

      // Mid frequency punch
      oscillator2.type = 'square'
      oscillator2.frequency.setValueAtTime(300, sharedAudioContext.currentTime)
      oscillator2.frequency.exponentialRampToValueAtTime(150, sharedAudioContext.currentTime + 0.1)

      // Sharp attack, quick decay
      gainNode.gain.setValueAtTime(0.6, sharedAudioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, sharedAudioContext.currentTime + 0.2)

      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      noiseSource.connect(gainNode)
      gainNode.connect(sharedAudioContext.destination)

      oscillator1.start()
      oscillator2.start()
      noiseSource.start()

      oscillator1.stop(sharedAudioContext.currentTime + 0.15)
      oscillator2.stop(sharedAudioContext.currentTime + 0.1)
      noiseSource.stop(sharedAudioContext.currentTime + 0.2)
    } catch (error) {
      // Audio failed silently
    }
  }

  private currentWarningSound: { oscillator: OscillatorNode, gainNode: GainNode } | null = null

  async startWarningSound(duration: number) {
    try {
      // Stop any existing warning sound
      this.stopWarningSound()

      await this.initEffectsAudio()
      if (!sharedAudioContext) return

      // Create continuous warning sound that sweeps pitch
      const oscillator = sharedAudioContext.createOscillator()
      const gainNode = sharedAudioContext.createGain()

      oscillator.type = 'sine'

      // Sweep from 400Hz to 600Hz over the duration
      const startFreq = 400
      const endFreq = 600
      oscillator.frequency.setValueAtTime(startFreq, sharedAudioContext.currentTime)
      oscillator.frequency.linearRampToValueAtTime(endFreq, sharedAudioContext.currentTime + duration / 1000)

      // Keep volume very low for background (30% of previous level)
      gainNode.gain.setValueAtTime(0.015, sharedAudioContext.currentTime)

      oscillator.connect(gainNode)
      gainNode.connect(sharedAudioContext.destination)

      oscillator.start()

      // Store reference to stop it later
      this.currentWarningSound = { oscillator, gainNode }
    } catch (error) {
      // Audio failed silently
    }
  }

  stopWarningSound() {
    if (this.currentWarningSound) {
      try {
        this.currentWarningSound.oscillator.stop()
      } catch (error) {
        // Ignore errors when stopping already stopped oscillator
      }
      this.currentWarningSound = null
    }
  }
}

// Allow app to proactively resume or create the shared audio context after a user gesture
export async function resumeGlobalAudioContext() {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume()
    }
  } catch (e) {
    // ignore
  }
}
