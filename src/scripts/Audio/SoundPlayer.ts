class SoundPlayer {
    private audioContext: AudioContext;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    play(options: {
        type?: OscillatorType;
        frequencyStart?: number;
        frequencyEnd?: number;
        frequencyDuration?: number;
        gainStart?: number;
        gainEnd?: number;
        gainDuration?: number;
        duration?: number;
        pan?: number; // Add pan parameter
    } = {}) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const panNode = this.audioContext.createStereoPanner(); // Create a StereoPannerNode

        // Set default values if options are not provided
        const {
            type = 'sine',
            frequencyStart = 500,
            frequencyEnd = frequencyStart,
            frequencyDuration = 0,
            gainStart = 0.3,
            gainEnd = gainStart,
            gainDuration = 0,
            duration = 0.2,
            pan = 0 // Default pan to center
        } = options;

        oscillator.type = type;
        oscillator.connect(gainNode);
        gainNode.connect(panNode); // Connect gainNode to panNode
        panNode.connect(this.audioContext.destination); // Connect panNode to destination

        const currentTime = this.audioContext.currentTime;

        // Set frequency values
        oscillator.frequency.setValueAtTime(frequencyStart, currentTime);
        if (frequencyDuration > 0 && frequencyStart !== frequencyEnd) {
            oscillator.frequency.linearRampToValueAtTime(frequencyEnd, currentTime + frequencyDuration);
        }

        // Set gain values
        gainNode.gain.setValueAtTime(gainStart, currentTime);
        if (gainDuration > 0 && gainStart !== gainEnd) {
            gainNode.gain.exponentialRampToValueAtTime(gainEnd, currentTime + gainDuration);
        }

        // Set pan value
        panNode.pan.setValueAtTime(pan, currentTime);

        // Start and stop the oscillator
        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
    }
}

export const soundPlayer = new SoundPlayer();
