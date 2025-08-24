const audioCtx = new AudioContext()


let currentAudioSource: AudioBufferSourceNode | undefined
let currentAudio: 'menuMusic' | 'gameMusic' = 'menuMusic'

export function muteMusic() {
    LocalStorage.setItem('isMuted', true)
    if (currentAudio === 'gameMusic') stopGameMusic()
    else if (currentAudio === 'menuMusic') stopMainMenuMusic()
}

export function unMuteMusic() {
    LocalStorage.setItem('isMuted', false)
    if (currentAudio === 'gameMusic') playGameMusic()
    else if (currentAudio === 'menuMusic') playMainMenuMusic()
}

import { LocalStorage } from 'quasar'
import mainMenuAudioPath from '../../assets/audio/Lobbenergetic-sports-rock-music-346336.mp3'
// let mainMenuAudioSource: AudioBufferSourceNode | undefined
export async function playMainMenuMusic() {
    if (LocalStorage.getItem('isMuted')) return

    try {
        // Resume audio context if suspended
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume()
        }

        const mainMenuAudioBuffer = await loadAudioBuffer(mainMenuAudioPath)
        if (currentAudioSource) {
            return
        }

        currentAudio = 'menuMusic'

        const source = audioCtx.createBufferSource()
        source.loop = true
        source.buffer = mainMenuAudioBuffer
        const gainNode = audioCtx.createGain()
        gainNode.gain.value = 0.3
        source.connect(gainNode).connect(audioCtx.destination)
        source.start()
        currentAudioSource = source
    } catch (error) {
        console.log('Audio playback failed:', error)
    }
}
export function stopMainMenuMusic() {
    stopAudio(currentAudioSource)
    currentAudioSource = undefined
}

import gameAudioPath from '../../assets/audio/Run-Amok(chosic.com).mp3'
// let gameAudioSource: AudioBufferSourceNode | undefined
export async function playGameMusic() {
    if (LocalStorage.getItem('isMuted')) return

    const gameAudioBuffer = await loadAudioBuffer(gameAudioPath)
    if (currentAudioSource) {
        return
    }

    currentAudio = 'gameMusic'

    const source = audioCtx.createBufferSource()
    source.loop = true
    source.buffer = gameAudioBuffer
    const gainNode = audioCtx.createGain()
    gainNode.gain.value = 0.2
    source.connect(gainNode).connect(audioCtx.destination)
    source.start()
    currentAudioSource = source
}
export function stopGameMusic() {
    stopAudio(currentAudioSource)
    currentAudioSource = undefined
}


export async function loadAudioBuffer(url: string) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return audioBuffer
}

// export function playAudioBuffer(audioBuffer: AudioBuffer) {
// }

export function stopAudio(source?: AudioBufferSourceNode) {
    source?.stop()
}
