/**
 * Generate looping background-music tracks as WAV (no licensed assets).
 *   node apps/web/scripts/gen-music.cjs   → apps/web/public/music/*.wav
 * Soft, simple, loopable. Real songs can be added via YouTube URL in the app.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT = path.join(__dirname, '..', 'public', 'music');

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE((Math.max(-1, Math.min(1, samples[i])) * 32767) | 0, 44 + i * 2);
  return buf;
}
const freq = (semi) => 261.63 * Math.pow(2, semi / 12); // from C4
const TRIAD = { maj: [0, 4, 7], min: [0, 3, 7] };

function note(arr, start, dur, f, { type = 'sine', gain = 0.2, attack = 0.02, release = 0.15 } = {}) {
  const s0 = (start * SR) | 0, len = (dur * SR) | 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, prog = i / len, ph = 2 * Math.PI * f * t;
    let v = type === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : type === 'saw' ? 2 * (f * t - Math.floor(0.5 + f * t)) : Math.sin(ph);
    let env = 1;
    if (t < attack) env = t / attack; else if (prog > 1 - release) env = Math.max(0, (1 - prog) / release);
    const idx = s0 + i; if (idx < arr.length) arr[idx] += v * gain * env;
  }
}
function kick(arr, start) {
  const s0 = (start * SR) | 0, len = (0.12 * SR) | 0;
  for (let i = 0; i < len; i++) {
    const prog = i / len, f = 110 - 70 * prog;
    const idx = s0 + i; if (idx < arr.length) arr[idx] += Math.sin(2 * Math.PI * f * (i / SR)) * 0.35 * Math.pow(1 - prog, 2);
  }
}

function build({ prog, bpm, style, useKick, oct = 0 }) {
  const beat = 60 / bpm, bar = beat * 4, total = bar * prog.length;
  const a = new Float32Array(Math.ceil(total * SR) + SR);
  prog.forEach((ch, b) => {
    const t0 = b * bar;
    const triad = TRIAD[ch.type].map((s) => freq(ch.root + s + 12 * oct));
    // bass: root, low, sustained per bar
    note(a, t0, bar, freq(ch.root - 12), { type: 'sine', gain: 0.18, release: 0.3 });
    if (style === 'pad') {
      triad.forEach((f) => note(a, t0, bar, f, { type: 'sine', gain: 0.09, attack: 0.2, release: 0.5 }));
      note(a, t0 + bar * 0.5, beat, triad[2] * 2, { type: 'tri', gain: 0.06 }); // soft sparkle
    } else { // arp — eighth notes
      for (let i = 0; i < 8; i++) {
        const f = triad[i % 3] * (i >= 6 ? 2 : 1);
        note(a, t0 + i * (beat / 2), beat / 2 * 0.9, f, { type: 'tri', gain: 0.13 });
      }
      if (useKick) for (let i = 0; i < 4; i++) kick(a, t0 + i * beat);
    }
  });
  return a;
}

const tracks = {
  party: build({ prog: [{ root: 0, type: 'maj' }, { root: 7, type: 'maj' }, { root: 9, type: 'min' }, { root: 5, type: 'maj' }], bpm: 112, style: 'arp', useKick: true }),
  chill: build({ prog: [{ root: 9, type: 'min' }, { root: 5, type: 'maj' }, { root: 0, type: 'maj' }, { root: 7, type: 'maj' }], bpm: 76, style: 'pad', oct: 0 }),
  gameshow: build({ prog: [{ root: 2, type: 'min' }, { root: 9, type: 'maj' }, { root: 2, type: 'min' }, { root: 7, type: 'maj' }], bpm: 124, style: 'arp', useKick: true }),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(tracks)) {
  const b = wav(samples);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), b);
  console.log(`  ${name}.wav  ${(b.length / 1024).toFixed(0)} KB`);
}
console.log(`Generated ${Object.keys(tracks).length} music loops → ${OUT}`);
