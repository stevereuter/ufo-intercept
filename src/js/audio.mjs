let audioContext;

/**
 * Initializes the AudioContext.
 * This must be called as a result of a user gesture (e.g., a click).
 */
export function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
        }
    }
}

/**
 * Plays a retro "pew" sound for a laser shot.
 */
export function playShotSound() {
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const duration = 0.3;

    // Create an oscillator for the sound source
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sawtooth";

    // Create a gain node to control the volume envelope
    const gainNode = audioContext.createGain();

    // Connect nodes: oscillator -> gain -> speakers
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pitch envelope (makes the "pew" sound)
    oscillator.frequency.setValueAtTime(680, now); // Start high
    oscillator.frequency.exponentialRampToValueAtTime(
        140,
        now + duration * 0.5
    ); // Drop quickly

    // Volume envelope (makes the sound short)
    gainNode.gain.setValueAtTime(0.5, now); // Start volume
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Fade out

    // Start and stop the sound
    oscillator.start(now);
    oscillator.stop(now + duration);
}
