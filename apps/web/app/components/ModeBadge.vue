<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';
const store = useGameStore();
const mode = computed(() => store.mode);
// just a colored status dot — no label (random=green, weight=blue, lock=yellow)
const meta = computed(() => ({
  random: { label: 'สุ่มจริง', color: '#34D399' },
  weight: { label: 'ถ่วงน้ำหนัก', color: '#4D96FF' },
  lock: { label: 'ล็อกผล', color: '#FFD93D' },
}[mode.value]));
</script>

<template>
  <span
    class="inline-block h-3.5 w-3.5 rounded-full border-2 border-outline"
    :title="meta.label"
    :style="{ background: meta.color, boxShadow: `0 0 0 4px ${meta.color}33` }"
  />
</template>
