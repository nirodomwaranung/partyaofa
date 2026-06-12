<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const INFO: Record<string, { back: string; hint: string; bg: string }> = {
  card: { back: 'help-circle', hint: 'แตะการ์ด 1 ใบเพื่อเปิดดวง', bg: 'linear-gradient(160deg,#8B5CF6,#5B2EAE)' },
  box: { back: 'package', hint: 'แตะกล่องปริศนา 1 ใบ', bg: 'linear-gradient(160deg,#38BDF8,#1D4ED8)' },
};
const info = () => INFO[props.gameKey] || INFO.card;

const picked = ref<number | null>(null);
const reward = ref<any>(null);
const cards = ref(Array.from({ length: 8 }, (_, i) => i));
const history = ref<any[]>([]);

function deal() {
  picked.value = null;
  reward.value = null;
  cards.value = cards.value.slice().sort(() => Math.random() - 0.5);
}

function pick(i: number) {
  if (picked.value != null) return;
  store.resolveGame(props.gameKey, { index: i });
}

function reveal(index: number, rw: any) {
  picked.value = index;
  reward.value = rw;
  const sp = store.spotlight;
  history.value = [{ nick: sp?.nick ?? '', label: rw.label, win: rw.kind === 'cash' || rw.kind === 'jackpot', drink: rw.kind === 'drink' }, ...history.value].slice(0, 10);
  if (rw.kind === 'drink') sounds.play('lose');
  else sounds.play(rw.kind === 'jackpot' ? 'jackpot' : 'winner');
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === props.gameKey) reveal(e.payload.index, e.payload.reward);
});
onMounted(deal);
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2">
    <span class="mb-3 text-sm text-[#C9B6FF]">{{ info().hint }} — <b class="text-accent-yellow">{{ store.spotlight?.nick }}</b> กำลังเล่น</span>

    <div class="grid grid-cols-4 gap-3">
      <button v-for="(c, i) in cards" :key="i"
        class="flex aspect-[3/4] w-[92px] items-center justify-center rounded-[16px] border-[3px] border-outline shadow-hard-sm transition"
        :class="picked === i ? 'animate-pop' : picked == null ? 'hover:-translate-y-1' : 'opacity-40'"
        :style="picked === i ? { background: '#fff' } : { background: info().bg }"
        :disabled="picked != null" @click="pick(i)">
        <Icon v-if="picked === i && reward" :name="reward.icon" :size="40" :color="reward.kind === 'drink' ? '#FF6B6B' : '#6D28D9'" />
        <Icon v-else :name="info().back" :size="36" color="#fff" />
      </button>
    </div>

    <Transition name="pop">
      <div v-if="reward" class="mt-4 animate-pop rounded-[16px] border-[3px] border-outline px-6 py-2 font-head text-2xl font-extrabold"
        :style="{ background: reward.kind === 'drink' ? '#FF6B6B' : '#34D399', color: '#fff' }">
        {{ reward.label }}
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" @click="deal">
      <Icon name="shuffle" :size="20" color="#fff" />สับใหม่
    </button>

    <div v-if="history.length" class="mt-4 flex flex-wrap justify-center gap-1.5">
      <span v-for="(h, i) in history" :key="i" class="rounded-lg px-2 py-0.5 text-xs font-bold"
        :style="{ background: h.win ? '#34D399' : h.drink ? '#FF6B6B' : '#9a86bd', color: '#fff' }">
        {{ h.nick }}: {{ h.label }}
      </span>
    </div>
  </div>
</template>
