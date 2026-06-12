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
  active.value = true;
  exploded.value = false;
  loserId.value = null;
  holder.value = 0;
  sounds.play('drum');
  const round = store.roundPlayers;
  const dur = 4000 + Math.random() * 4000;
  const t0 = performance.now();
  clearInterval(pass);
  pass = setInterval(() => {
    holder.value = (holder.value + 1) % round.length;
    sounds.play('click');
    if (performance.now() - t0 >= dur) {
      clearInterval(pass);
      const li = round.findIndex((p) => p.id === targetId);
      holder.value = li < 0 ? 0 : li;
      active.value = false;
      exploded.value = true;
      loserId.value = targetId;
      sounds.play('explosion');
      setTimeout(() => sounds.play('lose'), 200);
    }
  }, 700);
}

function run() {
  if (active.value) return;
  store.resolveGame('bomb');
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'bomb') animate(e.payload.loserId);
});
onBeforeUnmount(() => clearInterval(pass));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3">
    <span class="mb-2 text-sm text-[#C9B6FF]">ระเบิดวิ่งวนสุ่ม ใครถืออยู่ตอนระเบิด...โดนยก!</span>

    <div class="flex flex-wrap justify-center gap-4">
      <div v-for="(p, i) in store.roundPlayers" :key="p.id" class="relative flex flex-col items-center gap-1 transition"
        :class="active && holder === i ? 'scale-110' : ''">
        <PlayerAvatar :player="p" :size="60" />
        <span class="font-head text-sm font-bold text-white">{{ p.nick }}</span>
        <div v-if="(active || exploded) && holder === i" class="absolute -top-7 text-3xl"
          :class="exploded && loserId === p.id ? 'animate-pop' : ''" style="animation: floaty 0.6s infinite">
          <Icon :name="exploded && loserId === p.id ? 'flame' : 'bomb'" :size="30" :color="exploded ? '#FF6B6B' : '#FFD93D'" />
        </div>
      </div>
    </div>

    <Transition name="pop">
      <div v-if="exploded && loserId" class="mt-5 animate-pop rounded-[16px] border-[3px] border-outline bg-accent-red px-6 py-3 text-center">
        <div class="font-head text-2xl font-extrabold text-white">💥 {{ store.playerById(loserId)?.nick }} โดนยก!</div>
      </div>
    </Transition>

    <div class="mt-4 flex gap-3">
      <button class="aofa-btn aofa-btn-pink px-8 py-3.5 text-lg" :disabled="active" @click="run">
        <Icon name="bomb" :size="20" color="#fff" />{{ active ? 'กำลังส่ง…' : 'จุดชนวน!' }}
      </button>
      <button class="aofa-btn aofa-btn-yellow px-5 py-3.5" @click="store.resetGame('bomb'); exploded = false; loserId = null">รีเซ็ต</button>
    </div>
  </div>
</template>
