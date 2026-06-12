<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const picks = reactive<Record<string, number>>({});
const rolling = ref(false);
const display = ref<number | null>(null);
const center = ref<number | null>(null);
const ranks = ref<any[] | null>(null);
let timer: any = null;

function animate(target: number, ranked: any[]) {
  rolling.value = true;
  ranks.value = null;
  center.value = null;
  sounds.play('drum');
  const t0 = performance.now();
  const dur = 8000;
  const tick = () => {
    const el = performance.now() - t0;
    if (el >= dur) {
      display.value = target;
      center.value = target;
      ranks.value = ranked;
      rolling.value = false;
      sounds.play('winner');
      return;
    }
    display.value = 1 + Math.floor(Math.random() * 100);
    const pr = el / dur;
    timer = setTimeout(tick, 40 + pr * pr * 480);
  };
  tick();
}

function run() {
  if (rolling.value) return;
  const payload: Record<string, number> = {};
  store.roundPlayers.forEach((p) => (payload[p.id] = picks[p.id] ?? 50));
  store.resolveGame('number', { picks: payload });
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'number') animate(e.payload.center, e.payload.ranks);
});
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2.5">
    <div class="font-head flex h-[120px] w-[200px] items-center justify-center rounded-[22px] border-4 border-outline text-[72px] font-extrabold shadow-hard-lg"
      :style="{ background: rolling ? '#2A1850' : '#FFD93D', color: rolling ? '#FFD93D' : '#2A1B4D' }">
      {{ display ?? '?' }}
    </div>
    <span class="my-2 text-sm text-[#C9B6FF]">ผู้เล่นแต่ละคนเลือกเลข 1–100 — ใกล้เลขกลางสุดชนะ ไกลสุดโดนยก</span>

    <div class="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
      <div v-for="p in store.roundPlayers" :key="p.id" class="flex items-center gap-2 rounded-[12px] bg-white/10 px-2 py-1.5">
        <PlayerAvatar :player="p" :size="32" />
        <span class="font-head flex-1 truncate text-sm font-bold text-white">{{ p.nick }}</span>
        <input type="number" min="1" max="100" :value="picks[p.id] ?? 50" :disabled="rolling"
          class="w-14 rounded-lg border-2 border-outline px-1 py-0.5 text-center text-outline" @input="picks[p.id] = +($event.target as HTMLInputElement).value" />
      </div>
    </div>

    <div v-if="ranks" class="mt-4 w-full max-w-md space-y-1">
      <div v-for="(r, i) in ranks" :key="r.id" class="flex items-center gap-2 rounded-[10px] px-3 py-1.5"
        :style="{ background: i === 0 ? '#34D399' : i === ranks.length - 1 ? '#FF6B6B' : 'rgba(255,255,255,.1)' }">
        <span class="font-head w-6 font-extrabold text-white">{{ i + 1 }}</span>
        <span class="font-head flex-1 font-bold text-white">{{ store.playerById(r.id)?.nick }}</span>
        <span class="text-sm font-bold text-white">เลข {{ r.pick }} (ห่าง {{ r.dist }})</span>
      </div>
    </div>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="rolling" @click="run">
      <Icon name="hash" :size="20" color="#fff" />{{ rolling ? 'กำลังสุ่ม…' : 'สุ่มเลขกลาง!' }}
    </button>
  </div>
</template>
