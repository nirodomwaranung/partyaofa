<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';

const store = useGameStore();
const sounds = useSounds();

// per-game accent (Spec design)
const COLORS: Record<string, string> = {
  yk1: '#FF6B6B', wheel: '#C780FA', bomb: '#FF9F45', boxing: '#F43F5E', td: '#FB923C',
  mine: '#22D3EE', number: '#22D3EE', slot: '#FFD93D', horse: '#6BCB77', box: '#FF7A59',
};
function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + p / 100;
  r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
  return '#' + ((1 << 24) + (Math.min(255, r) << 16) + (Math.min(255, g) << 8) + Math.min(255, b)).toString(16).slice(1);
}
const games = computed(() => store.games);

function open(key: string) {
  sounds.play('click');
  navigateTo(`/play/${key}`);
}
</script>

<template>
  <div>
    <div class="flex items-center gap-4">
      <RiveCharacter src="mascot.riv" :size="96" color="#FFD93D" />
      <div>
        <h1 class="font-head text-[42px] font-extrabold text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,.18)">
          เลือกเกมปาร์ตี้
        </h1>
        <p class="mt-1.5 text-base font-medium text-[#D9C9FF]">
          แตะเกมเพื่อขึ้นจอใหญ่ — ทุกเกมเล่นได้จริง ลุ้นกันทั้งงาน!
        </p>
      </div>
    </div>
    <div class="mb-6" />

    <div class="grid gap-[18px]" style="grid-template-columns: repeat(auto-fill, minmax(212px, 1fr))">
      <button
        v-for="g in games"
        :key="g.key"
        class="group relative flex flex-col items-center gap-2.5 rounded-[24px] border-[3px] border-outline bg-white px-4 pb-[18px] pt-[22px] shadow-hard transition hover:-translate-y-1.5 hover:shadow-[0_13px_0_#2A1B4D]"
        @click="open(g.key)"
      >
        <div
          class="flex h-[70px] w-[70px] items-center justify-center rounded-[20px] border-[3px] border-outline shadow-hard-sm"
          :style="g.cover
            ? { backgroundImage: `url(${g.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(180deg, ${COLORS[g.key] || '#C780FA'}, ${shade(COLORS[g.key] || '#C780FA', -22)})` }"
        >
          <Icon v-if="!g.cover" :name="g.icon" :size="34" color="#fff" :stroke="2.4" />
        </div>
        <div class="font-head text-center text-lg font-bold leading-tight text-outline">{{ g.name }}</div>
        <div class="rounded-[9px] bg-[#F1ECFB] px-2.5 py-0.5 text-xs font-bold text-[#6D28D9]">{{ g.type }}</div>
        <div class="absolute right-2.5 top-2.5 rounded-[9px] border-2 border-outline bg-accent-green px-2 py-0.5 text-xs font-bold text-[#0c3b2a]">
          เล่นได้
        </div>
      </button>
    </div>

    <p v-if="!games.length" class="mt-10 text-center text-[#C9B6FF]">
      กำลังเชื่อมต่อเซิร์ฟเวอร์… (เริ่ม API ด้วย <code>npm run dev</code>)
    </p>
  </div>
</template>
