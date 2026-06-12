<script setup lang="ts">
// CSS "Bean" cartoon character — fallback avatar (Spec §2).
import { computed } from 'vue';
const props = withDefaults(defineProps<{ color?: string; size?: number }>(), {
  color: '#FF7A59',
  size: 64,
});
const o = '#2A1B4D';
function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + p / 100;
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const s = computed(() => props.size);
const body = computed(() => ({
  position: 'relative' as const,
  width: s.value * 0.84 + 'px',
  height: s.value + 'px',
  borderRadius: `${s.value * 0.46}px ${s.value * 0.46}px ${s.value * 0.4}px ${s.value * 0.4}px`,
  background: `radial-gradient(120% 75% at 32% 18%, rgba(255,255,255,.6), rgba(255,255,255,0) 46%), linear-gradient(180deg, ${props.color}, ${shade(props.color, -24)})`,
  border: '3px solid ' + o,
  boxShadow: 'inset 0 -7px 0 rgba(0,0,0,.13)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s.value * 0.08 + 'px',
}));
const eye = computed(() => ({
  width: s.value * 0.27 + 'px',
  height: s.value * 0.3 + 'px',
  borderRadius: '50%',
  background: '#fff',
  border: '2.5px solid ' + o,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'blink 4.5s infinite',
}));
const pupil = computed(() => ({
  position: 'relative' as const,
  width: s.value * 0.13 + 'px',
  height: s.value * 0.13 + 'px',
  borderRadius: '50%',
  background: o,
}));
const cheekBase = computed(() => ({
  position: 'absolute' as const,
  top: s.value * 0.58 + 'px',
  width: s.value * 0.16 + 'px',
  height: s.value * 0.1 + 'px',
  borderRadius: '50%',
  background: 'rgba(255,120,150,.5)',
}));
</script>

<template>
  <div :style="body">
    <div :style="eye"><div :style="pupil" /></div>
    <div :style="eye"><div :style="pupil" /></div>
    <div :style="{ ...cheekBase, left: s * 0.07 + 'px' }" />
    <div :style="{ ...cheekBase, right: s * 0.07 + 'px' }" />
  </div>
</template>
