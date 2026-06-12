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
let pass: any = null;

function animate(targetId: string) {
  active.value = true; exploded.value = false; loserId.value = null; holder.value = 0;
  sounds.play('drum');
  const round = store.roundPlayers;
  const dur = 5000 + Math.random() * 5000;
  const t0 = performance.now();
  clearInterval(pass);
  pass = setInterval(() => {
    holder.value = (holder.value + 1) % round.length;
    sounds.play('drum');
    if (performance.now() - t0 >= dur) {
      clearInterval(pass);
      const li = round.findIndex((p) => p.id === targetId);
      holder.value = li < 0 ? 0 : li;
      active.value = false; exploded.value = true; loserId.value = targetId;
      sounds.play('explosion');
      setTimeout(() => sounds.play('lose'), 200);
    }
  }, 700);
}

function run() { if (!active.value) store.resolveGame('bomb'); }
function reset() { clearInterval(pass); active.value = false; exploded.value = false; loserId.value = null; holder.value = 0; store.resetGame('bomb'); }
const loserP = () => (loserId.value ? store.playerById(loserId.value) : null);

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'bomb') animate(e.payload.loserId);
});
onBeforeUnmount(() => clearInterval(pass));
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
  </div>
</template>
