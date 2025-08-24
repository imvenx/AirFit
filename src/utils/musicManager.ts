import { Howl } from 'howler'
import { audioAnalyzer } from './audioAnalyzer'

// Import audio files
import menuMusicUrl from 'src/assets/audio/energetic-sports-rock-music-346336.mp3'
import bubbleMusicUrl from 'src/assets/audio/Run-Amok(chosic.com).mp3'
import boxingMusicUrl from 'src/assets/audio/action-sport-beat-promo-330326.mp3'
import tableBreakerMusicUrl from 'src/assets/audio/taiko-percussion-loop-preparation-for-action-355034.mp3'

// Singleton class for music management
class MusicManager {
  private static instance: MusicManager
  private sounds: Record<string, Howl>
  private currentTrack: string | null = null

  private constructor() {
    // Create audio instances with HTML5 audio for analyzer access
    this.sounds = {
      menu: new Howl({ src: [menuMusicUrl], loop: true, volume: 0.3, html5: true }),
      'bubble-bop': new Howl({ src: [bubbleMusicUrl], loop: true, volume: 0.2, html5: true }),
      boxing: new Howl({ src: [boxingMusicUrl], loop: true, volume: 0.1, html5: true }),
      'table-break': new Howl({ src: [tableBreakerMusicUrl], loop: true, volume: 0.2, html5: true })
    }
  }

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager()
    }
    return MusicManager.instance
  }

  play(trackName: string) {
    // If already playing this track, do nothing
    if (this.currentTrack === trackName && this.sounds[trackName]?.playing()) {
      return
    }

    // Stop ALL tracks to ensure singleton behavior
    this.stopAll()

    // Play new track
    if (this.sounds[trackName]) {
      this.sounds[trackName].play()
      this.currentTrack = trackName
      
      // Initialize audio analyzer with the HTML5 audio element
      const howl = this.sounds[trackName] as any
      if (howl._sounds && howl._sounds[0] && howl._sounds[0]._node) {
        audioAnalyzer.init(howl._sounds[0]._node)
      }
    }
  }

  stop() {
    this.stopAll()
    this.currentTrack = null
  }

  private stopAll() {
    // Stop all sounds to ensure only one plays at a time
    Object.values(this.sounds).forEach(sound => {
      if (sound.playing()) {
        sound.stop()
      }
    })
  }

  getCurrentTrack() {
    return this.currentTrack
  }

  getAnalyzer() {
    return audioAnalyzer
  }
}

// Export singleton instance
export const musicManager = MusicManager.getInstance()