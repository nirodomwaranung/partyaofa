<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import { pixiAvatar, loadTexture } from '~/utils/pixiAvatar';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const host = ref<HTMLDivElement | null>(null);
const running = ref(false);
const ranks = ref<string[] | null>(null);

const isHorse = () => props.gameKey === 'horse';
let PIXI: any = null;
let app: any = null;
let tickerFn: any = null;
const runners: Record<string, any> = {};
let layout = { startX: 70, finishX: 800, laneH: 64, top: 30 };

async function buildScene() {
  if (!import.meta.client || !host.value) return;
  PIXI = await import('pixi.js');
  const round = store.roundPlayers;
  const W = Math.min(960, host.value.clientWidth || 900);
  const H = layout.top * 2 + round.length * layout.laneH;
  layout.finishX = W - 60;

  if (app) { app.destroy(true); app = null; }
  Object.keys(runners).forEach((k) => delete runners[k]);

  app = new PIXI.Application();
  await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true });
  host.value.innerHTML = '';
  host.value.appendChild(app.canvas);

  // ---- track background ----
  const bg = new PIXI.Graphics();
  round.forEach((_, i) => {
    const y = layout.top + i * layout.laneH;
    bg.rect(0, y, W, layout.laneH).fill({ color: i % 2 ? 0xffffff : 0x000000, alpha: i % 2 ? 0.05 : 0.12 });
    // lane dashes
    for (let x = layout.startX; x < layout.finishX; x += 46)
      bg.rect(x, y + layout.laneH / 2 - 1.5, 22, 3).fill({ color: 0xffffff, alpha: 0.12 });
  });
  // finish line (checker)
  for (let y = layout.top; y < H - layout.top + layout.laneH; y += 14)
    for (let k = 0; k < 2; k++)
      bg.rect(layout.finishX + k * 7, y + ((y / 14 + k) % 2) * 7, 7, 7).fill(((y / 14 + k) % 2) ? 0xffffff : 0x2a1b4d);
  app.stage.addChild(bg);

  // ---- runners ----
  for (let i = 0; i < round.length; i++) {
    const p = round[i];
    const laneY = layout.top + i * layout.laneH + layout.laneH / 2;
    const cont = new PIXI.Container();
    cont.position.set(layout.startX, laneY);

    const tex = await loadTexture(PIXI, p.photo);
    const av = pixiAvatar(PIXI, { color: p.color, size: 40, texture: tex });
    av.x = 0;

    // mount/runner glyph
    const glyph = new PIXI.Text({ text: isHorse() ? '🐎' : '🏃', style: { fontSize: 26 } });
    glyph.anchor.set(0.5);
    glyph.position.set(-26, 2);

    const name = new PIXI.Text({
      text: p.nick,
      style: { fontFamily: 'Baloo Thai 2', fontSize: 12, fontWeight: '700', fill: 0xffffff },
    });
    name.anchor.set(0.5);
    name.position.set(0, 28);

    cont.addChild(glyph, av, name);
    app.stage.addChild(cont);
    runners[p.id] = { cont, av, glyph, baseY: laneY, color: p.color };
  }
}

function ease(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function animate(winnerId: string, order: string[]) {
  const round = store.roundPlayers;
  if (round.length < 2 || !app) return;
  running.value = true;
  ranks.value = null;
  sounds.play('drum');

  const baseDur = isHorse() ? 15 : 3.4;
  const durs: Record<string, number> = {};
  order.forEach((id, i) => (durs[id] = baseDur + i * (isHorse() ? 0.5 : 0.4) + Math.random() * 0.6));
  const winDur = durs[winnerId];
  const span = layout.finishX - layout.startX;
  const t0 = performance.now();

  if (tickerFn) app.ticker.remove(tickerFn);
  tickerFn = () => {
    const el = (performance.now() - t0) / 1000;
    for (const p of round) {
      const r = runners[p.id];
      if (!r) continue;
      const t = Math.min(1, el / durs[p.id]);
      const prog = ease(t);
      r.cont.x = layout.startX + span * prog;
      if (t < 1) {
        r.cont.y = r.baseY + Math.sin(el * 14 + r.baseY) * 3; // bob
        r.glyph.rotation = Math.sin(el * 18) * 0.12;
        r.cont.scale.x = 1; // face right
      } else {
        r.cont.y = r.baseY;
        r.glyph.rotation = 0;
      }
    }
    if (el >= winDur + 0.1) {
      app.ticker.remove(tickerFn); tickerFn = null;
      const rw = runners[winnerId];
      if (rw) rw.cont.x = layout.finishX;
      running.value = false;
      ranks.value = order;
      sounds.play('winner');
      // winner pop
      if (rw) { rw.cont.scale.set(1.25); setTimeout(() => rw.cont?.scale.set(1), 400); }
    }
  };
  app.ticker.add(tickerFn);
}

function run() {
  if (running.value) return;
  store.resolveGame(props.gameKey);
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && (e.gameKey === 'horse' || e.gameKey === 'race')) animate(e.payload.winnerId, e.payload.ranks);
});
// rebuild when the round roster changes
watch(() => store.roundPlayers.map((p) => p.id).join(','), () => nextTick(buildScene));

onMounted(() => nextTick(buildScene));
onBeforeUnmount(() => { if (tickerFn && app) app.ticker.remove(tickerFn); app?.destroy(true); });
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3">
    <div ref="host" class="w-full max-w-[960px] overflow-hidden rounded-[16px] border-2 border-white/15" style="background: linear-gradient(180deg,#1f1340,#2A1850)" />

    <div v-if="ranks" class="mt-4 flex gap-4">
      <div v-for="(id, i) in ranks.slice(0, 3)" :key="id" class="flex flex-col items-center">
        <div class="font-head text-lg font-extrabold" :style="{ color: ['#FFD93D', '#C0C0C0', '#CD7F32'][i] }">#{{ i + 1 }}</div>
        <PlayerAvatar :player="store.playerById(id)" :size="44" />
        <span class="font-head text-sm font-bold text-white">{{ store.playerById(id)?.nick }}</span>
      </div>
    </div>

    <div class="mt-4 flex gap-3">
      <button class="aofa-btn aofa-btn-pink px-8 py-3.5 text-lg" :disabled="running" @click="run">
        <Icon name="flag" :size="20" color="#fff" />{{ running ? 'กำลังแข่ง…' : 'ปล่อยตัว!' }}
      </button>
      <button class="aofa-btn aofa-btn-yellow px-5 py-3.5" :disabled="running" @click="store.resetGame(gameKey); ranks = null; buildScene()">รีเซ็ต</button>
    </div>
  </div>
</template>
