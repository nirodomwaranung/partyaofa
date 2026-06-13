<script setup lang="ts">
import { computed, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

// The board is shared server state (store.mine) so the TV and the remote walk
// the same tiles — a player can point at the TV and the admin taps it on the
// remote, or vice-versa.
const active = computed(() => store.mine.active);
const revealed = computed(() => store.mine.revealed || {});
const loserId = computed(() => store.mine.loserId);
const current = computed(() =>
  active.value ? store.roundPlayers[store.mine.turn % Math.max(1, store.roundPlayers.length)] ?? null : null,
);
const loserP = computed(() => (loserId.value ? store.playerById(loserId.value) : null));

function tile(idx: number) { if (active.value && !revealed.value[idx]) store.revealMine(idx); }
function run() { if (!active.value) store.resolveGame('mine'); }

// sound cues react to the shared board changing
let prevCount = 0; let prevLoser: string | null = null;
watch(() => store.mine, (m) => {
  const cnt = Object.keys(m.revealed || {}).length;
  if (m.loserId && m.loserId !== prevLoser) { sounds.play('explosion'); setTimeout(() => sounds.play('lose'), 200); }
  else if (cnt > prevCount) sounds.play('click');
  prevCount = cnt; prevLoser = m.loserId;
}, { deep: true });
</script>

<template>
  <div class="flex w-full flex-col items-center gap-3 pb-2 pt-3">
    <div v-if="current" class="flex items-center gap-2.5 rounded-[16px] border-[2.5px] border-accent-yellow px-3.5 py-1.5" style="background:rgba(255,217,61,.15)">
      <PlayerAvatar :player="current" :size="40" />
      <span class="font-head text-base font-extrabold text-white">ตาของ {{ current.nick }} — แตะช่องในสนาม</span>
    </div>
    <div v-else-if="!loserId" class="text-sm font-semibold text-[#C9B6FF]">กดเริ่มเพื่อวางทุ่นระเบิด แล้วผลัดกันเดิน</div>

    <div class="grid grid-cols-5 gap-[9px] rounded-[20px] border-4 border-outline p-3.5" style="background:linear-gradient(180deg,#3A2A6E,#241850);box-shadow:inset 0 0 30px rgba(0,0,0,.4)">
      <button v-for="i in 25" :key="i" class="flex h-[62px] w-[62px] items-center justify-center rounded-[12px] border-[3px] border-outline transition-[.1s]"
        :style="revealed[i - 1] === 'bomb' ? { background: 'radial-gradient(circle,#FF8A8A,#E03030)', animation: 'pop .3s' }
          : revealed[i - 1] === 'safe' ? { background: '#34D399' }
          : { background: 'linear-gradient(180deg,#5847A0,#3A2A6E)', boxShadow: '0 4px 0 #1d1340' }"
        :disabled="!active || !!revealed[i - 1]" @click="tile(i - 1)">
        <Icon v-if="revealed[i - 1] === 'bomb'" name="bomb" :size="34" color="#2A1B4D" fill="#2A1B4D" :stroke="2" />
        <Icon v-else-if="revealed[i - 1] === 'safe'" name="check" :size="32" color="#0c3b2a" :stroke="3.2" />
        <Icon v-else name="help-circle" :size="22" color="rgba(255,255,255,.3)" :stroke="2" />
      </button>
    </div>

    <Transition name="pop">
      <div v-if="loserP" class="mb-1.5 mt-2 flex w-[360px] max-w-[94%] flex-col items-center gap-2.5 rounded-[24px] border-4 border-outline px-8 py-5 shadow-hard-btn"
        style="background:linear-gradient(180deg,#FF6B6B,#D63030);animation: pop .4s">
        <div class="font-head flex items-center gap-2 text-lg font-extrabold tracking-wide text-white">
          <Icon name="flame" :size="22" color="#FFD93D" fill="#FFD93D" :stroke="2" />เหยียบกับระเบิด!
        </div>
        <div style="animation: shake .35s infinite"><PlayerAvatar :player="loserP" :size="132" /></div>
        <div class="font-head text-[32px] font-extrabold text-white" style="text-shadow:0 3px 0 #2A1B4D">{{ loserP?.nick }}</div>
        <div class="font-head rounded-[14px] border-[2.5px] border-outline bg-accent-yellow px-[18px] py-1.5 text-lg font-extrabold text-outline">
          {{ game.loserDrink ? 'รับบทลงโทษ — โดนยก!' : 'รับบทลงโทษ!' }}
        </div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink px-[34px] py-3.5 text-[19px]" :disabled="active" @click="run">
      {{ active ? 'กำลังเดินทุ่ง...' : (loserId ? 'เริ่มใหม่' : 'เริ่มทุ่งระเบิด!') }}
    </button>
  </div>
</template>
