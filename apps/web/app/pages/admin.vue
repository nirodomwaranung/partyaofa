<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '~/stores/game';

const store = useGameStore();
const api = useApi();

const modes = [
  { key: 'random', label: 'สุ่มจริง', icon: 'dices' },
  { key: 'weight', label: 'ถ่วงน้ำหนัก', icon: 'scale' },
  { key: 'lock', label: 'ล็อกผล', icon: 'lock' },
] as const;

const eventName = computed({
  get: () => store.eventName,
  set: (v: string) => store.setEventName(v),
});

// per-game expanded editor
const expanded = ref<string | null>(null);
async function patchGame(key: string, patch: any) {
  await api.patch(`/games/${key}`, patch);
}
async function addReward() { await api.post('/rewards', {}); }
async function patchReward(id: string, patch: any) { await api.patch(`/rewards/${id}`, patch); }
async function delReward(id: string) { await api.del(`/rewards/${id}`); }

// reward icon choices + image upload
const REWARD_ICONS = ['coins', 'banknote', 'ticket', 'sparkles', 'gem', 'beer', 'wine', 'gift', 'star', 'trophy', 'shield-check', 'party-popper', 'crown', 'medal', 'cherry', 'bell'];
function onRewardImg(id: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = async () => { await patchReward(id, { img: rd.result }); }; // server uploads to Supabase Storage
  rd.readAsDataURL(file);
}
function clearRewardImg(id: string) { patchReward(id, { img: '' }); }
async function resetStats() {
  if (confirm('รีเซ็ตสถิติผู้เล่นทั้งหมด?')) await api.post('/players/reset-stats');
}

// lock editor target game
const lockGame = ref('wheel');
const lock = computed(() => store.session?.lock ?? {});
</script>

