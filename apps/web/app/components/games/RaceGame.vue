<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const isHorse = computed(() => props.gameKey === 'horse');
const running = ref(false);
const done = ref(false);
const winnerId = ref<string | null>(null);
const ranks = ref<string[] | null>(null);
const pos = reactive<Record<string, number>>({});
let raf = 0;

const round = computed(() => store.roundPlayers);
const laneCount = computed(() => Math.max(1, round.value.length));

function ease(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function animate(winId: string, order: string[]) {
  const r = round.value;
  if (r.length < 2) return;
  running.value = true; done.value = false; ranks.value = null; winnerId.value = null;
  r.forEach((p) => (pos[p.id] = 2));
  sounds.play('drum');

  const base = isHorse.value ? 16 : 3.2;
  const durs: Record<string, number> = {};
  order.forEach((id, i) => (durs[id] = base + i * (isHorse.value ? 0.55 : 0.45) + Math.random() * 0.5));
  const winDur = durs[winId];
  const fin = isHorse.value ? 90 : 90;
  const t0 = performance.now();
  cancelAnimationFrame(raf);

  const step = (now: number) => {
    const el = (now - t0) / 1000;
    for (const p of r) {
      const t = Math.min(1, el / durs[p.id]);
      // slight mid-race wobble for overtakes
      const wob = t < 1 ? Math.sin(el * 1.6 + p.id.length) * 1.4 : 0;
      pos[p.id] = 2 + (fin - 2) * ease(t) + wob;
    }
    if (el < winDur + 0.1) raf = requestAnimationFrame(step);
    else {
      pos[winId] = fin;
      running.value = false; done.value = true; winnerId.value = winId; ranks.value = order;
      sounds.play('winner');
    }
  };
  raf = requestAnimationFrame(step);
}

function run() { if (!running.value) store.resolveGame(props.gameKey); }
function reset() { cancelAnimationFrame(raf); running.value = false; done.value = false; ranks.value = null; winnerId.value = null; round.value.forEach((p) => (pos[p.id] = 2)); store.resetGame(props.gameKey); }

const winP = computed(() => (winnerId.value ? store.playerById(winnerId.value) : null));
const P = computed(() => ({ p1: props.game.p1, p2: props.game.p2, p3: props.game.p3, pen: props.game.loserDrink }));
const laneTop = (i: number) => ((i + 0.5) / laneCount.value) * 100;

watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'result' && (e.gameKey === 'horse' || e.gameKey === 'race')) animate(e.payload.winnerId, e.payload.ranks);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-3.5">
    <!-- ===== FLAT GREEN TRACK (race) ===== -->
    <div v-if="!isHorse" class="relative w-full max-w-[780px] overflow-hidden"
      style="background: linear-gradient(180deg,#7BC86C,#5BA84C); border:4px solid #2A1B4D; border-radius:20px; box-shadow:0 8px 0 rgba(0,0,0,.25), inset 0 0 0 4px rgba(255,255,255,.08); padding:10px 16px">
      <div class="absolute bottom-0 top-0 z-0" style="right:34px;width:10px;background:repeating-linear-gradient(45deg,#2A1B4D 0 8px,#fff 8px 16px);opacity:.85" />
      <div class="absolute right-2 top-2 z-[3]"><Icon name="flag" :size="22" color="#2A1B4D" fill="#fff" :stroke="2.2" /></div>
      <div v-for="(p, i) in round" :key="p.id" class="relative flex h-[70px] items-center"
        :style="{ borderBottom: i < round.length - 1 ? '2px dashed rgba(255,255,255,.3)' : 'none' }">
        <span class="font-head absolute left-1 z-[1] text-xs font-bold" style="color:rgba(255,255,255,.9)">{{ p.nick }}</span>
        <div class="absolute z-[2]" :style="{ left: (pos[p.id] ?? 2) + '%', transform: 'translateX(-50%)' }">
          <div class="relative flex flex-col items-center">
            <Icon v-if="winnerId === p.id" name="crown" :size="20" color="#FFC93C" fill="#FFC93C" :stroke="1.6" />
            <PlayerAvatar :player="p" :size="60" />
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 3D PERSPECTIVE TRACK (horse) ===== -->
    <div v-else class="relative w-full max-w-[840px] overflow-hidden"
      style="height:400px; perspective:860px; perspective-origin:50% 28%; border-radius:22px; border:4px solid #2A1B4D; box-shadow:0 10px 0 rgba(0,0,0,.28); background:linear-gradient(180deg,#7DD3FC 0%,#BAE6FD 36%,#86EFAC 36%,#4ADE80 100%)">
      <!-- sun + clouds -->
      <div class="absolute" style="top:22px;right:46px;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#FFF6CC,#FFD93D);box-shadow:0 0 32px 9px rgba(255,217,61,.5)" />
      <div class="absolute" style="top:34px;left:56px;width:70px;height:22px;border-radius:14px;background:rgba(255,255,255,.85)" />
      <div class="absolute" style="top:58px;left:120px;width:52px;height:18px;border-radius:12px;background:rgba(255,255,255,.7)" />
      <!-- ground -->
      <div class="absolute" style="left:-12%;right:-12%;bottom:0;height:66%;transform:rotateX(60deg);transform-origin:bottom center;transform-style:preserve-3d;background:repeating-linear-gradient(90deg,#4ADE80 0 64px,#41cf72 64px 128px);box-shadow:inset 0 24px 50px rgba(0,0,0,.18)">
        <div v-for="i in (laneCount + 1)" :key="'ln' + i" class="absolute left-0 right-0" :style="{ top: ((i - 1) / laneCount * 100) + '%', height: '3px', background: 'rgba(255,255,255,.4)' }" />
        <div class="absolute bottom-0 top-0" style="right:9%;width:20px;background:repeating-linear-gradient(0deg,#2A1B4D 0 15px,#fff 15px 30px);box-shadow:0 0 0 2px #2A1B4D" />
        <!-- horses -->
        <div v-for="(p, i) in round" :key="p.id" class="absolute" :style="{ left: (pos[p.id] ?? 2) + '%', top: laneTop(i) + '%', transform: 'translate(-50%,-100%)', transformStyle: 'preserve-3d', zIndex: 200 + i }">
          <div class="absolute" style="left:50%;bottom:-7px;width:50px;height:15px;transform:translateX(-50%);background:rgba(0,0,0,.28);border-radius:50%;filter:blur(2px)" />
          <div style="transform:rotateX(-60deg);transform-origin:bottom center;display:flex;flex-direction:column;align-items:center">
            <Icon v-if="winnerId === p.id" name="crown" :size="24" color="#FFC93C" fill="#FFC93C" :stroke="1.6" />
            <PlayerAvatar :player="p" :size="44" />
            <!-- CSS horse + jockey -->
            <div class="relative" style="margin-top:-6px;width:84px;height:46px">
              <div style="position:absolute;left:15px;bottom:-12px;width:7px;height:16px;background:#7A4A28;border-radius:3px;border:2px solid #2A1B4D" />
              <div style="position:absolute;left:25px;bottom:-12px;width:7px;height:16px;background:#9A6038;border-radius:3px;border:2px solid #2A1B4D" />
              <div style="position:absolute;right:20px;bottom:-12px;width:7px;height:16px;background:#7A4A28;border-radius:3px;border:2px solid #2A1B4D" />
              <div style="position:absolute;right:30px;bottom:-12px;width:7px;height:16px;background:#9A6038;border-radius:3px;border:2px solid #2A1B4D" />
              <div style="position:absolute;left:-5px;top:5px;width:13px;height:20px;background:#5C3518;border-radius:8px 2px 8px 12px;border:2px solid #2A1B4D;transform:rotate(20deg)" />
              <div style="position:absolute;left:8px;top:8px;width:56px;height:25px;border-radius:16px 20px 14px 14px;background:linear-gradient(180deg,#A8703E,#875230);border:3px solid #2A1B4D" />
              <div :style="{ position:'absolute', left:'24px', top:'4px', width:'26px', height:'12px', borderRadius:'8px', background: p.color, border:'2.5px solid #2A1B4D' }" />
              <div style="position:absolute;right:10px;top:-7px;width:17px;height:26px;border-radius:9px 11px 6px 6px;background:linear-gradient(180deg,#A8703E,#875230);border:3px solid #2A1B4D;transform:rotate(20deg)" />
              <div style="position:absolute;right:-7px;top:-13px;width:24px;height:16px;border-radius:9px 12px 8px 8px;background:#A8703E;border:3px solid #2A1B4D">
                <div style="position:absolute;right:4px;top:3px;width:4px;height:4px;border-radius:50%;background:#2A1B4D" />
                <div style="position:absolute;left:3px;top:-6px;width:7px;height:9px;background:#875230;border-radius:3px 3px 0 0;border:2px solid #2A1B4D" />
                <div style="position:absolute;left:-3px;top:1px;width:8px;height:11px;background:#5C3518;border-radius:4px;border:2px solid #2A1B4D" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- result banner (race) -->
    <Transition name="pop">
      <div v-if="done && winP && !isHorse" class="mt-4 flex items-center gap-3 rounded-[18px] border-[3px] border-outline bg-accent-yellow px-6 py-2.5 shadow-hard-btn" style="animation: pop .4s">
        <Icon name="trophy" :size="28" color="#2A1B4D" :stroke="2.4" />
        <div class="font-head text-[22px] font-extrabold text-outline">{{ winP.nick }} เข้าวิน! +{{ P.p1.toLocaleString() }}฿ • คนสุดท้ายโดนยก</div>
      </div>
    </Transition>

    <!-- rank panel (horse) -->
    <div v-if="done && isHorse && ranks" class="mt-4 flex w-[370px] max-w-[92%] flex-col gap-1.5 rounded-[18px] border-[3px] border-outline bg-white p-4 shadow-hard-btn" style="animation: pop .4s">
      <div class="font-head mb-0.5 text-center text-lg font-extrabold text-outline">ผลการแข่งม้า</div>
      <div v-for="(id, idx) in ranks" :key="id" class="flex items-center gap-2.5 rounded-[12px] border-2 px-2.5 py-1"
        :style="{ background: idx === 0 ? '#FFF6DD' : idx === 1 ? '#EEF1F6' : idx === 2 ? '#FAE6CF' : idx === ranks.length - 1 ? '#FCEEF1' : '#F7F4FC', borderColor: idx === 0 ? '#2A1B4D' : '#EFE7FC' }">
        <div class="flex w-[26px] justify-center">
          <Icon v-if="idx < 3" name="medal" :size="20" :color="idx === 0 ? '#B8860B' : idx === 1 ? '#7A8190' : '#B5733A'" />
          <span v-else class="font-head text-[15px] font-extrabold text-[#9a86bd]">{{ idx + 1 }}</span>
        </div>
        <PlayerAvatar :player="store.playerById(id)" :size="idx === 0 ? 60 : idx === 1 ? 50 : 42" />
        <span class="font-head flex-1 text-base font-bold text-outline">{{ store.playerById(id)?.nick }}</span>
        <Icon v-if="idx === ranks.length - 1 && P.pen" name="beer" :size="18" color="#D6336C" />
        <span class="font-head text-sm font-extrabold" :style="{ color: idx === ranks.length - 1 && P.pen ? '#D6336C' : '#0F9D58' }">
          {{ idx < 3 ? '+' + [P.p1, P.p2, P.p3][idx].toLocaleString() + '฿' : (idx === ranks.length - 1 && P.pen ? 'โดนยก' : '-') }}
        </span>
      </div>
    </div>

    <div class="mt-4 flex gap-3">
      <button class="aofa-btn aofa-btn-pink px-[34px] py-3.5 text-[19px]" :disabled="running" @click="run">
        {{ running ? (isHorse ? 'ม้ากำลังวิ่ง...' : 'กำลังวิ่ง...') : (isHorse ? 'ปล่อยม้า!' : 'ปล่อยตัว!') }}
      </button>
      <button class="aofa-btn aofa-btn-yellow px-[22px] py-3.5" :disabled="running" @click="reset">รีเซ็ต</button>
    </div>
  </div>
</template>
