<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const active = ref(false);
const victimId = ref<string | null>(null);
const turn = ref(0);
const revealed = reactive<Record<number, 'safe' | 'bomb'>>({});
const loserId = ref<string | null>(null);

const current = computed(() => store.roundPlayers[turn.value % Math.max(1, store.roundPlayers.length)] ?? null);

function start(target: string) {
  active.value = true;
  victimId.value = target;
  turn.value = 0;
  loserId.value = null;
  Object.keys(revealed).forEach((k) => delete revealed[+k]);
  sounds.play('click');
}

function clickTile(idx: number) {
  if (!active.value || revealed[idx]) return;
  const cur = current.value;
  if (!cur) return;
  if (cur.id === victimId.value) {
    revealed[idx] = 'bomb';
    active.value = false;
    loserId.value = cur.id;
    sounds.play('explosion');
    setTimeout(() => sounds.play('lose'), 200);
  } else {
    revealed[idx] = 'safe';
    turn.value++;
    sounds.play('click');
  }
}

function run() {
  if (active.value) return;
  store.resolveGame('mine'); // server picks victim + applies stats
}

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'mine') start(e.payload.victimId);
});
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3">
    <div v-if="active && current" class="mb-3 font-head text-lg font-bold text-white">
      ตาของ <span class="text-accent-yellow">{{ current.nick }}</span> — แตะช่องที่จะเหยียบ
    </div>
    <div v-else-if="!loserId" class="mb-3 text-sm text-[#C9B6FF]">ผลัดกันเดินทุ่งระเบิด 5×5 — กด "เริ่ม" เพื่อสุ่มผู้โชคร้าย</div>

    <div class="grid grid-cols-5 gap-2" style="width: 320px">
      <button v-for="i in 25" :key="i" class="flex aspect-square items-center justify-center rounded-[12px] border-[3px] border-outline text-2xl transition"
        :style="revealed[i - 1] === 'bomb' ? { background: '#FF6B6B' } : revealed[i - 1] === 'safe' ? { background: '#34D399' } : { background: '#fff' }"
        :disabled="!active || !!revealed[i - 1]" @click="clickTile(i - 1)">
        <Icon v-if="revealed[i - 1] === 'bomb'" name="flame" :size="26" color="#fff" />
        <Icon v-else-if="revealed[i - 1] === 'safe'" name="check" :size="22" color="#fff" />
        <Icon v-else name="square" :size="18" color="#C9B6FF" />
      </button>
    </div>

    <Transition name="pop">
      <div v-if="loserId" class="mt-5 animate-pop rounded-[16px] border-[3px] border-outline bg-accent-red px-6 py-3 text-center">
        <PlayerAvatar :player="store.playerById(loserId)" :size="60" class="mx-auto" />
        <div class="font-head mt-1 text-2xl font-extrabold text-white">💥 {{ store.playerById(loserId)?.nick }} เหยียบระเบิด!</div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-8 py-3.5 text-lg" :disabled="active" @click="run">
      <Icon name="grid-3x3" :size="20" color="#fff" />{{ active ? 'กำลังเล่น…' : 'เริ่มทุ่งระเบิด!' }}
    </button>
  </div>
</template>
