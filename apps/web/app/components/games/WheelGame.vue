<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

// Slice colors — must match the API (game-engine WHEEL_PALETTE) so the
// landed slice color equals the result banner color.
const PALETTE = ['#6BCB77', '#4D96FF', '#FFD93D', '#FF9F45', '#C780FA', '#FF6B6B', '#22D3EE', '#A0E548', '#F368A8', '#5CE1E6', '#FFB84C', '#34D399'];

// Wheel slices come from the admin reward list ("รางวัลในกล่อง").
const slices = computed(() =>
  store.rewards.map((r, i) => ({ label: r.label, icon: r.icon, img: r.img, color: PALETTE[i % PALETTE.length] })),
);
const SEG = computed(() => 360 / Math.max(1, slices.value.length));
const stops = computed(() => slices.value.map((s, i) => `${s.color} ${i * SEG.value}deg ${(i + 1) * SEG.value}deg`).join(','));

const angle = ref(0);
const spinning = ref(false);
const result = ref<any>(null);
let raf = 0;

function spinTo(idx: number, prize: any) {
  const seg = 360 / Math.max(1, slices.value.length);
  spinning.value = true;
  result.value = null;
  sounds.play('drum');
  const cur = angle.value;
  const curMod = ((cur % 360) + 360) % 360;
  const desired = (360 - (idx * seg + seg / 2)) % 360;
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
      result.value = prize;
      if (prize.kind === 'drink') sounds.play('lose');
      else {
        sounds.play(prize.kind === 'jackpot' ? 'jackpot' : 'winner');
        store.celebrate(`${spotName.value ? spotName.value + ' ' : ''}ได้ ${prize.label}`, prize.kind === 'jackpot' ? '🎰 แจ็กพ็อต!' : '🏆');
      }
    }
  };
  raf = requestAnimationFrame(step);
}

function run() {
  if (spinning.value) return;
  if (!slices.value.length) { alert('ยังไม่มีรางวัลในกล่อง — เพิ่มที่หน้า Game Master ก่อน'); return; }
  store.resolveGame('wheel');
}
const spotName = computed(() => store.spotlight?.nick ?? '');
const subtitle = (kind: string) => (kind === 'drink' ? 'ซดเลย!' : kind === 'safe' ? 'รอดไปอีกตา' : 'ยินดีด้วย!');
// shrink labels when there are many slices
const labelSize = computed(() => (slices.value.length > 10 ? 9 : slices.value.length > 7 ? 10 : 11));
const iconSize = computed(() => (slices.value.length > 10 ? 18 : 22));

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'wheel') spinTo(e.payload.index, e.payload.prize);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-3.5">
    <div v-if="!slices.length" class="py-10 text-center text-[#C9B6FF]">
      ยังไม่มีรางวัลในกล่อง — เพิ่มที่หน้า <b class="text-accent-yellow">Game Master</b> ก่อน
    </div>

    <div v-else class="relative" style="width: 380px; height: 380px">
      <!-- pointer -->
      <div class="absolute left-1/2 top-[-6px] z-[5] -translate-x-1/2"
        style="width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:28px solid #FFD93D;filter:drop-shadow(0 3px 1px rgba(0,0,0,.4))" />
      <!-- wheel -->
      <div class="absolute inset-0 rounded-full"
        :style="{ border: '8px solid #2A1B4D', background: `conic-gradient(${stops})`, boxShadow: '0 0 0 6px #FFD93D, 0 14px 0 rgba(0,0,0,.3)', transform: `rotate(${angle}deg)` }">
        <div v-for="(sl, i) in slices" :key="i" class="absolute left-1/2 top-1/2"
          style="width:0;height:0" :style="{ transform: `rotate(${i * SEG + SEG / 2}deg)` }">
          <div class="absolute flex flex-col items-center gap-0.5" style="left:-34px;top:-172px;width:68px;color:#2A1B4D">
            <div v-if="sl.img" class="rounded-full border-2 border-outline bg-cover bg-center" :style="{ width: iconSize + 4 + 'px', height: iconSize + 4 + 'px', backgroundImage: `url(${sl.img})` }" />
            <Icon v-else :name="sl.icon" :size="iconSize" color="#2A1B4D" :stroke="2.4" />
            <div class="font-head text-center font-bold leading-tight" :style="{ fontSize: labelSize + 'px', textShadow: '0 1px 0 rgba(255,255,255,.4)' }">{{ sl.label }}</div>
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
        <div v-if="result.img" class="h-9 w-9 rounded-lg border-2 border-outline bg-cover bg-center" :style="{ backgroundImage: `url(${result.img})` }" />
        <Icon v-else :name="result.icon" :size="32" color="#2A1B4D" :stroke="2.4" />
        <div>
          <div class="font-head text-[22px] font-extrabold text-outline">{{ spotName ? spotName + ' ' : '' }}ได้ {{ result.label }}</div>
          <div class="text-[13px] font-semibold text-outline/70">{{ subtitle(result.kind) }}</div>
        </div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-[18px] px-[34px] py-3.5 text-[19px]" :disabled="spinning || !slices.length" @click="run">
      {{ spinning ? 'กำลังหมุน...' : 'หมุนวงล้อ!' }}
    </button>
  </div>
</template>
