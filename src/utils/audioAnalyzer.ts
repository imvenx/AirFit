export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null
  private isInitialized = false

  init(audioElement: HTMLAudioElement) {
    if (this.isInitialized) return

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    
    try {
      this.source = this.audioContext.createMediaElementSource(audioElement)
      this.source.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)
      
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
      
      this.isInitialized = true
    } catch (error) {
      console.warn('Audio element already connected to another source')
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null
    
    this.analyser.getByteFrequencyData(this.dataArray)
    return this.dataArray
  }

  getBeatIntensity(): number {
    const data = this.getFrequencyData()
    if (!data) return 0

    const bassRange = data.slice(0, 10)
    const midRange = data.slice(10, 30)
    
    const bassAvg = bassRange.reduce((a, b) => a + b, 0) / bassRange.length
    const midAvg = midRange.reduce((a, b) => a + b, 0) / midRange.length
    
    const intensity = (bassAvg * 0.7 + midAvg * 0.3) / 255
    return Math.min(1, intensity * 1.2)
  }

  getFrequencyBands(): { bass: number; mid: number; treble: number } {
    const data = this.getFrequencyData()
    if (!data) return { bass: 0, mid: 0, treble: 0 }

    const bassRange = data.slice(0, 10)
    const midRange = data.slice(10, 50)
    const trebleRange = data.slice(50, 100)
    
    const bass = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
    const mid = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
    const treble = trebleRange.reduce((a, b) => a + b, 0) / trebleRange.length / 255
    
    return {
      bass: Math.min(1, bass * 1.5),
      mid: Math.min(1, mid * 1.3),
      treble: Math.min(1, treble * 1.2)
    }
  }

  destroy() {
    if (this.source) {
      this.source.disconnect()
    }
    if (this.analyser) {
      this.analyser.disconnect()
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.isInitialized = false
  }
}

export const audioAnalyzer = new AudioAnalyzer()