<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';
const store = useGameStore();
const mode = computed(() => store.mode);
const meta = computed(() => ({
  random: { label: 'สุ่มจริง', icon: 'dices', color: '#34D399' },
  weight: { label: 'ถ่วงน้ำหนัก', icon: 'scale', color: '#4D96FF' },
  lock: { label: 'ล็อกผล', icon: 'lock', color: '#FFD93D' },
}[mode.value]));
</script>

<template>
  <div class="flex items-center gap-1.5 rounded-[12px] border-2 border-outline px-3 py-1.5 font-head text-xs font-bold"
    :style="{ background: meta.color, color: '#2A1B4D' }">
    <Icon :name="meta.icon" :size="14" color="#2A1B4D" />{{ meta.label }}
  </div>
</template>
