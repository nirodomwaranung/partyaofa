<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';
import type { Game } from '~/stores/game';

const props = defineProps<{ game: Game; gameKey: string }>();
const store = useGameStore();
const sounds = useSounds();

const isBoxing = computed(() => props.gameKey === 'boxing');
const BCOL: Record<string, string> = { blue: '#4D96FF', red: '#FF5C5C' };
const TDCOL: Record<string, string> = { tiger: '#FB923C', dragon: '#10B981' };
const TDIC: Record<string, string> = { tiger: 'cat', dragon: 'flame' };
const TDNM: Record<string, string> = { tiger: 'เสือ', dragon: 'มังกร' };
const SKILLS = ['ปัง!', 'ตึง!', 'ฉับ!', 'บึ้ม!', 'สวนกลับ!', 'ฮุกขวา!', 'อัปเปอร์!'];
function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + p / 100; r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const sideA = computed(() => (isBoxing.value ? 'blue' : 'tiger'));
const sideB = computed(() => (isBoxing.value ? 'red' : 'dragon'));
const sides = reactive<Record<string, string>>({});
function toggleSide(id: string) {
  if (fighting.value) return;
  const cur = sides[id] || sideA.value;
  sides[id] = cur === sideB.value ? sideA.value : sideB.value;
}
function sideOf(p: any, i: number) { return sides[p.id] || (i % 2 ? sideB.value : sideA.value); }

// boxing state
const fighting = ref(false);
const hp = reactive<Record<string, number>>({ blue: 100, red: 100 });
const attacker = ref<string | null>(null);
const skill = ref<{ side: string; text: string; n: number } | null>(null);
const timeLeft = ref(20);
// td state
const tdShow = ref<string | null>(null);
const winner = ref<string | null>(null);
let loop: any = null;

function animateBoxing(win: string, assigned: Record<string, string>) {
  Object.assign(sides, assigned);
  fighting.value = true; winner.value = null;
  hp.blue = 100; hp.red = 100; attacker.value = null; skill.value = null; timeLeft.value = 20;
  sounds.play('drum');
  const t0 = performance.now();
  let turn = Math.random() < 0.5 ? 0 : 1;
  clearInterval(loop);
  loop = setInterval(() => {
    const el = performance.now() - t0;
    if (el >= 19000) { clearInterval(loop); finishBox(win); return; }
    const atk = turn % 2 === 0 ? 'blue' : 'red';
    const def = atk === 'blue' ? 'red' : 'blue';
    turn++;
    let dmg = 5 + Math.random() * 7;
    if (atk === win) dmg += 4;
    if (def === win) dmg *= 0.6;
    hp[def] = Math.max(6, hp[def] - dmg);
    timeLeft.value = Math.max(0, Math.ceil((19000 - el) / 1000));
    attacker.value = atk;
    skill.value = { side: atk, text: SKILLS[Math.floor(Math.random() * SKILLS.length)], n: el };
    sounds.play('drum');
  }, 680);
}
function finishBox(win: string) {
  const lose = win === 'blue' ? 'red' : 'blue';
  if (hp[lose] >= hp[win]) hp[lose] = Math.max(6, hp[win] - 18);
  fighting.value = false; attacker.value = null; skill.value = null; winner.value = win;
  sounds.play('winner');
  store.celebrate(`ทีม${win === 'blue' ? 'น้ำเงิน' : 'แดง'} ชนะ!`, '🥊 🏆');
}

function animateTD(win: string, assigned: Record<string, string>) {
  Object.assign(sides, assigned);
  fighting.value = true; winner.value = null; tdShow.value = 'tiger';
  sounds.play('drum');
  const t0 = performance.now(), dur = 10000;
  const tick = () => {
    const el = performance.now() - t0;
    if (el >= dur) {
      fighting.value = false; tdShow.value = win; winner.value = win; sounds.play('winner');
      store.celebrate(`${win === 'tiger' ? '🐯 เสือ' : '🐲 มังกร'} ชนะ!`, '🏆'); return;
    }
    tdShow.value = Math.random() < 0.5 ? 'tiger' : 'dragon';
    const pr = el / dur;
    sounds.play('drum');
    loop = setTimeout(tick, 55 + pr * pr * 520);
  };
  tick();
}

