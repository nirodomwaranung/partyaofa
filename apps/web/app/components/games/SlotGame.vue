<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const POOL = ['coins', 'beer', 'sparkles', 'gift', 'gem', 'bell', 'star', 'cherry'];
const RW = 96, RH = 88;
const DURS = [4.6, 6.3, 8.0];

const spinning = ref(false);
const result = ref<any>(null);
const strips = ref<string[][]>([[], [], []]);
const posY = ref([0, 0, 0]);
const trans = ref(['none', 'none', 'none']);
const history = ref<any[]>([]);

function animate(final: string[], res: any) {
  spinning.value = true;
  result.value = null;
  sounds.play('drum');
  // build strips: 30 random fillers + final symbol last
  strips.value = [0, 1, 2].map((i) => {
    const a = Array.from({ length: 30 }, () => POOL[Math.floor(Math.random() * POOL.length)]);
    a.push(final[i]);
    return a;
  });
  posY.value = [0, 0, 0];
  trans.value = ['none', 'none', 'none'];

  nextTick(() => {
    requestAnimationFrame(() => {
      const targets = strips.value.map((s) => (s.length - 1) * RH);
      trans.value = DURS.map((d) => `transform ${d}s cubic-bezier(.16,.62,.18,1)`);
      posY.value = targets;
      DURS.forEach((d, i) => setTimeout(() => sounds.play('click'), d * 1000));
      setTimeout(() => finish(final, res), DURS[2] * 1000 + 150);
    });
  });
}

function finish(final: string[], res: any) {
  spinning.value = false;
  result.value = res;
  const sp = store.spotlight;
  history.value = [{ id: sp?.id, nick: sp?.nick ?? '', label: res.label, win: res.kind === 'cash' || res.kind === 'jackpot', drink: res.kind === 'drink' }, ...history.value].slice(0, 8);
  if (res.kind === 'drink' || res.kind === 'none') sounds.play('lose');
  else {
    sounds.play(res.kind === 'jackpot' ? 'jackpot' : 'winner');
    store.celebrate(`${sp?.nick ? sp.nick + ' ' : ''}${res.label}`, res.kind === 'jackpot' ? '🎰 แจ็กพ็อต!' : '🏆');
  }
}

function run() {
  if (spinning.value) return;
  store.resolveGame('slot');
}
const SYMC: Record<string, string> = { coins: '#FFB300', beer: '#FF9F45', sparkles: '#C780FA', gift: '#FF7A59', gem: '#22D3EE', bell: '#FFB84C', star: '#FFD93D', cherry: '#FF6B6B' };

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && e.gameKey === 'slot') animate(e.payload.syms, e.payload.result);
});
</script>

<template>
  <div class="flex flex-col items-center pb-2 pt-5">
    <!-- golden cabinet -->
    <div style="perspective: 720px">
      <div style="transform: rotateX(9deg); transform-style: preserve-3d; background: linear-gradient(180deg,#FFE066,#FFB020); padding: 16px; border-radius: 24px; border: 5px solid #2A1B4D; box-shadow: 0 14px 0 #B7791F, 0 24px 32px rgba(0,0,0,.45)">
        <div class="font-head mb-2.5 text-center text-[15px] font-extrabold tracking-[3px]" style="color:#7A4E00">★ JACKPOT ★</div>
        <div class="relative flex gap-3" style="background: linear-gradient(180deg,#3a2a08,#241a04); padding: 14px; border-radius: 16px; border: 3px solid #7A4E00; box-shadow: inset 0 4px 16px rgba(0,0,0,.65)">
          <!-- payline -->
          <div class="pointer-events-none absolute left-2 right-2 top-1/2 z-[5] h-[3px] -translate-y-1/2" style="background: rgba(255,92,138,.7); box-shadow: 0 0 10px 2px rgba(255,92,138,.6)" />
          <div v-for="i in 3" :key="i" class="relative overflow-hidden rounded-[12px] border-[3px] border-outline"
            :style="{ width: RW + 'px', height: RH + 'px', background: 'linear-gradient(180deg,#fff,#EDEDF4)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.6)' }">
            <div class="absolute left-0 right-0 top-0 flex flex-col" style="will-change: transform"
              :style="{ transform: `translateY(${-posY[i - 1]}px)`, transition: trans[i - 1] }">
              <div v-for="(s, k) in (strips[i - 1].length ? strips[i - 1] : ['help-circle'])" :key="k"
                class="flex items-center justify-center" :style="{ height: RH + 'px' }">
                <Icon :name="s" :size="58" :color="s === 'help-circle' ? '#2A1B4D' : (SYMC[s] || '#2A1B4D')" :stroke="2.2" />
              </div>
            </div>
            <!-- fades -->
            <div class="pointer-events-none absolute left-0 right-0 top-0 h-[30px]" style="background: linear-gradient(180deg,rgba(20,10,40,.55),rgba(20,10,40,0))" />
            <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-[30px]" style="background: linear-gradient(0deg,rgba(20,10,40,.55),rgba(20,10,40,0))" />
          </div>
        </div>
      </div>
    </div>

    <Transition name="pop">
      <div v-if="result" class="mb-1.5 mt-[18px] rounded-[18px] border-[3px] border-outline px-[26px] py-2.5 font-head text-[22px] font-extrabold text-outline shadow-hard-btn"
        style="animation: pop .4s" :style="{ background: result.color }">
        {{ store.spotlight ? store.spotlight.nick + ' — ' : '' }}{{ result.label }}
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-[18px] px-[34px] py-3.5 text-[19px]" :disabled="spinning" @click="run">
      {{ spinning ? 'กำลังหมุน...' : 'ดึงคันโยก!' }}
    </button>

    <!-- history -->
    <div v-if="history.length" class="mx-auto mt-4 w-[380px] max-w-[94%] rounded-[18px] border-[3px] border-outline bg-white p-3.5 shadow-hard-btn">
      <div class="font-head mb-2 flex items-center gap-1.5 text-[15px] font-extrabold text-outline"><Icon name="history" :size="16" color="#2A1B4D" />ประวัติแพ้-ชนะ</div>
      <div class="flex flex-col gap-1.5">
        <div v-for="(h, k) in history" :key="k" class="flex items-center gap-2.5 rounded-[11px] border-2 px-2.5 py-1"
          :style="{ background: h.win ? '#E9F9F1' : h.drink ? '#FCEEF1' : '#F4F1FA', borderColor: h.win ? '#B6ECCF' : h.drink ? '#F6C6D2' : '#E7DEF5' }">
          <PlayerAvatar :player="store.playerById(h.id)" :size="30" />
          <span class="font-head flex-1 text-sm font-bold text-outline">{{ h.nick }}</span>
          <span class="text-xs font-semibold text-[#7a6a99]">{{ h.label }}</span>
          <span class="font-head flex items-center gap-1 text-xs font-extrabold" :style="{ color: h.win ? '#0F9D58' : h.drink ? '#D6336C' : '#9a86bd' }">
            <Icon v-if="h.win" name="trophy" :size="14" color="#0F9D58" /><Icon v-else-if="h.drink" name="beer" :size="14" color="#D6336C" />{{ h.win ? 'ชนะ' : h.drink ? 'แพ้' : 'เสมอ' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
