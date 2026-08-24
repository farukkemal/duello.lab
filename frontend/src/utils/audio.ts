// Web Audio API Synthesizer Sound Engine for duello.lab
// Zero external asset dependencies - 100% synthesized in-browser

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('duello_sfx_muted') === 'true';
}

export function toggleAudioMute(): boolean {
  const current = isAudioMuted();
  const next = !current;
  localStorage.setItem('duello_sfx_muted', next.toString());
  return next;
}

// 1. ⏱️ 3-2-1 Countdown Tick
export function playCountdownTick() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.09);
  triggerHaptic(20);
}

// 2. 🔥 Countdown "BAŞLA!" Go Sound
export function playCountdownGo() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
  triggerHaptic(50);
}

// 3. 🔔 Correct Answer "Ding!" / Arcade Chime
export function playCorrectSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + idx * 0.06;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.23);
  });

  triggerHaptic(30);
}

// 4. 🚨 Wrong Answer "Buzzer" Sound
export function playWrongSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.35);

  triggerHaptic([60, 40, 60]);
}

// 5. 🎺 Victory & Podium Fanfare
export function playVictorySound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const chords = [
    { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
    { freq: 659.25, time: 0.14, dur: 0.12 }, // E5
    { freq: 783.99, time: 0.28, dur: 0.12 }, // G5
    { freq: 1046.5, time: 0.44, dur: 0.55 }, // High C6
  ];

  chords.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + note.time;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + note.dur + 0.05);
  });

  triggerHaptic([40, 30, 40, 30, 80]);
}

// 6. 💰 Coin Collect Jingle
export function playCoinSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [987.77, 1318.51]; // B5, E6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + idx * 0.07;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.2);
  });

  triggerHaptic(20);
}

// 7. 💬 Emote Pop Sound
export function playEmotePopSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// 8. 📳 Mobile Haptic Feedback
export function triggerHaptic(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors if unsupported
    }
  }
}
