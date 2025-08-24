<template>
  <div class="test-sound-container">
    <h2>Sound Test</h2>
    
    <div class="controls">
      <button @click="playPunchSound(0.1)" class="test-button">
        Play Punch Sound (Low - 0.1)
      </button>
      
      <button @click="playPunchSound(0.5)" class="test-button">
        Play Punch Sound (Medium - 0.5)
      </button>
      
      <button @click="playPunchSound(1.0)" class="test-button">
        Play Punch Sound (High - 1.0)
      </button>
      
      <button @click="playDirectMP3" class="test-button">
        Play Direct MP3 (HTML Audio)
      </button>
      
      <button @click="playWebAudioMP3" class="test-button">
        Play MP3 via Web Audio API
      </button>
      
      <div class="volume-control">
        <label>Volume: {{ volume.toFixed(2) }}</label>
        <input type="range" v-model="volume" min="0" max="1" step="0.1" />
      </div>
    </div>
    
    <div class="status">{{ status }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const volume = ref(0.5)
const status = ref('Ready to test sounds')
let audioContext: AudioContext | null = null
let punchBuffer: AudioBuffer | null = null
let directAudio: HTMLAudioElement | null = null

async function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

async function loadPunchBuffer() {
  if (!audioContext || punchBuffer) return
  
  try {
    status.value = 'Loading MP3 file...'
    const response = await fetch('/punch-sound.mp3')
    const arrayBuffer = await response.arrayBuffer()
    punchBuffer = await audioContext.decodeAudioData(arrayBuffer)
    status.value = 'MP3 loaded successfully'
  } catch (error) {
    status.value = `Error loading MP3: ${error}`
    punchBuffer = null
  }
}

async function playPunchSound(intensity: number) {
  try {
    await initAudioContext()
    if (!audioContext) {
      status.value = 'Failed to initialize audio context'
      return
    }
    
    await loadPunchBuffer()
    if (!punchBuffer) {
      status.value = 'No punch buffer available'
      return
    }
    
    const source = audioContext.createBufferSource()
    const gainNode = audioContext.createGain()
    
    source.buffer = punchBuffer
    
    const normalizedIntensity = Math.min(1.0, intensity * 5.0)
    const finalVolume = normalizedIntensity * volume.value
    gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime)
    source.playbackRate.setValueAtTime(0.95 + normalizedIntensity * 0.1, audioContext.currentTime)
    
    source.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    source.start()
    status.value = `Playing Web Audio API sound at intensity ${intensity}, volume ${finalVolume.toFixed(2)}`
  } catch (error) {
    status.value = `Error playing sound: ${error}`
  }
}

function playDirectMP3() {
  try {
    if (!directAudio) {
      directAudio = new Audio('/punch-sound.mp3')
    }
    directAudio.volume = volume.value
    directAudio.currentTime = 0
    directAudio.play()
    status.value = `Playing direct HTML Audio at volume ${volume.value}`
  } catch (error) {
    status.value = `Error playing direct MP3: ${error}`
  }
}

async function playWebAudioMP3() {
  try {
    await initAudioContext()
    if (!audioContext) {
      status.value = 'Failed to initialize audio context'
      return
    }
    
    await loadPunchBuffer()
    if (!punchBuffer) {
      status.value = 'No punch buffer available'
      return
    }
    
    const source = audioContext.createBufferSource()
    const gainNode = audioContext.createGain()
    
    source.buffer = punchBuffer
    gainNode.gain.setValueAtTime(volume.value, audioContext.currentTime)
    
    source.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    source.start()
    status.value = `Playing Web Audio API at volume ${volume.value}`
  } catch (error) {
    status.value = `Error playing Web Audio MP3: ${error}`
  }
}
</script>

<style scoped>
.test-sound-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h2 {
  margin-bottom: 30px;
  font-size: 2rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 400px;
}

.test-button {
  padding: 15px 20px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.test-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.test-button:active {
  transform: scale(0.95);
}

.volume-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.volume-control label {
  font-size: 1.1rem;
}

.volume-control input {
  width: 100%;
}

.status {
  margin-top: 30px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  min-height: 50px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  font-family: monospace;
}
</style>