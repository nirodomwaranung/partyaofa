<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '~/stores/game';
import { MUSIC_TRACKS } from '~/utils/musicTracks';

const store = useGameStore();
const music = computed(() => store.music);
const ytUrl = ref('');

function toggleMusic() { store.setMusic({ playing: !store.music.playing }); }
function playTrack(id: string) {
  store.setMusic({ trackId: id, youtubeUrl: id === 'youtube' ? ytUrl.value.trim() : null, playing: true });
}

const modes = [
  { key: 'random', label: 'สุ่ม', icon: 'dices' },
  { key: 'weight', label: 'ถ่วง', icon: 'scale' },
  { key: 'lock', label: 'ล็อก', icon: 'lock' },
] as const;

const active = computed(() => store.session?.activeGameKey ?? null);
const activeGame = computed(() => (active.value ? store.gameByKey(active.value) : null));

// Solo games resolve for ONE spotlighted player; the rest pick a round (≥2).
const SOLO = ['wheel', 'slot', 'box', 'card'];
const NEED2 = ['bomb', 'horse', 'race', 'boxing', 'td', 'yk1'];
const isSolo = computed(() => SOLO.includes(active.value || ''));

// ----- round participants (multi-select, always available) -----
const inRound = (id: string) => store.roundIds.includes(id);
function toggleParticipant(id: string) {
  const ids = inRound(id) ? store.roundIds.filter((x) => x !== id) : [...store.roundIds, id];
  store.setRound(ids);
}
const selectAll = () => store.setRound(store.players.map((p) => p.id));
const clearAll = () => store.setRound([]);

// ----- who plays this turn (solo games → spotlight, single-select) -----
const isSpot = (id: string) => store.session?.spotlightId === id;

