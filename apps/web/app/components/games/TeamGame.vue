<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const isBoxing = computed(() => props.gameKey === 'boxing');
const sideA = computed(() => (isBoxing.value ? 'blue' : 'tiger'));
const sideB = computed(() => (isBoxing.value ? 'red' : 'dragon'));
const labelA = computed(() => (isBoxing.value ? 'ทีมน้ำเงิน' : '🐯 เสือ'));
const labelB = computed(() => (isBoxing.value ? 'ทีมแดง' : '🐲 มังกร'));
const colorA = computed(() => (isBoxing.value ? '#4D96FF' : '#FB923C'));
const colorB = computed(() => (isBoxing.value ? '#FF6B6B' : '#10B981'));

const sides = reactive<Record<string, string>>({});
const fighting = ref(false);
const hp = reactive({ a: 100, b: 100 });
const winner = ref<string | null>(null);
let loop: any = null;

function toggleSide(id: string) {
  if (fighting.value) return;
  sides[id] = sides[id] === sideB.value ? sideA.value : sides[id] === sideA.value ? sideB.value : sideB.value;
}

function teamOf(side: string) {
  return store.roundPlayers.filter((p, i) => (sides[p.id] ?? (i % 2 ? sideB.value : sideA.value)) === side);
}

function animate(win: string, assigned: Record<string, string>) {
  Object.assign(sides, assigned);
  fighting.value = true;
  winner.value = null;
  hp.a = 100; hp.b = 100;
  sounds.play('drum');
  const t0 = performance.now();
  const dur = isBoxing.value ? 8000 : 6000;
  clearInterval(loop);
  loop = setInterval(() => {
    const el = performance.now() - t0;
    // bias damage toward the loser
    const loseKey = win === sideA.value ? 'b' : 'a';
    hp[loseKey as 'a' | 'b'] = Math.max(8, 100 - (el / dur) * 92 - Math.random() * 6);
    const winKey = win === sideA.value ? 'a' : 'b';
    hp[winKey as 'a' | 'b'] = Math.max(40, 100 - (el / dur) * 25);
    sounds.play('click');
    if (el >= dur) {
      clearInterval(loop);
      fighting.value = false;
      winner.value = win;
      sounds.play('winner');
    }
  }, isBoxing.value ? 650 : 500);
}

function run() {
  if (fighting.value) return;
  store.resolveGame(props.gameKey, { sides: { ...sides } });
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === props.gameKey) animate(e.payload.winner, e.payload.sides);
});
onBeforeUnmount(() => clearInterval(loop));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2">
    <!-- side picker -->
    <div v-if="!fighting && !winner" class="mb-3 flex flex-wrap justify-center gap-2">
      <button v-for="p in store.roundPlayers" :key="p.id" class="flex items-center gap-1.5 rounded-[10px] border-2 px-2 py-1"
        :style="{ borderColor: (sides[p.id] ?? sideA) === sideA ? colorA : colorB }" @click="toggleSide(p.id)">
        <PlayerAvatar :player="p" :size="26" />
        <span class="font-head text-xs font-bold text-white">{{ p.nick }}</span>
      </button>
    </div>

    <!-- arena -->
    <div class="grid w-full max-w-2xl grid-cols-2 gap-4">
      <div v-for="(side, idx) in [sideA, sideB]" :key="side" class="rounded-[18px] border-[3px] border-outline p-3"
        :style="{ background: (idx ? colorB : colorA) + '22', borderColor: idx ? colorB : colorA }">
        <div class="font-head mb-2 text-center text-lg font-extrabold text-white">{{ idx ? labelB : labelA }}</div>
        <div v-if="isBoxing" class="mb-2 h-3 overflow-hidden rounded-full bg-black/30">
          <div class="h-full transition-all" :style="{ width: (idx ? hp.b : hp.a) + '%', background: idx ? colorB : colorA }" />
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <div v-for="p in teamOf(side)" :key="p.id" class="flex flex-col items-center"
            :class="fighting ? 'animate-pop' : ''">
            <PlayerAvatar :player="p" :size="40" />
            <span class="font-head text-xs font-bold text-white">{{ p.nick }}</span>
          </div>
        </div>
      </div>
    </div>

    <Transition name="pop">
      <div v-if="winner" class="mt-5 animate-pop rounded-[16px] border-[3px] border-outline px-6 py-3 text-center"
        :style="{ background: winner === sideA ? colorA : colorB }">
        <div class="font-head text-2xl font-extrabold text-white">🏆 {{ winner === sideA ? labelA : labelB }} ชนะ!</div>
        <div class="text-sm font-bold text-white/90">ทีมแพ้โดนยกทั้งทีม 🍺</div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="fighting" @click="run">
      <Icon name="swords" :size="20" color="#fff" />{{ fighting ? 'กำลังสู้…' : 'เริ่มศึก!' }}
    </button>
  </div>
</template>
