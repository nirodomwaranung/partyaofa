<script setup lang="ts">
// Lucide icon wrapper (Spec §2: Lucide line icons everywhere, no emoji).
// Accepts kebab-case names like the prototype's <l-icon name="party-popper">.
import * as lucide from 'lucide-vue-next';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ name: string; size?: number | string; color?: string; stroke?: number | string }>(),
  { size: 22, color: 'currentColor', stroke: 2.25 },
);

function pascal(n: string) {
  return String(n || '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

const comp = computed(() => {
  const lib = lucide as Record<string, any>;
  return lib[pascal(props.name)] || lib['HelpCircle'];
});
</script>

<template>
  <component
    :is="comp"
    :size="Number(size)"
    :color="color"
    :stroke-width="Number(stroke)"
    style="display: block"
  />
</template>
