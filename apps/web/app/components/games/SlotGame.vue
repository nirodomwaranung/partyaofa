<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const EMOJI: Record<string, string> = {
  coins: '🪙', beer: '🍺', sparkles: '✨', gift: '🎁', gem: '💎', bell: '🔔', star: '⭐', cherry: '🍒',
};
const POOL = Object.keys(EMOJI);

const host = ref<HTMLDivElement | null>(null);
const spinning = ref(false);
const result = ref<any>(null);
const history = ref<any[]>([]);

let PIXI: any = null;
let app: any = null;
const reels: any[] = [];
const CELL = 96, REEL_W = 96, GAP = 14, FINAL_IDX = 30;
let tickers: any[] = [];

async function buildReel(i: number) {
  const x = i * (REEL_W + GAP) + REEL_W / 2;
  const frame = new PIXI.Graphics();
  frame.roundRect(x - REEL_W / 2, 0, REEL_W, CELL, 16).fill(0xffffff);
  frame.roundRect(x - REEL_W / 2, 0, REEL_W, CELL, 16).stroke({ width: 3, color: 0x2a1b4d });
  app.stage.addChild(frame);

  const strip = new PIXI.Container();
  strip.x = x;
  const mask = new PIXI.Graphics();
  mask.rect(x - REEL_W / 2, 0, REEL_W, CELL).fill(0xffffff);
  strip.mask = mask;
  app.stage.addChild(mask, strip);

  reels[i] = { strip, symbols: [], x };
}

function fillStrip(i: number, finalSym: string) {
  const r = reels[i];
  r.strip.removeChildren();
  r.symbols = [];
  for (let k = 0; k <= FINAL_IDX; k++) {
    const sym = k === FINAL_IDX ? finalSym : POOL[Math.floor(Math.random() * POOL.length)];
    const t = new PIXI.Text({ text: EMOJI[sym], style: { fontSize: 56 } });
    t.anchor.set(0.5);
    t.position.set(0, k * CELL + CELL / 2);
    r.strip.addChild(t);
    r.symbols.push(sym);
  }
  r.strip.y = -(Math.floor(Math.random() * 5)) * CELL; // random start
}

async function buildScene() {
  if (!import.meta.client || !host.value) return;
  PIXI = await import('pixi.js');
  if (app) { app.destroy(true); app = null; }
  reels.length = 0;
  const W = 3 * REEL_W + 2 * GAP;
  app = new PIXI.Application();
  await app.init({ width: W, height: CELL, backgroundAlpha: 0, antialias: true });
  host.value.innerHTML = '';
  host.value.appendChild(app.canvas);
  for (let i = 0; i < 3; i++) await buildReel(i);
  for (let i = 0; i < 3; i++) fillStrip(i, POOL[i]);
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

function animate(syms: string[], res: any) {
  if (!app) return;
  spinning.value = true;
  result.value = null;
  sounds.play('drum');
  tickers.forEach((fn) => app.ticker.remove(fn));
  tickers = [];

  const durs = [1.4, 2.2, 3.0];
  let stopped = 0;
  syms.forEach((sym, i) => {
    fillStrip(i, sym);
    const startY = reels[i].strip.y;
    const targetY = -(FINAL_IDX * CELL - CELL / 2 + CELL / 2); // center final cell
    const t0 = performance.now();
    const fn = () => {
      const t = Math.min(1, (performance.now() - t0) / 1000 / durs[i]);
      reels[i].strip.y = startY + (targetY - startY) * easeOut(t);
      if (t >= 1) {
        app.ticker.remove(fn);
        sounds.play('click');
        if (++stopped === 3) finish(syms, res);
      }
    };
    tickers.push(fn);
    app.ticker.add(fn);
  });
}

function finish(syms: string[], res: any) {
  spinning.value = false;
  result.value = res;
  const sp = store.spotlight;
  history.value = [{ nick: sp?.nick ?? '', label: res.label, win: res.kind === 'cash' || res.kind === 'jackpot', drink: res.kind === 'drink' }, ...history.value].slice(0, 8);
  if (res.kind === 'drink' || res.kind === 'none') sounds.play('lose');
  else sounds.play(res.kind === 'jackpot' ? 'jackpot' : 'winner');
}

function run() {
  if (spinning.value) return;
  store.resolveGame('slot');
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'slot') animate(e.payload.syms, e.payload.result);
});
onMounted(() => nextTick(buildScene));
onBeforeUnmount(() => { tickers.forEach((fn) => app?.ticker.remove(fn)); app?.destroy(true); });
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-5">
    <div class="rounded-[24px] border-4 border-outline p-5 shadow-hard-lg" style="background: linear-gradient(180deg, #6D28D9, #4C1D95)">
      <div ref="host" />
    </div>

    <Transition name="pop">
      <div v-if="result" class="mt-4 animate-pop rounded-[16px] border-[3px] border-outline px-6 py-2 font-head text-2xl font-extrabold"
        :style="{ background: result.color, color: '#fff' }">
        {{ result.label }}
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="spinning" @click="run">
      <Icon name="cherry" :size="20" color="#fff" />{{ spinning ? 'กำลังหมุน…' : 'หมุนสล็อต!' }}
    </button>

    <div v-if="history.length" class="mt-5 w-full max-w-md">
      <div class="mb-1 text-center text-xs font-bold text-[#C9B6FF]">ประวัติแพ้-ชนะ</div>
      <div class="flex flex-wrap justify-center gap-1.5">
        <span v-for="(h, i) in history" :key="i" class="rounded-lg px-2 py-0.5 text-xs font-bold"
          :style="{ background: h.win ? '#34D399' : h.drink ? '#FF6B6B' : '#9a86bd', color: '#fff' }">
          {{ h.nick }}: {{ h.label }}
        </span>
      </div>
    </div>
  </div>
</template>
