<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const POOL = ['coins', 'beer', 'sparkles', 'gift', 'gem', 'bell', 'star', 'cherry'];
const COLOR: Record<string, string> = { coins: '#FFD93D', beer: '#FF9F45', sparkles: '#C780FA', gift: '#FF7A59', gem: '#22D3EE', bell: '#FFB84C', star: '#FFD93D', cherry: '#FF6B6B' };

const spinning = ref(false);
const result = ref<any>(null);
const reels = ref<string[][]>([[], [], []]);
const finalSyms = ref<string[]>(['help-circle', 'help-circle', 'help-circle']);
const spinningReel = ref([false, false, false]);
const history = ref<any[]>([]);

function randStrip(final: string) {
  const a = Array.from({ length: 24 }, () => POOL[Math.floor(Math.random() * POOL.length)]);
  a.push(final);
  return a;
}

function animate(syms: string[], res: any) {
  spinning.value = true;
  result.value = null;
  reels.value = syms.map((s) => randStrip(s));
  spinningReel.value = [true, true, true];
  finalSyms.value = ['help-circle', 'help-circle', 'help-circle'];
  sounds.play('drum');
  const durs = [1400, 2200, 3000];
  durs.forEach((d, i) => {
    setTimeout(() => {
      spinningReel.value[i] = false;
      finalSyms.value[i] = syms[i];
      sounds.play('click');
      if (i === 2) finish(syms, res);
    }, d);
  });
}

function finish(syms: string[], res: any) {
  spinning.value = false;
  result.value = res;
  const sp = store.spotlight;
  history.value = [{ nick: sp?.nick ?? '', label: res.label, win: res.kind === 'cash' || res.kind === 'jackpot', drink: res.kind === 'drink' }, ...history.value].slice(0, 8);
  if (res.kind === 'drink' || res.kind === 'none') sounds.play('lose');
  else sounds.play(res.kind === 'jackpot' ? 'jackpot' : 'winner');
}

function run() {
  if (spinning.value) return;
  store.resolveGame('slot');
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'slot') animate(e.payload.syms, e.payload.result);
});
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-5">
    <div class="flex gap-3 rounded-[24px] border-4 border-outline p-4 shadow-hard-lg" style="background: linear-gradient(180deg, #6D28D9, #4C1D95)">
      <div v-for="(s, i) in finalSyms" :key="i"
        class="flex h-[110px] w-[88px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-outline bg-white"
        :class="spinningReel[i] ? 'reel-spin' : ''">
        <Icon :name="s" :size="56" :color="COLOR[s] || '#2A1B4D'" :stroke="2.2" />
      </div>
    </div>

    <Transition name="pop">
      <div v-if="result" class="mt-4 animate-pop rounded-[16px] border-[3px] border-outline px-6 py-2 font-head text-2xl font-extrabold"
        :style="{ background: result.color, color: '#fff' }">
        {{ result.label }}
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="spinning" @click="run">
      <Icon name="cherry" :size="20" color="#fff" />{{ spinning ? 'กำลังหมุน…' : 'หมุนสล็อต!' }}
    </button>

    <div v-if="history.length" class="mt-5 w-full max-w-md">
      <div class="mb-1 text-center text-xs font-bold text-[#C9B6FF]">ประวัติแพ้-ชนะ</div>
      <div class="flex flex-wrap justify-center gap-1.5">
        <span v-for="(h, i) in history" :key="i" class="rounded-lg px-2 py-0.5 text-xs font-bold"
          :style="{ background: h.win ? '#34D399' : h.drink ? '#FF6B6B' : '#9a86bd', color: '#fff' }">
          {{ h.nick }}: {{ h.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes reelblur {
  0% { transform: translateY(0); }
  100% { transform: translateY(-20px); }
}
.reel-spin :deep(svg) {
  animation: reelblur 0.08s linear infinite;
  filter: blur(1.5px);
}
</style>
