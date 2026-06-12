<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';

const store = useGameStore();

const modes = [
  { key: 'random', label: 'สุ่ม', icon: 'dices' },
  { key: 'weight', label: 'ถ่วง', icon: 'scale' },
  { key: 'lock', label: 'ล็อก', icon: 'lock' },
] as const;

const active = computed(() => store.session?.activeGameKey ?? null);
const activeGame = computed(() => (active.value ? store.gameByKey(active.value) : null));

function launch(key: string) {
  store.startGame(key);
}
async function resolve() {
  if (!active.value) return;
  await store.resolveGame(active.value);
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
    </div>
  </div>
</template>
