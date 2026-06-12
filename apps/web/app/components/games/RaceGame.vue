<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const running = ref(false);
const pos = reactive<Record<string, number>>({});
const ranks = ref<string[] | null>(null);
const done = ref(false);
let raf = 0;

// horse race is slower & longer than the foot race (Spec §5)
const isHorse = () => props.gameKey === 'horse';

function animate(winnerId: string, order: string[]) {
  const round = store.roundPlayers;
  if (round.length < 2) return;
  running.value = true;
  done.value = false;
  ranks.value = null;
  round.forEach((p) => (pos[p.id] = 2));

  // finishing time grows with rank position; winner shortest
  const baseDur = isHorse() ? 16 : 3.4;
  const durs: Record<string, number> = {};
  order.forEach((id, i) => {
    durs[id] = baseDur + i * (isHorse() ? 0.5 : 0.45) + Math.random() * 0.6;
  });
  const winDur = durs[winnerId];
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const t0 = performance.now();
  sounds.play('drum');
  cancelAnimationFrame(raf);

  const step = (now: number) => {
    const el = (now - t0) / 1000;
    round.forEach((p) => {
      const t = Math.min(1, el / durs[p.id]);
      pos[p.id] = 2 + 96 * ease(t);
    });
    if (el < winDur + 0.1) raf = requestAnimationFrame(step);
    else {
      pos[winnerId] = 98;
      running.value = false;
      done.value = true;
      ranks.value = order;
      sounds.play('winner');
    }
  };
  raf = requestAnimationFrame(step);
}

function run() {
  if (running.value) return;
  store.resolveGame(props.gameKey);
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && (e.gameKey === 'horse' || e.gameKey === 'race')) animate(e.payload.winnerId, e.payload.ranks);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3">
    <div class="w-full max-w-3xl space-y-2">
      <div v-for="(p, i) in store.roundPlayers" :key="p.id"
        class="relative flex h-[58px] items-center overflow-hidden rounded-[14px] border-2 border-white/15"
        :style="{ background: i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)' }">
        <!-- finish line -->
        <div class="absolute right-2 top-0 h-full w-1.5" style="background: repeating-linear-gradient(0deg,#fff 0 6px,#2A1B4D 6px 12px)" />
        <div class="absolute transition-none" :style="{ left: (pos[p.id] ?? 2) + '%', transform: 'translateX(-50%)' }">
          <div class="flex flex-col items-center">
            <span class="text-2xl">{{ isHorse() ? '🐴' : '🏃' }}</span>
            <PlayerAvatar :player="p" :size="34" />
          </div>
        </div>
        <span class="font-head absolute left-2 text-xs font-bold text-white/60">{{ p.nick }}</span>
      </div>
    </div>

    <div v-if="ranks" class="mt-4 flex gap-3">
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
      <button class="aofa-btn aofa-btn-yellow px-5 py-3.5" @click="store.resetGame(gameKey); ranks = null; done = false" :disabled="running">รีเซ็ต</button>
    </div>
  </div>
</template>
