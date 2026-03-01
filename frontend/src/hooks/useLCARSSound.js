import { useCallback, useRef } from 'react';

// Star Trek TNG Computer Sound Generator using Web Audio API
// All sounds are synthesized to match authentic TNG computer beeps

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.12, fadeOut = true) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio context is not available
  }
}

function playSequence(notes, baseVolume = 0.12) {
  let delay = 0;
  notes.forEach(([freq, dur, type]) => {
    setTimeout(() => playTone(freq, dur, type || 'sine', baseVolume), delay * 1000);
    delay += dur * 0.7;
  });
}

// Sound library matching TNG computer sounds
const sounds = {
  // Classic TNG button press - short high pitched beep
  buttonPress: () => {
    playTone(1200, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(1600, 0.06, 'sine', 0.08), 40);
  },

  // Navigation click - ascending two-tone chirp
  navigate: () => {
    playSequence([[800, 0.06], [1200, 0.08]], 0.1);
  },

  // Computer acknowledgment - the classic triple beep
  computerAck: () => {
    playSequence([[1400, 0.07], [1100, 0.07], [1400, 0.1]], 0.1);
  },

  // Login/access granted - ascending triumphant
  accessGranted: () => {
    playSequence([[600, 0.1], [800, 0.1], [1000, 0.1], [1200, 0.15]], 0.1);
  },

  // Alert / error - descending warning
  alert: () => {
    playSequence([[800, 0.12, 'square'], [600, 0.12, 'square'], [400, 0.18, 'square']], 0.06);
  },

  // Data transmission / loading
  dataTransmit: () => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playTone(1400 + Math.random() * 400, 0.04, 'sine', 0.06), i * 60);
    }
  },

  // Panel open / door swoosh
  panelOpen: () => {
    const ctx = getAudioContext();
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  },

  // Scan / tricorder - warbling sound
  scan: () => {
    const ctx = getAudioContext();
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, ctx.currentTime);
      lfoGain.gain.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      lfo.start(ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
      lfo.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  },

  // Logbuch start - the classic "Captain's Log" fanfare
  logbuchStart: () => {
    playSequence([
      [523, 0.15],  // C
      [659, 0.15],  // E
      [784, 0.15],  // G
      [1047, 0.25], // C (octave)
    ], 0.1);
  },

  // Recording start beep
  recordStart: () => {
    playSequence([[880, 0.1], [1100, 0.1], [880, 0.15]], 0.12);
  },

  // Recording stop beep
  recordStop: () => {
    playSequence([[1100, 0.1], [880, 0.1], [660, 0.15]], 0.12);
  },

  // Message sent
  messageSent: () => {
    playTone(1000, 0.06, 'sine', 0.08);
    setTimeout(() => playTone(1400, 0.08, 'sine', 0.06), 50);
  },

  // Message received
  messageReceived: () => {
    playSequence([[1400, 0.05], [1200, 0.05], [1000, 0.08]], 0.08);
  },

  // Startup sequence - TNG computer boot sound
  startup: () => {
    const notes = [
      [200, 0.2], [300, 0.15], [400, 0.15], [500, 0.15],
      [600, 0.12], [700, 0.12], [800, 0.15], [1000, 0.2],
      [1200, 0.25],
    ];
    playSequence(notes, 0.06);
  },
};

export function useLCARSSound() {
  const enabledRef = useRef(true);

  const play = useCallback((soundName) => {
    if (!enabledRef.current) return;
    if (sounds[soundName]) {
      sounds[soundName]();
    }
  }, []);

  const setEnabled = useCallback((val) => {
    enabledRef.current = val;
  }, []);

  return { play, setEnabled };
}

export default sounds;
