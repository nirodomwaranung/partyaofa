<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const mode = ref<'auto' | 'manual'>('auto');
const ms = ref(0);
const swRunning = ref(false);
const times = reactive<Record<string, number>>({});
const ranks = ref<any[] | null>(null);
let tick: any = null;

function fmt(m: number) {
  const mm = Math.floor(m / 60000), s = Math.floor(m / 1000) % 60, c = Math.floor(m / 10) % 100;
  return `${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
function toggle() {
  if (swRunning.value) { clearInterval(tick); swRunning.value = false; }
  else {
    const base = Date.now() - ms.value;
    clearInterval(tick);
    tick = setInterval(() => (ms.value = Date.now() - base), 50);
    swRunning.value = true;
  }
}
function reset() { clearInterval(tick); swRunning.value = false; ms.value = 0; Object.keys(times).forEach((k) => delete times[k]); ranks.value = null; }
function record(id: string) {
  if (ms.value <= 0 || times[id] != null) return;
  times[id] = ms.value;
  sounds.play('click');
}
function setManual(id: string, sec: string) {
  const v = parseFloat(sec);
  if (isNaN(v)) delete times[id];
  else times[id] = Math.max(0, v) * 1000;
}
function announce() {
  if (Object.keys(times).length < 2) return;
  clearInterval(tick); swRunning.value = false;
  store.resolveGame('yk1', { times: { ...times } });
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'yk1') {
    ranks.value = e.payload.ranks;
    sounds.play('winner');
  }
});
onBeforeUnmount(() => clearInterval(tick));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2">
    <div class="mb-3 flex gap-2">
      <button v-for="m in (['auto', 'manual'] as const)" :key="m" class="font-head rounded-[12px] border-[2.5px] border-outline px-4 py-1.5 text-sm font-bold"
        :style="mode === m ? { background: '#FFD93D', color: '#2A1B4D' } : { background: '#fff', opacity: .6, color: '#2A1B4D' }" @click="mode = m">
        {{ m === 'auto' ? 'กดจับเวลา' : 'กรอกเวลาเอง' }}
      </button>
    </div>

    <template v-if="mode === 'auto'">
      <div class="font-head text-[64px] font-extrabold text-accent-yellow" style="font-variant-numeric: tabular-nums">{{ fmt(ms) }}</div>
      <div class="mb-3 flex gap-2">
        <button class="aofa-btn aofa-btn-green px-6 py-2.5" @click="toggle">{{ swRunning ? 'หยุด' : 'เริ่มจับเวลา' }}</button>
        <button class="aofa-btn aofa-btn-yellow px-5 py-2.5" @click="reset">รีเซ็ต</button>
      </div>
      <span class="mb-2 text-sm text-[#C9B6FF]">แตะผู้เล่นเพื่อบันทึกเวลาที่ยกเสร็จ</span>
      <div class="flex flex-wrap justify-center gap-2">
        <button v-for="p in store.roundPlayers" :key="p.id" class="flex flex-col items-center gap-1 rounded-[12px] border-2 px-3 py-2"
          :class="times[p.id] != null ? 'border-accent-green bg-white/10' : 'border-white/15'" @click="record(p.id)">
          <PlayerAvatar :player="p" :size="44" />
          <span class="font-head text-sm font-bold text-white">{{ p.nick }}</span>
          <span v-if="times[p.id] != null" class="text-xs font-bold text-accent-green">{{ fmt(times[p.id]) }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <span class="mb-3 max-w-md text-center text-sm text-[#C9B6FF]">กรรมการจับเวลาเอง แล้วกรอกเวลาของแต่ละคน (วินาที) — น้อยสุดชนะ มากสุดโดนยก</span>
      <div class="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
        <div v-for="p in store.roundPlayers" :key="p.id" class="flex items-center gap-2 rounded-[12px] bg-white/10 px-2 py-1.5">
          <PlayerAvatar :player="p" :size="30" />
          <span class="font-head flex-1 truncate text-sm font-bold text-white">{{ p.nick }}</span>
          <input type="number" step="0.1" min="0" placeholder="วินาที" class="w-16 rounded-lg border-2 border-outline px-1 py-0.5 text-center text-outline"
            @input="setManual(p.id, ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
    </template>

    <div v-if="ranks" class="mt-4 w-full max-w-md space-y-1">
      <div v-for="(r, i) in ranks" :key="r.id" class="flex items-center gap-2 rounded-[10px] px-3 py-1.5"
        :style="{ background: i === 0 ? '#34D399' : i === ranks.length - 1 ? '#FF6B6B' : 'rgba(255,255,255,.1)' }">
        <span class="font-head w-6 font-extrabold text-white">{{ r.rank }}</span>
        <span class="font-head flex-1 font-bold text-white">{{ store.playerById(r.id)?.nick }}</span>
        <span class="text-sm font-bold text-white">{{ fmt(r.ms) }}</span>
      </div>
    </div>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" @click="announce">
      <Icon name="flag" :size="20" color="#fff" />ประกาศผล!
    </button>
  </div>
</template>