<template>
  <div>
    <h1 class="font-head mb-4 text-[38px] font-extrabold text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,.18)">
      Game Master
    </h1>

    <LoginCard v-if="!store.adminAuthed" title="ห้องควบคุมเกม (Game Master)" subtitle="เข้าสู่ระบบเพื่อตั้งค่าโหมด รอบ รางวัล และล็อกผล" />

    <div v-else class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(330px, 1fr))">
      <!-- event + mode -->
      <div class="aofa-card p-5 text-outline">
        <h3 class="font-head mb-3 text-lg font-extrabold">โหมด & งาน</h3>
        <label class="text-sm font-semibold">ชื่องาน ON AIR</label>
        <input v-model="eventName" class="mb-3 mt-1 w-full rounded-[12px] border-2 border-outline px-3 py-2 outline-none" />
        <label class="text-sm font-semibold">โหมดตัดสินผล</label>
        <div class="mt-1 flex gap-2">
          <button v-for="m in modes" :key="m.key"
            class="font-head flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border-[2.5px] border-outline px-2 py-2 text-sm font-bold"
            :style="store.mode === m.key ? { background: '#FFD93D', boxShadow: '0 3px 0 #2A1B4D' } : { background: '#fff', opacity: .7 }"
            @click="store.setMode(m.key)">
            <Icon :name="m.icon" :size="15" color="#2A1B4D" />{{ m.label }}
          </button>
        </div>
        <button class="aofa-btn mt-4 w-full bg-[#6D28D9] py-2.5 text-sm" @click="resetStats">รีเซ็ตสถิติทั้งหมด</button>
        <button class="mt-2 w-full rounded-[12px] border-2 border-outline/20 py-2 text-sm font-bold text-[#7a6a99]" @click="store.logout()">ออกจากระบบ</button>
      </div>

      <!-- round + weights -->
      <div class="aofa-card p-5 text-outline">
        <h3 class="font-head mb-3 text-lg font-extrabold">ผู้เล่นในรอบ ({{ store.roundIds.length }})</h3>
        <div class="grid max-h-[280px] grid-cols-2 gap-1.5 overflow-y-auto">
          <button v-for="p in store.players" :key="p.id"
            class="flex items-center gap-2 rounded-[10px] border-2 px-2 py-1.5 text-left"
            :class="store.roundIds.includes(p.id) ? 'border-accent-green bg-[#E9F9F1]' : 'border-[#eee]'"
            @click="store.toggleRound(p.id)">
            <PlayerAvatar :player="p" :size="28" />
            <span class="font-head flex-1 truncate text-sm font-bold">{{ p.nick }}</span>
            <Icon v-if="store.roundIds.includes(p.id)" name="check" :size="15" color="#10B981" />
          </button>
        </div>
        <div v-if="store.mode === 'weight'" class="mt-3">
          <label class="text-sm font-semibold">น้ำหนัก % โอกาสชนะ</label>
          <div v-for="p in store.roundPlayers" :key="p.id" class="mt-1 flex items-center gap-2">
            <span class="font-head w-16 truncate text-sm font-bold">{{ p.nick }}</span>
            <input type="range" min="5" max="100" :value="store.session?.weights[p.id] ?? 50" class="flex-1"
              @change="store.setWeight(p.id, +($event.target as HTMLInputElement).value)" />
            <span class="w-10 text-right text-sm font-bold">{{ store.session?.weights[p.id] ?? 50 }}%</span>
          </div>
        </div>
      </div>

      <!-- lock editor -->
      <div v-if="store.mode === 'lock'" class="aofa-card p-5 text-outline">
        <h3 class="font-head mb-3 flex items-center gap-2 text-lg font-extrabold">
          <Icon name="lock" :size="18" color="#B45309" />ล็อกผล (ผู้เล่นไม่รู้)
        </h3>
        <select v-model="lockGame" class="mb-3 w-full rounded-[12px] border-2 border-outline px-3 py-2 font-bold">
          <option v-for="g in store.games" :key="g.key" :value="g.key">{{ g.name }}</option>
        </select>
        <LockEditor :game-key="lockGame" :lock="lock" @set="(v:any) => store.setLock(lockGame, v)" />
      </div>

      <!-- per-game config -->
      <div class="aofa-card p-5 text-outline">
        <h3 class="font-head mb-3 text-lg font-extrabold">ตั้งค่าเกม & รางวัล</h3>
        <div v-for="g in store.games" :key="g.key" class="border-b border-[#eee] py-2 last:border-0">
          <button class="flex w-full items-center gap-2" @click="expanded = expanded === g.key ? null : g.key">
            <Icon :name="g.icon" :size="18" color="#6D28D9" />
            <span class="font-head flex-1 text-left text-sm font-bold">{{ g.name }}</span>
            <Icon :name="expanded === g.key ? 'chevron-up' : 'chevron-down'" :size="16" color="#999" />
          </button>
          <div v-if="expanded === g.key" class="mt-2 grid grid-cols-3 gap-2">
            <label class="text-xs">อันดับ 1 (฿)<input type="number" :value="g.p1" class="mt-0.5 w-full rounded-lg border-2 border-[#eee] px-2 py-1" @change="patchGame(g.key, { p1: +($event.target as HTMLInputElement).value })" /></label>
            <label class="text-xs">อันดับ 2 (฿)<input type="number" :value="g.p2" class="mt-0.5 w-full rounded-lg border-2 border-[#eee] px-2 py-1" @change="patchGame(g.key, { p2: +($event.target as HTMLInputElement).value })" /></label>
            <label class="text-xs">อันดับ 3 (฿)<input type="number" :value="g.p3" class="mt-0.5 w-full rounded-lg border-2 border-[#eee] px-2 py-1" @change="patchGame(g.key, { p3: +($event.target as HTMLInputElement).value })" /></label>
            <label class="col-span-3 flex items-center gap-2 text-sm">
              <input type="checkbox" :checked="g.loserDrink" @change="patchGame(g.key, { loserDrink: ($event.target as HTMLInputElement).checked })" />ผู้แพ้โดนยกเหล้า
            </label>
          </div>
        </div>
      </div>

      <!-- rewards CRUD -->
      <div class="aofa-card p-5 text-outline">
        <div class="mb-3 flex items-center">
          <h3 class="font-head text-lg font-extrabold">รางวัลในกล่อง</h3>
          <button class="aofa-btn aofa-btn-green ml-auto px-3 py-1.5 text-sm" @click="addReward"><Icon name="plus" :size="15" color="#fff" /></button>
        </div>
        <p class="mb-2 text-xs text-[#9a86bd]">แตะรูปเพื่ออัปโหลดภาพรางวัล · หรือเลือก icon จาก dropdown</p>
        <div v-for="r in store.rewards" :key="r.id" class="mb-2 flex items-center gap-2">
          <!-- image upload / icon thumbnail -->
          <label class="relative flex-shrink-0 cursor-pointer" title="อัปโหลดรูปรางวัล">
            <input type="file" accept="image/*" class="hidden" @change="onRewardImg(r.id, $event)" />
            <div v-if="r.img" class="h-9 w-9 rounded-lg border-2 border-outline bg-cover bg-center" :style="{ backgroundImage: `url(${r.img})` }" />
            <div v-else class="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-outline bg-[#FFF1D6]"><Icon :name="r.icon" :size="18" color="#B45309" /></div>
            <span class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#6D28D9]"><Icon name="camera" :size="9" color="#fff" /></span>
          </label>
          <!-- clear image (revert to icon) -->
          <button v-if="r.img" class="flex-shrink-0 text-[#9a86bd]" title="เอารูปออก ใช้ icon แทน" @click="clearRewardImg(r.id)"><Icon name="x" :size="14" color="#9a86bd" /></button>
          <!-- icon picker (shown when no image) -->
          <select v-else :value="r.icon" class="w-[78px] flex-shrink-0 rounded-lg border-2 border-[#eee] px-1 py-1 text-xs" @change="patchReward(r.id, { icon: ($event.target as HTMLSelectElement).value })">
            <option v-for="ic in REWARD_ICONS" :key="ic" :value="ic">{{ ic }}</option>
          </select>
          <input :value="r.label" class="min-w-0 flex-1 rounded-lg border-2 border-[#eee] px-2 py-1 text-sm" @change="patchReward(r.id, { label: ($event.target as HTMLInputElement).value })" />
          <button class="flex-shrink-0 text-accent-red" @click="delReward(r.id)"><Icon name="trash-2" :size="16" color="#FF6B6B" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
