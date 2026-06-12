import { Howl } from 'howler';

/**
 * Howler.js sound bus (Spec §6). Drop real audio files into /public/sounds
 * and they will be used; until then we synthesize simple beeps with WebAudio
 * so the experience is not silent during development.
 */
type Cue = 'cheer' | 'drum' | 'jackpot' | 'confetti' | 'explosion' | 'winner' | 'lose' | 'click';

const FILES: Partial<Record<Cue, string>> = {
  cheer: '/sounds/cheer.mp3',
  drum: '/sounds/drum.mp3',
  jackpot: '/sounds/jackpot.mp3',
  confetti: '/sounds/confetti.mp3',
  explosion: '/sounds/explosion.mp3',
  winner: '/sounds/winner.mp3',
  lose: '/sounds/lose.mp3',
  click: '/sounds/click.mp3',
};

let ctx: AudioContext | null = null;
const howls: Partial<Record<Cue, Howl>> = {};
const missing = new Set<Cue>();

function beep(freq: number, dur = 0.15, type: OscillatorType = 'square') {
  if (!import.meta.client) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    const n = ctx.currentTime;
    g.gain.setValueAtTime(0.05, n);
    g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
    o.start(n);
    o.stop(n + dur);
  } catch {
    /* ignore */
  }
}

// Fallback synth melodies when no audio file is present (ported from prototype).
const SYNTH: Record<Cue, () => void> = {
  click: () => beep(660, 0.1, 'triangle'),
  drum: () => beep(180, 0.05, 'square'),
  cheer: () => [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle'), i * 90)),
  winner: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle'), i * 110)),
  jackpot: () => [659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle'), i * 90)),
  confetti: () => [784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine'), i * 80)),
  lose: () => [330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sawtooth'), i * 150)),
  explosion: () => beep(80, 0.5, 'sawtooth'),
};

export function useSounds() {
  function play(cue: Cue) {
    if (!import.meta.client) return;
    if (missing.has(cue)) return SYNTH[cue]();
    if (!howls[cue]) {
      const src = FILES[cue];
      if (!src) return SYNTH[cue]();
      const h = new Howl({ src: [src], volume: 0.6, onloaderror: () => missing.add(cue) });
      howls[cue] = h;
    }
    try {
      howls[cue]!.play();
    } catch {
      SYNTH[cue]();
    }
  }
  return { play };
}
