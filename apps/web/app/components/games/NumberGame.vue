<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

// per-player numbers are shared (store.picks) so the remote can set them too
const rolling = ref(false);
const numShow = ref<number | null>(null);
const center = ref<number | null>(null);
const ranks = ref<any[] | null>(null);
let timer: any = null;

function animate(target: number, ranked: any[]) {
  rolling.value = true; ranks.value = null; center.value = null;
  sounds.play('drum');
  const t0 = performance.now(), dur = 15000;
  const tick = () => {
    const el = performance.now() - t0;
    if (el >= dur) {
      numShow.value = target; center.value = target; ranks.value = ranked; rolling.value = false;
      sounds.play('winner');
      if (ranked[0]) store.celebrate(`${store.playerById(ranked[0].id)?.nick || ''} ใกล้สุด!`, `เลข ${target} 🏆`);
      return;
    }
    numShow.value = 1 + Math.floor(Math.random() * 100);
    const pr = el / dur;
    sounds.play('drum');
    timer = setTimeout(tick, 40 + pr * pr * 640);
  };
  tick();
}

function run() {
  if (rolling.value) return;
  const payload: Record<string, number> = {};
  store.roundPlayers.forEach((p) => (payload[p.id] = store.picks[p.id] ?? 50));
  store.resolveGame('number', { picks: payload });
}
const P = () => [props.game.p1, props.game.p2, props.game.p3];

watch(() => store.lastEvent, (e) => {
  if (!e) return;
  if (e.type === 'result' && e.gameKey === 'number') animate(e.payload.center, e.payload.ranks);
  else if (e.type === 'reset' && (e.gameKey === 'number' || e.gameKey == null)) {
    clearTimeout(timer); rolling.value = false; ranks.value = null; center.value = null;
  }
});
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2.5">
    <div class="my-1.5 flex h-[160px] w-[160px] items-center justify-center rounded-full border-[5px] border-outline bg-white font-head text-[70px] font-extrabold shadow-hard-btn" style="color:#6D28D9">
      {{ numShow != null ? numShow : '?' }}
    </div>
    <span class="my-1 text-sm font-medium text-[#C9B6FF]">ผู้เล่นแต่ละคนเลือกเลข 1–100 — ใกล้เลขกลางสุดชนะ ไกลสุดโดนยก</span>

    <div class="my-2 flex w-[430px] max-w-[94%] flex-col gap-2">
      <div v-for="p in store.roundPlayers" :key="p.id" class="flex items-center gap-2.5 rounded-[14px] border-2 border-white/15 bg-white/[.06] px-3 py-1.5">
        <PlayerAvatar :player="p" :size="40" />
        <span class="font-head w-14 text-[15px] font-bold text-white">{{ p.nick }}</span>
        <input type="range" min="1" max="100" :value="store.picks[p.id] ?? 50" :disabled="rolling" class="h-[7px] flex-1" style="accent-color:#FFD93D" @input="store.setPick(p.id, +($event.target as HTMLInputElement).value)" />
        <span class="font-head flex h-[38px] w-[46px] items-center justify-center rounded-[10px] border-[2.5px] border-outline bg-accent-yellow text-[18px] font-extrabold text-outline">{{ store.picks[p.id] ?? 50 }}</span>
      </div>
    </div>

    <div v-if="ranks" class="my-3.5 flex w-[400px] max-w-[94%] flex-col gap-1.5 rounded-[18px] border-[3px] border-outline bg-white p-4 shadow-hard-btn" style="animation: pop .4s">
      <div class="font-head text-center text-[17px] font-extrabold text-outline">เลขกลางคือ {{ center }} — ผลตามลำดับ</div>
      <div v-for="(r, idx) in ranks" :key="r.id" class="flex items-center gap-2.5 rounded-[12px] border-2 px-2.5 py-1"
        :style="{ background: idx === 0 ? '#FFF6DD' : idx === 1 ? '#EEF1F6' : idx === 2 ? '#FAE6CF' : idx === ranks.length - 1 ? '#FCEEF1' : '#F7F4FC', borderColor: idx === 0 ? '#2A1B4D' : '#EFE7FC' }">
        <div class="flex w-6 justify-center">
          <Icon v-if="idx < 3" name="medal" :size="19" :color="idx === 0 ? '#B8860B' : idx === 1 ? '#7A8190' : '#B5733A'" />
          <span v-else class="font-head text-sm font-extrabold text-[#9a86bd]">{{ idx + 1 }}</span>
        </div>
        <PlayerAvatar :player="store.playerById(r.id)" :size="idx === 0 ? 60 : idx === 1 ? 50 : 42" />
        <div class="flex flex-1 flex-col">
          <span class="font-head text-[15px] font-bold text-outline">{{ store.playerById(r.id)?.nick }}</span>
          <span class="text-[11px] font-semibold text-[#7a6a99]">ทาย {{ r.pick }} · ห่าง {{ r.dist }}</span>
        </div>
        <Icon v-if="idx === ranks.length - 1 && game.loserDrink" name="beer" :size="17" color="#D6336C" />
        <span class="font-head text-[13px] font-extrabold" :style="{ color: idx === ranks.length - 1 && game.loserDrink ? '#D6336C' : '#0F9D58' }">
          {{ idx < 3 ? '+' + P()[idx].toLocaleString() + '฿' : (idx === ranks.length - 1 && game.loserDrink ? 'โดนยก' : '-') }}
        </span>
      </div>
    </div>

    <button class="aofa-btn aofa-btn-pink mt-[18px] px-[34px] py-3.5 text-[19px]" :disabled="rolling" @click="run">
      {{ rolling ? 'กำลังสุ่ม...' : 'สุ่มเลขกลาง!' }}
    </button>
  </div>
</template>
