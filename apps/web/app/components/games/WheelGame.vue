<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const WHEEL = [
  { label: 'เงิน 500', color: '#6BCB77' }, { label: 'Voucher', color: '#4D96FF' },
  { label: 'รอดตัว', color: '#A0E548' }, { label: 'ยก 1', color: '#FF9F45' },
  { label: 'เงิน 1,000', color: '#FFD93D' }, { label: 'ยก 3', color: '#FF6B6B' },
  { label: 'JACKPOT', color: '#C780FA' }, { label: 'รอดตัว', color: '#22D3EE' },
];

const host = ref<HTMLDivElement | null>(null);
const spinning = ref(false);
const result = ref<any>(null);
let app: any = null;
let wheel: any = null;
let raf = 0;

async function buildPixi() {
  if (!import.meta.client || !host.value) return;
  const PIXI = await import('pixi.js');
  app = new PIXI.Application();
  await app.init({ width: 380, height: 380, backgroundAlpha: 0, antialias: true });
  host.value.appendChild(app.canvas);

  wheel = new PIXI.Container();
  wheel.position.set(190, 190);
  const R = 180;
  const seg = (Math.PI * 2) / WHEEL.length;
  WHEEL.forEach((s, i) => {
    const g = new PIXI.Graphics();
    const a0 = i * seg - Math.PI / 2 - seg / 2;
    g.moveTo(0, 0).arc(0, 0, R, a0, a0 + seg).lineTo(0, 0).fill(s.color);
    g.stroke({ width: 3, color: 0x2a1b4d });
    wheel.addChild(g);
    const label = new PIXI.Text({
      text: s.label,
      style: { fontFamily: 'Baloo Thai 2', fontSize: 17, fontWeight: '700', fill: '#2A1B4D', align: 'center' },
    });
    label.anchor.set(0.5);
    const mid = a0 + seg / 2;
    label.position.set(Math.cos(mid) * R * 0.62, Math.sin(mid) * R * 0.62);
    label.rotation = mid + Math.PI / 2;
    wheel.addChild(label);
  });
  app.stage.addChild(wheel);
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function spinTo(index: number, prize: any) {
  if (!wheel) return;
  spinning.value = true;
  result.value = null;
  sounds.play('drum');
  const seg = 360 / WHEEL.length;
  const cur = ((wheel.rotation * 180) / Math.PI) % 360;
  const desired = (360 - index * seg) % 360; // pointer at top
  const delta = ((desired - cur + 360) % 360) + 360 * 5;
  const start = (wheel.rotation * 180) / Math.PI;
  const end = start + delta;
  const dur = 4000;
  const t0 = performance.now();
  cancelAnimationFrame(raf);
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    const deg = start + (end - start) * easeOutCubic(t);
    wheel.rotation = (deg * Math.PI) / 180;
    if (t < 1) raf = requestAnimationFrame(step);
    else {
      spinning.value = false;
      result.value = prize;
      if (prize.kind === 'drink') sounds.play('lose');
      else sounds.play('winner');
    }
  };
  raf = requestAnimationFrame(step);
}

function run() {
  if (spinning.value) return;
  store.resolveGame('wheel'); // server decides → game:event broadcast handles animation
}

// animate whenever a wheel result arrives (works for both TV & remote triggers)
watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'wheel') spinTo(e.payload.index, e.payload.prize);
});

onMounted(buildPixi);
onBeforeUnmount(() => { cancelAnimationFrame(raf); app?.destroy(true); });
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-3">
    <div class="relative" style="width: 380px; height: 380px">
      <!-- pointer -->
      <div class="absolute left-1/2 top-[-6px] z-[5] -translate-x-1/2" style="width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:28px solid #FFD93D;filter:drop-shadow(0 3px 1px rgba(0,0,0,.4))" />
      <div ref="host" />
      <div class="absolute left-1/2 top-1/2 z-[4] flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-outline shadow-hard-sm"
        style="background: linear-gradient(180deg, #FFE066, #FFC93C)">
        <Icon name="sparkles" :size="32" color="#2A1B4D" :stroke="2.4" />
      </div>
    </div>

    <Transition name="pop">
      <div v-if="result" class="mt-4 animate-pop rounded-[16px] border-[3px] border-outline px-6 py-2 font-head text-2xl font-extrabold"
        :style="{ background: result.color, color: '#2A1B4D' }">
        {{ result.label }}
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="spinning" @click="run">
      <Icon name="play" :size="20" color="#fff" />{{ spinning ? 'กำลังหมุน…' : 'หมุนวงล้อ!' }}
    </button>
  </div>
</template>