function run() {
  if (fighting.value) return;
  store.resolveGame(props.gameKey, { sides: { ...sides } });
}
watch(() => store.lastEvent, (e) => {
  if (!e) return;
  if (e.type === 'reset' && (e.gameKey === props.gameKey || e.gameKey == null)) {
    clearInterval(loop); clearTimeout(loop); fighting.value = false; winner.value = null;
    attacker.value = null; skill.value = null; tdShow.value = null; hp.blue = 100; hp.red = 100; timeLeft.value = 20;
    return;
  }
  if (e.type !== 'result' || e.gameKey !== props.gameKey) return;
  if (isBoxing.value) animateBoxing(e.payload.winner, e.payload.sides);
  else animateTD(e.payload.winner, e.payload.sides);
});
onBeforeUnmount(() => { clearInterval(loop); clearTimeout(loop); });

const round = computed(() => store.roundPlayers);
const winners = computed(() => round.value.filter((p, i) => sideOf(p, i) === winner.value));
const losers = computed(() => round.value.filter((p, i) => sideOf(p, i) !== winner.value));
const tdImg = (sd: string) => (props.game as any)[sd === 'tiger' ? 'tigerImg' : 'dragonImg'] || null;
</script>

<template>
  <div class="flex w-full flex-col items-center pb-2 pt-2">
    <!-- side picker -->
    <div v-if="!winner" class="my-1 flex w-[470px] max-w-[94%] flex-col gap-2">
      <div class="text-center text-[13px] font-semibold text-[#C9B6FF]">แตะชื่อเพื่อสลับฝั่งที่เชียร์ ({{ isBoxing ? 'น้ำเงิน / แดง' : 'เสือ / มังกร' }})</div>
      <div class="flex flex-wrap justify-center gap-2">
        <button v-for="(p, i) in round" :key="p.id" class="font-head flex items-center gap-1.5 rounded-[30px] border-[3px] border-outline py-1 pl-1.5 pr-3.5 text-sm font-bold text-white shadow-hard-sm"
          :style="{ background: (isBoxing ? BCOL : TDCOL)[sideOf(p, i)] }" @click="toggleSide(p.id)">
          <PlayerAvatar :player="p" :size="30" />{{ p.nick }}
        </button>
      </div>
    </div>

    <!-- ===== BOXING ARENA ===== -->
    <div v-if="isBoxing" class="w-full max-w-[780px]">
      <div v-if="fighting" class="mb-2 text-center">
        <span class="font-head rounded-[14px] border-[3px] border-outline px-5 py-0.5 text-[30px] font-extrabold" style="color:#FFD93D;background:rgba(0,0,0,.32);text-shadow:0 0 12px rgba(255,217,61,.6)">{{ timeLeft }} วิ</span>
      </div>
      <div class="mb-2.5 flex items-center gap-2.5">
        <div class="font-head rounded-[10px] border-[2.5px] border-outline px-2.5 py-0.5 text-sm font-extrabold text-white" :style="{ background: BCOL.blue }">น้ำเงิน</div>
        <div class="h-5 flex-1 overflow-hidden rounded-[11px] border-[2.5px] border-outline" style="background:#241640">
          <div class="h-full rounded-[9px] transition-[width]" :style="{ width: hp.blue + '%', background: `linear-gradient(90deg,${shade(BCOL.blue, -16)},${BCOL.blue})` }" />
        </div>
        <div class="h-5 flex-1 overflow-hidden rounded-[11px] border-[2.5px] border-outline" style="background:#241640;transform:scaleX(-1)">
          <div class="h-full rounded-[9px] transition-[width]" :style="{ width: hp.red + '%', background: `linear-gradient(90deg,${shade(BCOL.red, -16)},${BCOL.red})` }" />
        </div>
        <div class="font-head rounded-[10px] border-[2.5px] border-outline px-2.5 py-0.5 text-sm font-extrabold text-white" :style="{ background: BCOL.red }">แดง</div>
      </div>
      <div class="relative h-[258px] overflow-hidden rounded-[20px] border-4 border-outline" style="background:radial-gradient(120% 100% at 50% 0%,#5B3FA0,#2A1850);box-shadow:inset 0 0 44px rgba(0,0,0,.55)">
        <div v-for="k in 4" :key="'rp' + k" class="absolute left-0 right-0 h-[4px]" :style="{ top: (16 + (k - 1) * 15) + 'px', background: 'rgba(255,255,255,.22)' }" />
        <div class="absolute" style="left:5%;right:5%;bottom:14px;height:66px;border-radius:50%;background:radial-gradient(circle,#7A5BC0,transparent 70%);opacity:.55" />
        <!-- boxers -->
        <div v-for="side in ['blue', 'red']" :key="side" class="absolute bottom-[26px]" :style="side === 'blue' ? { left: '13%' } : { right: '13%' }">
          <div class="relative h-[162px] w-[104px] transition-transform" :style="{ transform: `translateX(${attacker === side ? (side === 'blue' ? 38 : -38) : 0}px)`, zIndex: attacker === side ? 3 : 1, transitionTimingFunction: 'cubic-bezier(.3,1.7,.5,1)' }">
            <div class="relative h-full w-full" :style="{ animation: fighting ? 'boxbob 1.05s ease-in-out infinite' : 'none' }">
              <div class="absolute bottom-0" :style="{ left: '22px', width: '62px', height: '84px', borderRadius: '26px 26px 18px 18px', background: `linear-gradient(180deg,${BCOL[side]},${shade(BCOL[side], -22)})`, border: '4px solid #2A1B4D', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.16)' }" />
              <div class="absolute flex items-center justify-center gap-[7px]" style="top:8px;left:30px;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#FFE6CC,#F0B98A);border:4px solid #2A1B4D">
                <div style="width:7px;height:7px;border-radius:50%;background:#2A1B4D" /><div style="width:7px;height:7px;border-radius:50%;background:#2A1B4D" />
              </div>
              <div class="absolute" :style="{ top: '4px', left: '26px', width: '54px', height: '13px', borderRadius: '7px', background: BCOL[side], border: '3px solid #2A1B4D' }" />
              <div class="absolute" :style="{ bottom: '58px', left: side === 'blue' ? '66px' : '4px', width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(180deg,${BCOL[side]},${shade(BCOL[side], -22)})`, border: '4px solid #2A1B4D' }" />
              <div class="absolute" :style="{ bottom: '28px', left: side === 'blue' ? '2px' : '66px', width: '26px', height: '26px', borderRadius: '50%', background: `linear-gradient(180deg,${BCOL[side]},${shade(BCOL[side], -22)})`, border: '3px solid #2A1B4D' }" />
            </div>
          </div>
        </div>
        <!-- skill text -->
        <div v-if="fighting && skill" :key="skill.n" class="font-head absolute z-[6] text-[32px] font-extrabold" style="top:30%;transform:translate(-50%,-50%) rotate(-9deg);color:#FFD93D;text-shadow:0 3px 0 #2A1B4D,0 0 14px rgba(255,217,61,.7);animation:pop .3s;pointer-events:none"
          :style="{ left: skill.side === 'blue' ? '66%' : '12%' }">{{ skill.text }}</div>
      </div>
    </div>

    <!-- ===== TIGER-DRAGON ARENA ===== -->
    <div v-else class="my-3 flex items-center justify-center gap-3.5">
      <div v-for="sd in ['tiger', 'dragon']" :key="sd" class="flex w-[160px] flex-col items-center gap-2.5 rounded-[24px] border-4 p-[18px] transition-[.12s]"
        :style="tdShow === sd
          ? { background: `linear-gradient(180deg,${TDCOL[sd]},${shade(TDCOL[sd], -18)})`, borderColor: '#FFD93D', boxShadow: `0 0 30px 5px ${TDCOL[sd]}AA, 0 8px 0 #2A1B4D`, transform: 'scale(1.07)' }
          : { background: 'rgba(255,255,255,.06)', borderColor: '#2A1B4D', boxShadow: '0 6px 0 #2A1B4D' }">
        <div v-if="tdImg(sd)" class="h-[92px] w-[92px] rounded-[24px] border-[3px] border-outline" :style="{ backgroundImage: `url(${tdImg(sd)})`, backgroundSize: 'cover', backgroundPosition: 'center' }" />
        <div v-else class="flex h-[92px] w-[92px] items-center justify-center rounded-[24px] border-[3px] border-outline" :style="{ background: tdShow === sd ? 'rgba(255,255,255,.28)' : TDCOL[sd] }">
          <Icon :name="TDIC[sd]" :size="60" :color="tdShow === sd ? '#fff' : '#2A1B4D'" :stroke="2.2" />
        </div>
        <div class="font-head text-2xl font-extrabold" :style="{ color: tdShow === sd ? '#fff' : '#C9B6FF' }">{{ TDNM[sd] }}</div>
      </div>
    </div>
    <div v-if="!isBoxing" class="font-head -mt-2 mb-1 text-[26px] font-extrabold" style="color:#FFD93D;text-shadow:0 2px 0 #2A1B4D">VS</div>

    <!-- ===== RESULT ===== -->
    <Transition name="pop">
      <div v-if="winner" class="mt-4 flex w-[500px] max-w-[94%] flex-col items-center gap-3 rounded-[22px] border-4 border-outline bg-white p-[18px] shadow-hard" style="animation: pop .4s">
        <div class="font-head flex items-center justify-center gap-2 text-2xl font-extrabold" :style="{ color: (isBoxing ? BCOL : TDCOL)[winner] }">
          <Icon :name="isBoxing ? 'trophy' : TDIC[winner]" :size="26" :color="(isBoxing ? BCOL : TDCOL)[winner]" :stroke="2.2" />ฝั่ง{{ isBoxing ? (winner === 'blue' ? 'น้ำเงิน' : 'แดง') : TDNM[winner] }} ชนะ!
        </div>
        <!-- winners row -->
        <div class="flex flex-wrap items-center justify-center gap-2 rounded-[14px] border-[2.5px] border-accent-green px-3 py-2" style="background:#E9F9F1">
          <span class="font-head text-sm font-extrabold text-[#0F9D58]">ฝั่ง{{ isBoxing ? (winner === 'blue' ? 'น้ำเงิน' : 'แดง') : TDNM[winner] }}ชนะ — {{ game.p1 > 0 ? 'รับ ' + game.p1.toLocaleString() + '฿' : 'รอดยก!' }}</span>
          <div class="flex flex-wrap gap-1">
            <div v-for="p in winners" :key="p.id" class="flex items-center gap-1 rounded-[20px] border-2 border-outline bg-white py-0.5 pl-0.5 pr-2"><PlayerAvatar :player="p" :size="26" /><span class="font-head text-xs font-bold text-outline">{{ p.nick }}</span></div>
          </div>
        </div>
        <!-- losers big -->
        <div class="flex w-full flex-col items-center gap-3 rounded-[18px] border-[3px] border-outline px-3 py-3.5" style="background:linear-gradient(180deg,#FF6B6B,#D63030)">
          <div class="font-head flex items-center gap-2 text-[21px] font-extrabold text-white" style="text-shadow:0 2px 0 #2A1B4D">
            <Icon name="beer" :size="24" color="#FFD93D" fill="#FFD93D" :stroke="2" />ฝั่ง{{ isBoxing ? (winner === 'blue' ? 'แดง' : 'น้ำเงิน') : (winner === 'tiger' ? 'มังกร' : 'เสือ') }}แพ้ — {{ game.loserDrink ? 'โดนยกทั้งทีม!' : 'รอดไป' }}
          </div>
          <div class="flex flex-wrap justify-center gap-3.5">
            <div v-for="p in losers" :key="p.id" class="flex flex-col items-center gap-1">
              <div style="animation: shake .4s infinite"><PlayerAvatar :player="p" :size="80" /></div>
              <span class="font-head text-[15px] font-extrabold text-white">{{ p.nick }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <button class="aofa-btn aofa-btn-pink mt-4 px-[34px] py-3.5 text-[19px]" :disabled="fighting" @click="run">
      {{ isBoxing ? (fighting ? 'กำลังต่อสู้...' : 'เริ่มชก!') : (fighting ? 'กำลังลุ้น...' : 'ทายผล') }}
    </button>
  </div>
</template>
