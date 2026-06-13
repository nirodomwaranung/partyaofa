/**
 * Generate the game's sound effects as WAV files (no external assets).
 *   node apps/web/scripts/gen-sounds.cjs
 * Output → apps/web/public/sounds/*.wav  (wired in app/composables/useSounds.ts)
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'public', 'sounds');

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}
const n = (sec) => Math.floor(sec * SR);
function buf(sec) { return new Float32Array(n(sec)); }
// add a tone into arr starting at offset seconds
function tone(arr, start, dur, freq, { type = 'sine', gain = 0.3, glideTo = null, attack = 0.005, release = 0.05 } = {}) {
  const s0 = n(start), len = n(dur);
  for (let i = 0; i < len; i++) {
    const t = i / SR, prog = i / len;
    const f = glideTo == null ? freq : freq + (glideTo - freq) * prog;
    let v;
    const ph = 2 * Math.PI * f * t;
    if (type === 'sine') v = Math.sin(ph);
    else if (type === 'square') v = Math.sign(Math.sin(ph));
    else if (type === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else v = 2 * (f * t - Math.floor(0.5 + f * t)); // saw
    let env = 1;
    if (t < attack) env = t / attack;
    else if (prog > 1 - release) env = (1 - prog) / release;
    const idx = s0 + i; if (idx < arr.length) arr[idx] += v * gain * env;
  }
}
function noise(arr, start, dur, { gain = 0.3, decay = 3, lp = 0 } = {}) {
  const s0 = n(start), len = n(dur);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const prog = i / len;
    let v = Math.random() * 2 - 1;
    if (lp > 0) { last += (v - last) * lp; v = last; } // simple low-pass
    const env = Math.pow(1 - prog, decay);
    const idx = s0 + i; if (idx < arr.length) arr[idx] += v * gain * env;
  }
}

const cues = {
  click() { const a = buf(0.09); tone(a, 0, 0.08, 660, { type: 'tri', gain: 0.35 }); return a; },
  drum() { const a = buf(0.16); tone(a, 0, 0.14, 160, { type: 'sine', gain: 0.5, glideTo: 70 }); noise(a, 0, 0.05, { gain: 0.25, decay: 4 }); return a; },
  cheer() { const a = buf(0.9); noise(a, 0, 0.9, { gain: 0.18, decay: 0.6, lp: 0.08 }); [784, 988, 1175].forEach((f, k) => tone(a, 0.1 + k * 0.04, 0.5, f, { type: 'tri', gain: 0.06 })); return a; },
  winner() { const a = buf(0.7); [523, 659, 784, 1046].forEach((f, k) => tone(a, k * 0.11, 0.22, f, { type: 'tri', gain: 0.32 })); tone(a, 0.44, 0.26, 1046, { type: 'tri', gain: 0.3 }); return a; },
  jackpot() { const a = buf(1.0); [659, 784, 988, 1318, 1568].forEach((f, k) => tone(a, k * 0.09, 0.18, f, { type: 'tri', gain: 0.26 })); for (let k = 0; k < 6; k++) tone(a, 0.5 + k * 0.07, 0.12, 1568 + k * 120, { type: 'sine', gain: 0.12 }); return a; },
  confetti() { const a = buf(0.3); tone(a, 0, 0.12, 880, { type: 'sine', gain: 0.25 }); tone(a, 0.08, 0.14, 1320, { type: 'sine', gain: 0.22 }); return a; },
  lose() { const a = buf(0.7); [392, 311, 233].forEach((f, k) => tone(a, k * 0.16, 0.24, f, { type: 'saw', gain: 0.22 })); return a; },
  explosion() { const a = buf(0.7); noise(a, 0, 0.6, { gain: 0.55, decay: 2.2, lp: 0.05 }); tone(a, 0, 0.55, 180, { type: 'sine', gain: 0.5, glideTo: 35 }); return a; },
};

fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, fn] of Object.entries(cues)) {
  const b = wav(fn());
  fs.writeFileSync(path.join(OUT, `${name}.wav`), b);
  total += b.length;
  console.log(`  ${name}.wav  ${(b.length / 1024).toFixed(1)} KB`);
}
console.log(`Generated ${Object.keys(cues).length} sounds → ${OUT} (${(total / 1024).toFixed(0)} KB)`);
