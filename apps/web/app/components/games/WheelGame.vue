<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

// Prize table — must match the server (game-engine/constants.ts WHEEL).
const WHEEL = [
  { label: 'เงิน 500', icon: 'banknote', color: '#6BCB77', kind: 'cash' },
  { label: 'Voucher', icon: 'ticket', color: '#4D96FF', kind: 'cash' },
  { label: 'รอดตัว', icon: 'shield-check', color: '#A0E548', kind: 'safe' },
  { label: 'ยก 1 ช็อต', icon: 'beer', color: '#FF9F45', kind: 'drink' },
  { label: 'เงิน 1,000', icon: 'coins', color: '#FFD93D', kind: 'cash' },
  { label: 'ยก 3 ช็อต', icon: 'beer', color: '#FF6B6B', kind: 'drink' },
  { label: 'JACKPOT', icon: 'sparkles', color: '#C780FA', kind: 'jackpot' },
  { label: 'รอดตัว', icon: 'shield-check', color: '#22D3EE', kind: 'safe' },
];
const SEG = 360 / WHEEL.length;
const stops = WHEEL.map((p, i) => `${p.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(',');

const angle = ref(0);
const spinning = ref(false);
const result = ref<any>(null);
let raf = 0;

function spinTo(idx: number, prize: any) {
  spinning.value = true;
  result.value = null;
  sounds.play('drum');
  const cur = angle.value;
  const curMod = ((cur % 360) + 360) % 360;
  const desired = (360 - (idx * SEG + SEG / 2)) % 360;
  const delta = ((desired - curMod + 360) % 360) + 360 * 5;
  const start = cur, end = cur + delta, dur = 4000, t0 = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  cancelAnimationFrame(raf);
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    angle.value = start + (end - start) * ease(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else {
      angle.value = end;
      spinning.value = false;
      result.value = { ...WHEEL[idx], ...prize };
      if (prize.kind === 'drink') sounds.play('lose');
      else sounds.play(prize.kind === 'jackpot' ? 'jackpot' : 'winner');
    }
  };
  raf = requestAnimationFrame(step);
}

function run() {
  if (spinning.value) return;
  store.resolveGame('wheel');
}
const spotName = computed(() => store.spotlight?.nick ?? '');
const subtitle = (kind: string) => (kind === 'drink' ? 'ซดเลย!' : kind === 'safe' ? 'รอดไปอีกตา' : 'ยินดีด้วย!');

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'wheel') spinTo(e.payload.index, e.payload.prize);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-3.5">
    <div class="relative" style="width: 380px; height: 380px">
      <!-- pointer -->
      <div class="absolute left-1/2 top-[-6px] z-[5] -translate-x-1/2"
        style="width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:28px solid #FFD93D;filter:drop-shadow(0 3px 1px rgba(0,0,0,.4))" />
      <!-- wheel -->
      <div class="absolute inset-0 rounded-full"
        :style="{ border: '8px solid #2A1B4D', background: `conic-gradient(${stops})`, boxShadow: '0 0 0 6px #FFD93D, 0 14px 0 rgba(0,0,0,.3)', transform: `rotate(${angle}deg)` }">
        <div v-for="(p, i) in WHEEL" :key="i" class="absolute left-1/2 top-1/2"
          style="width:0;height:0" :style="{ transform: `rotate(${i * SEG + SEG / 2}deg)` }">
          <div class="absolute flex flex-col items-center gap-0.5" style="left:-32px;top:-170px;width:64px;color:#2A1B4D">
            <Icon :name="p.icon" :size="24" color="#2A1B4D" :stroke="2.4" />
            <div class="font-head text-center text-[11px] font-bold" style="text-shadow:0 1px 0 rgba(255,255,255,.4)">{{ p.label }}</div>
          </div>
        </div>
      </div>
      <!-- center hub -->
      <div class="absolute left-1/2 top-1/2 z-[4] flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-outline shadow-hard-sm"
        style="background: linear-gradient(180deg, #FFE066, #FFC93C)">
        <Icon name="sparkles" :size="32" color="#2A1B4D" :stroke="2.4" />
      </div>
    </div>

    <Transition name="pop">
      <div v-if="result" class="mb-1.5 mt-[18px] flex items-center gap-3 rounded-[18px] border-[3px] border-outline px-[22px] py-2.5 shadow-hard-btn"
        style="animation: pop .4s" :style="{ background: result.color }">
        <Icon :name="result.icon" :size="32" color="#2A1B4D" :stroke="2.4" />
        <div>
          <div class="font-head text-[22px] font-extrabold text-outline">{{ spotName ? spotName + ' ' : '' }}ได้ {{ result.label }}</div>
          <div class="text-[13px] font-semibold text-outline/70">{{ subtitle(result.kind) }}</div>
        </div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-[18px] px-[34px] py-3.5 text-[19px]" :disabled="spinning" @click="run">
      {{ spinning ? 'กำลังหมุน...' : 'หมุนวงล้อ!' }}
    </button>
  </div>
</template>
