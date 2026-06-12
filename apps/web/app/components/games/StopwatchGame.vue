<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
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
const done = ref(false);
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
    swRunning.value = true; done.value = false;
  }
}
function reset() { clearInterval(tick); swRunning.value = false; ms.value = 0; Object.keys(times).forEach((k) => delete times[k]); done.value = false; }
function record(id: string) { if (ms.value <= 0 || times[id] != null) return; times[id] = ms.value; sounds.play('click'); }
function setManual(id: string, sec: string) { const v = parseFloat(sec); if (isNaN(v)) delete times[id]; else times[id] = Math.max(0, v) * 1000; done.value = false; }
function announce() {
  if (Object.keys(times).length < 2) return;
  clearInterval(tick); swRunning.value = false;
  store.resolveGame('yk1', { times: { ...times } });
}
const sorted = computed(() => Object.keys(times).sort((a, b) => times[a] - times[b]));

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'yk1') { done.value = true; sounds.play('winner'); }
});
onBeforeUnmount(() => clearInterval(tick));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2.5">
    <!-- mode toggle -->
    <div class="mb-4 flex gap-2 rounded-[14px] p-[5px]" style="background:rgba(0,0,0,.22)">
      <button v-for="m in ([['auto', 'จับเวลาจากปุ่ม', 'timer'], ['manual', 'กรอกเวลาเอง', 'keyboard']] as const)" :key="m[0]"
        class="font-head flex items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-sm font-bold"
        :style="mode === m[0] ? { background: '#FFD93D', color: '#2A1B4D' } : { background: 'transparent', color: '#C9B6FF' }" @click="mode = m[0]">
        <Icon :name="m[2]" :size="16" :color="mode === m[0] ? '#2A1B4D' : '#C9B6FF'" />{{ m[1] }}
      </button>
    </div>

    <!-- AUTO -->
    <template v-if="mode === 'auto'">
      <div class="font-head rounded-[20px] border-4 border-outline px-[30px] py-2 text-[72px] font-extrabold tracking-[2px] text-white shadow-hard-btn" style="background:rgba(0,0,0,.25);text-shadow:0 0 18px rgba(255,217,61,.4);font-variant-numeric:tabular-nums">{{ fmt(ms) }}</div>
      <div class="mt-3.5 flex flex-wrap justify-center gap-2.5">
        <button class="font-head flex items-center gap-1.5 rounded-[14px] border-[3px] border-outline px-4 py-2.5 text-[15px] font-extrabold text-outline shadow-hard-sm" style="background:#FFD93D" @click="toggle"><Icon :name="swRunning ? 'pause' : 'play'" :size="17" color="#2A1B4D" />{{ swRunning ? 'หยุด' : 'เริ่มจับเวลา' }}</button>
        <button class="font-head flex items-center gap-1.5 rounded-[14px] border-[3px] border-outline px-4 py-2.5 text-[15px] font-extrabold text-outline shadow-hard-sm" style="background:#E9DDFF" @click="reset"><Icon name="rotate-ccw" :size="17" color="#2A1B4D" />รีเซ็ต</button>
        <button class="font-head flex items-center gap-1.5 rounded-[14px] border-[3px] border-outline px-4 py-2.5 text-[15px] font-extrabold text-outline shadow-hard-sm" style="background:#34D399" @click="announce"><Icon name="flag" :size="17" color="#2A1B4D" />ประกาศผล</button>
      </div>
      <span class="my-2.5 mt-2.5 text-sm font-medium text-[#C9B6FF]">แตะผู้เล่นเพื่อบันทึกเวลาที่ยกเสร็จ แล้วกด "ประกาศผล"</span>
      <div class="flex max-w-[680px] flex-wrap justify-center gap-2.5">
        <button v-for="p in store.roundPlayers" :key="p.id" class="flex flex-col items-center gap-0.5 rounded-[14px] px-2.5 py-2"
          :style="times[p.id] != null ? { background: 'rgba(52,211,153,.18)', border: '2.5px solid #34D399' } : { background: 'rgba(255,255,255,.06)', border: '2.5px dashed rgba(255,255,255,.25)' }" @click="record(p.id)">
          <PlayerAvatar :player="p" :size="58" />
          <span class="text-[13px] font-bold text-white">{{ p.nick }}</span>
          <span class="font-head text-xs font-bold" :style="{ color: times[p.id] != null ? '#34D399' : '#9a86bd' }">{{ times[p.id] != null ? fmt(times[p.id]) : 'แตะบันทึก' }}</span>
        </button>
      </div>
    </template>

    <!-- MANUAL -->
    <template v-else>
      <span class="mb-3 max-w-[440px] text-center text-sm font-medium text-[#C9B6FF]">กรรมการจับเวลาเอง แล้วกรอกเวลาของแต่ละคน (วินาที) — น้อยสุดชนะ มากสุดโดนยก</span>
      <div class="flex w-[400px] max-w-[94%] flex-col gap-2">
        <div v-for="p in store.roundPlayers" :key="p.id" class="flex items-center gap-2.5 rounded-[14px] border-2 border-white/15 bg-white/[.06] px-3 py-1.5">
          <PlayerAvatar :player="p" :size="54" />
          <span class="font-head flex-1 text-base font-bold text-white">{{ p.nick }}</span>
          <input type="number" min="0" step="0.01" :value="times[p.id] != null ? times[p.id] / 1000 : ''" placeholder="0.00"
            class="font-head w-24 rounded-[11px] border-[2.5px] border-accent-yellow bg-white px-2.5 py-2 text-right text-[17px] font-extrabold text-outline outline-none" @input="setManual(p.id, ($event.target as HTMLInputElement).value)" />
          <span class="w-[22px] text-[13px] font-semibold text-[#C9B6FF]">วิ</span>
        </div>
      </div>
      <div class="mt-3.5 flex gap-3">
        <button class="aofa-btn aofa-btn-pink px-[34px] py-3.5 text-[19px]" @click="announce"><Icon name="flag" :size="19" color="#fff" />ประกาศผล</button>
        <button class="aofa-btn aofa-btn-yellow px-[22px] py-3.5" @click="reset">ล้างเวลา</button>
      </div>
    </template>

    <!-- ranking -->
    <div v-if="sorted.length" class="mt-3.5 flex w-[320px] max-w-[90%] flex-col gap-1.5">
      <div v-for="(id, i) in sorted" :key="id" class="flex items-center gap-2.5 rounded-[12px] border-2 px-3 py-1"
        :style="i === 0 && done ? { background: '#FFD93D', borderColor: '#2A1B4D' } : { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.14)' }">
        <div class="font-head w-[22px] text-[15px] font-extrabold" :style="{ color: i === 0 && done ? '#2A1B4D' : '#C9B6FF' }">{{ i + 1 }}</div>
        <PlayerAvatar :player="store.playerById(id)" :size="i === 0 ? 64 : i === 1 ? 52 : 44" />
        <span class="font-head flex-1 text-[15px] font-bold" :style="{ color: i === 0 && done ? '#2A1B4D' : '#fff' }">{{ store.playerById(id)?.nick }}</span>
        <Icon v-if="done && i === 0" name="trophy" :size="18" color="#2A1B4D" />
        <Icon v-else-if="done && i === sorted.length - 1 && sorted.length > 1" name="beer" :size="18" color="#FF8080" />
        <span class="font-head text-sm font-bold" :style="{ color: i === 0 && done ? '#2A1B4D' : '#FFD93D' }">{{ fmt(times[id]) }}</span>
      </div>
    </div>
  </div>
</template>
