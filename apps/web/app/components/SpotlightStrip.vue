<script setup lang="ts">
import { useGameStore } from '~/stores/game';
const store = useGameStore();
defineProps<{ hint?: string }>();
</script>

<template>
  <div class="my-4 flex flex-col items-center gap-2">
    <span class="text-[13px] font-semibold text-[#C9B6FF]">{{ hint || 'ผู้เล่นรอบนี้ — แตะเพื่อเลือกคนที่กำลังเล่น' }}</span>
    <div class="flex flex-wrap justify-center gap-3">
      <button
        v-for="p in store.roundPlayers"
        :key="p.id"
        class="flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition"
        :class="store.session?.spotlightId === p.id ? 'border-accent-yellow bg-white/10' : 'border-transparent hover:bg-white/5'"
        @click="store.setSpotlight(p.id)"
      >
        <PlayerAvatar :player="p" :size="52" />
        <span class="font-head text-sm font-bold" :style="{ color: store.session?.spotlightId === p.id ? '#FFD93D' : '#E9DDFF' }">{{ p.nick }}</span>
      </button>
    </div>
  </div>
</template>