function launch(key: string) {
  store.startGame(key);
}
async function resolve() {
  if (!active.value) return;
  if (!isSolo.value && NEED2.includes(active.value) && store.roundIds.length < 2) {
    alert('เลือกผู้เล่นอย่างน้อย 2 คนก่อนออกผล'); return;
  }
  if (isSolo.value && !store.session?.spotlightId) {
    alert('เลือกผู้เล่น 1 คนก่อนออกผล'); return;
  }
  const ack: any = await store.resolveGame(active.value);
  if (ack && ack.message && !ack.gameKey) alert(ack.message);
}
function reset() {
  if (active.value) store.resetGame(active.value);
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="font-head mb-1 flex items-center gap-2 text-3xl font-extrabold text-white">
      <Icon name="smartphone" :size="26" color="#fff" />รีโมต
    </h1>
    <p class="mb-4 text-sm text-[#C9B6FF]">คุมจอ TV จากมือถือผ่าน Socket.IO</p>

    <LoginCard v-if="!store.adminAuthed" title="รีโมต Game Master" subtitle="เข้าสู่ระบบเพื่อคุมจอ TV จากมือถือ" />

    <div v-else class="space-y-4">
      <!-- mode -->
      <div class="aofa-card p-4 text-outline">
        <div class="mb-2 text-sm font-bold">โหมดตัดสินผล</div>
        <div class="flex gap-2">
          <button v-for="m in modes" :key="m.key" class="font-head flex flex-1 flex-col items-center gap-1 rounded-[12px] border-[2.5px] border-outline py-2 text-xs font-bold"
            :style="store.mode === m.key ? { background: '#FFD93D', boxShadow: '0 3px 0 #2A1B4D' } : { background: '#fff', opacity: .7 }" @click="store.setMode(m.key)">
            <Icon :name="m.icon" :size="18" color="#2A1B4D" />{{ m.label }}
          </button>
        </div>
      </div>

      <!-- active game control -->
      <div class="aofa-card p-4 text-outline">
        <div class="mb-2 text-sm font-bold">เกมที่กำลังเล่นบนจอ</div>
        <div v-if="activeGame" class="mb-3 flex items-center gap-2">
          <Icon :name="activeGame.icon" :size="22" color="#6D28D9" />
          <span class="font-head text-lg font-extrabold">{{ activeGame.name }}</span>
        </div>
        <p v-else class="mb-3 text-sm text-[#9a86bd]">ยังไม่ได้เริ่มเกม — เลือกด้านล่าง</p>
        <div class="flex gap-2">
          <button class="aofa-btn aofa-btn-pink flex-1 py-4 text-xl" :disabled="!active" @click="resolve">
            <Icon name="zap" :size="22" color="#fff" />ออกผล!
          </button>
          <button class="aofa-btn aofa-btn-yellow px-4" @click="reset"><Icon name="rotate-ccw" :size="20" color="#2A1B4D" /></button>
        </div>
      </div>

      <!-- participants — who is IN this round (multi-select, always available) -->
      <div class="aofa-card p-4 text-outline">
        <div class="mb-2 flex items-center gap-2">
          <Icon name="users" :size="18" color="#6D28D9" />
          <span class="text-sm font-bold">ผู้เข้าร่วมรอบนี้</span>
          <span class="rounded-full bg-[#F4F1FA] px-2 text-[11px] font-bold text-[#6D28D9]">{{ store.roundIds.length }} คน</span>
          <div class="ml-auto flex gap-1.5">
            <button class="rounded-[9px] border-2 border-[#eee] px-2 py-1 text-[11px] font-bold" @click="selectAll">เลือกทั้งหมด</button>
            <button class="rounded-[9px] border-2 border-[#eee] px-2 py-1 text-[11px] font-bold" @click="clearAll">ล้าง</button>
          </div>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button v-for="p in store.players" :key="p.id"
            class="relative flex flex-col items-center gap-1 rounded-[12px] border-2 px-1 py-2 transition"
            :class="inRound(p.id) ? 'border-accent-green bg-[#EAFBF1]' : 'border-[#eee] opacity-60'"
            @click="toggleParticipant(p.id)">
            <span v-if="inRound(p.id)" class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-green">
              <Icon name="check" :size="10" color="#fff" :stroke="3" />
            </span>
            <PlayerAvatar :player="p" :size="40" />
            <span class="font-head w-full truncate text-center text-xs font-bold">{{ p.nick || p.name }}</span>
          </button>
        </div>
      </div>

      <!-- who plays this turn — solo games resolve for ONE player (spotlight) -->
      <div v-if="isSolo && active" class="aofa-card p-4 text-outline">
        <div class="mb-2 flex items-center gap-2">
          <Icon name="hand" :size="18" color="#6D28D9" />
          <span class="text-sm font-bold">ใครเล่นตานี้ (เลือก 1 คน)</span>
          <span class="ml-auto text-[11px] font-semibold text-[#9a86bd]">{{ store.spotlight?.nick || 'ยังไม่เลือก' }}</span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button v-for="p in store.players" :key="p.id"
            class="relative flex flex-col items-center gap-1 rounded-[12px] border-2 px-1 py-2 transition"
            :class="isSpot(p.id) ? 'border-accent-yellow bg-[#FFF8E6]' : 'border-[#eee] opacity-60'"
            @click="store.setSpotlight(p.id)">
            <span v-if="isSpot(p.id)" class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-yellow">
              <Icon name="check" :size="10" color="#2A1B4D" :stroke="3" />
            </span>
            <PlayerAvatar :player="p" :size="40" />
            <span class="font-head w-full truncate text-center text-xs font-bold">{{ p.nick || p.name }}</span>
          </button>
        </div>
      </div>

      <!-- launcher -->
      <div class="aofa-card p-4 text-outline">
        <div class="mb-2 text-sm font-bold">เลือกเกมขึ้นจอ</div>
        <div class="grid grid-cols-2 gap-2">
          <button v-for="g in store.games" :key="g.key"
            class="flex items-center gap-2 rounded-[12px] border-2 px-2 py-2 text-left"
            :class="active === g.key ? 'border-accent-yellow bg-[#FFF8E6]' : 'border-[#eee]'"
            @click="launch(g.key)">
            <Icon :name="g.icon" :size="18" color="#6D28D9" />
            <span class="font-head truncate text-sm font-bold">{{ g.name }}</span>
          </button>
        </div>
      </div>

      <!-- background music -->
      <div class="aofa-card p-4 text-outline">
        <div class="mb-2 flex items-center gap-2">
          <Icon name="music" :size="18" color="#6D28D9" />
          <span class="text-sm font-bold">เพลงพื้นหลัง</span>
          <span class="ml-auto text-[11px] text-[#9a86bd]">เล่นบนจอใหญ่ /tv</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="aofa-btn px-4 py-2.5 text-sm" :class="music.playing ? 'aofa-btn-pink' : 'aofa-btn-green'" @click="toggleMusic">
            <Icon :name="music.playing ? 'pause' : 'play'" :size="16" color="#fff" />{{ music.playing ? 'หยุด' : 'เล่น' }}
          </button>
          <Icon name="volume-2" :size="16" color="#6D28D9" />
          <input type="range" min="0" max="100" :value="Math.round(music.volume * 100)" class="min-w-0 flex-1"
            @change="store.setMusic({ volume: +($event.target as HTMLInputElement).value / 100 })" />
          <span class="w-9 text-right text-sm font-bold">{{ Math.round(music.volume * 100) }}%</span>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button v-for="t in MUSIC_TRACKS" :key="t.id" class="rounded-[12px] border-2 px-1 py-2 text-xs font-bold"
            :class="music.trackId === t.id ? 'border-accent-yellow bg-[#FFF8E6]' : 'border-[#eee]'" @click="playTrack(t.id)">{{ t.name }}</button>
        </div>
        <div class="mt-3">
          <div class="mb-1 text-xs text-[#9a86bd]">หรือเล่นจาก YouTube</div>
          <div class="flex gap-2">
            <input v-model="ytUrl" placeholder="วางลิงก์ YouTube" class="min-w-0 flex-1 rounded-[10px] border-2 border-[#eee] px-2 py-2 text-sm" />
            <button class="aofa-btn aofa-btn-pink px-3 py-2 text-sm" :disabled="!ytUrl.trim()" @click="playTrack('youtube')">
              <Icon name="youtube" :size="16" color="#fff" />เล่น
            </button>
          </div>
          <div v-if="music.trackId === 'youtube' && music.youtubeUrl" class="mt-1 truncate text-xs font-semibold text-[#0F9D58]">▶ {{ music.youtubeUrl }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
