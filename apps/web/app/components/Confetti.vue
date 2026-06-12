<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(defineProps<{ show?: boolean; count?: number }>(), { show: false, count: 90 });
const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA', '#FF9F45', '#22D3EE'];
const pieces = computed(() =>
  Array.from({ length: props.count }, (_, i) => ({
    left: (i * 97) % 100,
    color: colors[i % colors.length],
    delay: (i % 12) * 0.12,
    dur: 2.4 + ((i * 13) % 18) / 10,
    size: 7 + (i % 5) * 2,
  })),
);
</script>

<template>
  <div v-if="show" style="position: fixed; inset: 0; pointer-events: none; z-index: 80; overflow: hidden">
    <div
      v-for="(p, i) in pieces"
      :key="i"
      :style="{
        position: 'absolute',
        top: '-20px',
        left: p.left + '%',
        width: p.size + 'px',
        height: p.size * 1.6 + 'px',
        background: p.color,
        borderRadius: '2px',
        animation: `confettifall ${p.dur}s linear ${p.delay}s forwards`,
      }"
    />
  </div>
</template>
