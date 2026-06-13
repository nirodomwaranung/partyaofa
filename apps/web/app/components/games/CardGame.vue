<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const PICKINFO: Record<string, { back: string; bg: string; hint: string; btn: string }> = {
  card: { back: 'help-circle', bg: 'linear-gradient(160deg,#8B5CF6,#5B2EAE)', hint: 'แตะการ์ด 1 ใบเพื่อเปิดดวง', btn: 'แจกไพ่ใหม่' },
  box: { back: 'package', bg: 'linear-gradient(160deg,#38BDF8,#1D4ED8)', hint: 'แตะกล่องปริศนา 1 ใบ', btn: 'สับกล่องใหม่' },
};
const info = computed(() => PICKINFO[props.gameKey] || PICKINFO.card);
const CK: Record<string, string> = { cash: '#34D399', jackpot: '#FFD93D', drink: '#FF6B6B', safe: '#A0E548' };
function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + p / 100; r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const cards = ref<number[]>([0, 1, 2, 3, 4, 5, 6, 7]);
const picked = ref<number | null>(null);
const reward = ref<any>(null);
const history = ref<any[]>([]);

function deal() { picked.value = null; reward.value = null; cards.value = cards.value.slice().sort(() => Math.random() - 0.5); }
function pick(i: number) { if (picked.value == null) store.resolveGame(props.gameKey, { index: i }); }
function reveal(index: number, rw: any) {
  picked.value = index; reward.value = rw;
  const sp = store.spotlight;
  const win = rw.kind === 'cash' || rw.kind === 'jackpot';
  history.value = [{ id: sp?.id, nick: sp?.nick ?? '', label: rw.label, win, drink: rw.kind === 'drink' }, ...history.value].slice(0, 12);
  if (rw.kind === 'drink') sounds.play('lose');
  else {
    sounds.play(rw.kind === 'jackpot' ? 'jackpot' : 'winner');
    store.celebrate(`${sp?.nick ? sp.nick + ' ' : ''}ได้ ${rw.label}`, rw.kind === 'jackpot' ? '🎁 แจ็กพ็อต!' : '🏆');
  }
}
const spotP = computed(() => store.spotlight);
const resultText = computed(() => {
  const r = reward.value; if (!r) return '';
  const nm = spotP.value?.nick ?? 'ผู้เล่น';
  const win = r.kind === 'cash' || r.kind === 'jackpot';
  return win ? `${nm} รับ ${(r.amount || 0).toLocaleString()}฿!` : r.kind === 'drink' ? `${nm} โดนยกเหล้า!` : `${nm} รอดตัว`;
});

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === props.gameKey) reveal(e.payload.index, e.payload.reward);
});
onMounted(deal);
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2">
    <span class="mb-2 text-sm font-medium text-[#C9B6FF]">{{ info.hint }} — <b class="text-accent-yellow">{{ spotP?.nick }}</b> กำลังเล่น</span>

    <div class="mx-auto mt-1 grid max-w-[720px] grid-cols-4 gap-[18px]">
      <div v-for="(c, i) in cards" :key="i" class="flex h-[185px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[20px] border-4 border-outline transition-[.2s]"
        :style="picked === i
          ? { background: '#FFF6DD', boxShadow: '0 0 0 5px #FFD93D, 0 10px 0 #2A1B4D', transform: 'translateY(-7px) scale(1.13)' }
          : picked != null
            ? { background: '#EDE6F7', boxShadow: '0 8px 0 #2A1B4D', opacity: .5 }
            : { background: info.bg, boxShadow: '0 8px 0 #2A1B4D' }"
        @click="pick(i)">
        <template v-if="picked != null && reward && picked === i">
          <Icon :name="reward.icon" :size="58" color="#2A1B4D" :stroke="2.2" />
          <div class="font-head text-[15px] font-bold text-outline">{{ reward.label }}</div>
        </template>
        <template v-else>
          <div style="filter:drop-shadow(0 4px 3px rgba(0,0,0,.3))"><Icon :name="info.back" :size="76" color="#fff" :stroke="2" /></div>
          <div class="font-head text-[22px] font-extrabold" style="color:rgba(255,255,255,.85)">{{ i + 1 }}</div>
        </template>
      </div>
    </div>

    <!-- result card -->
    <Transition name="pop">
      <div v-if="reward" class="mb-1.5 mt-[18px] flex flex-col items-center gap-3 rounded-[24px] border-4 border-outline bg-white px-8 py-5 shadow-hard" style="animation: pop .4s">
        <div class="font-head flex items-center gap-1.5 text-[15px] font-extrabold tracking-wide text-[#9a86bd]"><Icon name="party-popper" :size="16" color="#9a86bd" />เปิดกล่องได้!</div>
        <div class="flex h-[124px] w-[124px] items-center justify-center rounded-[26px] border-4 border-outline shadow-hard-btn"
          :style="{ background: `linear-gradient(180deg,${CK[reward.kind] || '#FFD93D'},${shade(CK[reward.kind] || '#FFD93D', -18)})` }">
          <Icon :name="reward.icon" :size="74" color="#2A1B4D" :stroke="2.2" />
        </div>
        <div class="font-head text-[28px] font-extrabold text-outline">{{ reward.label }}</div>
        <div class="flex items-center gap-2.5 rounded-[15px] border-[2.5px] px-4 py-1.5"
          :style="{ background: reward.kind === 'cash' || reward.kind === 'jackpot' ? '#E9F9F1' : reward.kind === 'drink' ? '#FCEEF1' : '#F4F1FA', borderColor: reward.kind === 'cash' || reward.kind === 'jackpot' ? '#34D399' : reward.kind === 'drink' ? '#F6C6D2' : '#C9B6FF' }">
          <PlayerAvatar v-if="spotP" :player="spotP" :size="38" />
          <span class="font-head text-lg font-extrabold" :style="{ color: reward.kind === 'cash' || reward.kind === 'jackpot' ? '#0F9D58' : reward.kind === 'drink' ? '#D6336C' : '#6D28D9' }">{{ resultText }}</span>
        </div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-[18px] px-[34px] py-3.5 text-[19px]" @click="deal"><Icon name="shuffle" :size="20" color="#fff" />{{ info.btn }}</button>

    <!-- history -->
    <div v-if="history.length" class="mx-auto mt-4 w-[420px] max-w-[94%] rounded-[18px] border-[3px] border-outline bg-white p-3.5 shadow-hard-btn">
      <div class="font-head mb-2 flex items-center gap-1.5 text-[15px] font-extrabold text-outline"><Icon name="history" :size="16" color="#2A1B4D" />ประวัติการเปิดกล่อง</div>
      <div class="flex flex-col gap-1.5">
        <div v-for="(h, k) in history" :key="k" class="flex items-center gap-2.5 rounded-[11px] border-2 px-2.5 py-1"
          :style="{ background: h.win ? '#E9F9F1' : h.drink ? '#FCEEF1' : '#F4F1FA', borderColor: h.win ? '#B6ECCF' : h.drink ? '#F6C6D2' : '#E7DEF5' }">
          <PlayerAvatar :player="store.playerById(h.id)" :size="30" />
          <span class="font-head flex-1 text-sm font-bold text-outline">{{ h.nick }}</span>
          <Icon v-if="h.win" name="trophy" :size="14" color="#0F9D58" /><Icon v-else-if="h.drink" name="beer" :size="14" color="#D6336C" />
          <span class="font-head text-[13px] font-bold" :style="{ color: h.win ? '#0F9D58' : h.drink ? '#D6336C' : '#7a6a99' }">{{ h.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
