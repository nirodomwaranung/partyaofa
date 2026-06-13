<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const active = ref(false);
const holder = ref(0);
const exploded = ref(false);
const loserId = ref<string | null>(null);
const history = ref<any[]>([]);
let pass: any = null;

// The bomb passes hand-to-hand and *decelerates* so it lands exactly on the
// loser on the final beat, then explodes there — no snap/jump (which looked
// rigged). We plan a whole number of steps that ends on the target index.
function animate(targetId: string) {
  active.value = true; exploded.value = false; loserId.value = null; holder.value = 0;
  sounds.play('drum');
  const round = store.roundPlayers;
  const n = Math.max(1, round.length);
  const li = Math.max(0, round.findIndex((p) => p.id === targetId));
  const loops = 2 + Math.floor(Math.random() * 2);   // 2–3 full passes
  const totalSteps = loops * n + li;                 // ends on `li` (totalSteps % n === li)
  const SLOW_FROM = 8;                               // ease-out over the last beats
  let step = 0;
  clearTimeout(pass);

  const schedule = () => {
    const left = totalSteps - step;
    const k = SLOW_FROM - left + 1;                  // grows 1..SLOW_FROM as we approach
    const interval = left <= SLOW_FROM ? 110 + k * k * 8 : 110;
    pass = setTimeout(() => {
      step++;
      holder.value = step % n;
      if (left <= SLOW_FROM || step % 2 === 0) sounds.play('click'); // ticking, louder near the end
      if (step >= totalSteps) {
        active.value = false; exploded.value = true; loserId.value = targetId;
        const lp = store.playerById(targetId);
        history.value = [{ id: targetId, nick: lp?.nick ?? '' }, ...history.value].slice(0, 12);
        sounds.play('explosion');
        setTimeout(() => sounds.play('lose'), 200);
        return;
      }
      schedule();
    }, interval);
  };
  schedule();
}

function run() { if (!active.value) store.resolveGame('bomb'); }
function reset() { clearTimeout(pass); active.value = false; exploded.value = false; loserId.value = null; holder.value = 0; store.resetGame('bomb'); }
const loserP = () => (loserId.value ? store.playerById(loserId.value) : null);

watch(() => store.lastEvent, (e) => {
  if (!e) return;
  if (e.type === 'result' && e.gameKey === 'bomb') animate(e.payload.loserId);
  else if (e.type === 'reset' && (e.gameKey === 'bomb' || e.gameKey == null)) {
    clearTimeout(pass); active.value = false; exploded.value = false; loserId.value = null; holder.value = 0;
  }
});
onBeforeUnmount(() => clearTimeout(pass));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3">
    <span class="mb-0.5 text-sm font-medium text-[#C9B6FF]">ระเบิดวิ่งวนสุ่ม ใครถืออยู่ตอนระเบิด...โดนยก!</span>

    <div class="flex flex-wrap justify-center gap-5 px-0 pb-3 pt-10">
      <div v-for="(p, i) in store.roundPlayers" :key="p.id" class="relative flex flex-col items-center gap-1 transition-transform"
        :style="{ transform: (active || exploded) && holder === i ? 'translateY(-6px) scale(1.08)' : 'none' }">
        <div v-if="(active || exploded) && holder === i" class="absolute top-[-38px]"
          :style="{ animation: exploded && loserId === p.id ? 'pop .3s' : 'shake .25s infinite' }">
          <Icon :name="exploded && loserId === p.id ? 'flame' : 'bomb'" :size="30" :color="exploded && loserId === p.id ? '#FF6B6B' : '#FFD93D'" :fill="exploded && loserId === p.id ? '#FF6B6B' : 'none'" :stroke="2.2" />
        </div>
        <PlayerAvatar :player="p" :size="74" />
        <span class="text-sm font-bold" :style="{ color: exploded && loserId === p.id ? '#FF9090' : '#C9B6FF' }">{{ p.nick }}</span>
      </div>
    </div>

    <Transition name="pop">
      <div v-if="exploded && loserP()" class="mb-1.5 mt-2 flex items-center gap-2.5 rounded-[18px] border-[3px] border-outline bg-accent-red px-6 py-2.5 font-head text-[21px] font-extrabold text-outline shadow-hard-btn" style="animation: pop .4s">
        <Icon name="flame" :size="26" color="#2A1B4D" fill="#2A1B4D" :stroke="2.2" />{{ loserP()?.nick }} ถือตอนระเบิด — โดนยก!
      </div>
    </Transition>

    <div class="mt-3 flex gap-3">
      <button class="aofa-btn aofa-btn-pink px-[34px] py-3.5 text-[19px]" :disabled="active" @click="run">{{ active ? 'ระเบิดเดิน...' : 'จุดชนวน!' }}</button>
      <button class="aofa-btn aofa-btn-yellow px-[22px] py-3.5" @click="reset">รีเซ็ต</button>
    </div>

    <!-- who got blown up — history for this round -->
    <div v-if="history.length" class="mx-auto mt-4 w-[380px] max-w-[94%] rounded-[18px] border-[3px] border-outline bg-white p-3.5 shadow-hard-btn">
      <div class="font-head mb-2 flex items-center gap-1.5 text-[15px] font-extrabold text-outline"><Icon name="history" :size="16" color="#2A1B4D" />ประวัติคนโดนระเบิด</div>
      <div class="flex flex-col gap-1.5">
        <div v-for="(h, k) in history" :key="k" class="flex items-center gap-2.5 rounded-[11px] border-2 border-[#F6C6D2] bg-[#FCEEF1] px-2.5 py-1">
          <PlayerAvatar :player="store.playerById(h.id)" :size="30" />
          <span class="font-head flex-1 text-sm font-bold text-outline">{{ h.nick }}</span>
          <Icon name="flame" :size="14" color="#D6336C" />
          <span class="font-head text-xs font-extrabold text-[#D6336C]">โดนยก</span>
        </div>
      </div>
    </div>
  </div>
</template>
