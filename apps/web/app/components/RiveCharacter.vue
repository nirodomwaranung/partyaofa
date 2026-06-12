<script setup lang="ts">
// Loads a Rive (.riv) animation from /public/rive/ if present; otherwise
// renders the fallback slot (default: a Bean avatar). This lets designers
// drop .riv files in later without touching code (Spec §2 Animation: Rive).
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string; // filename under /rive, e.g. 'mascot.riv'
    stateMachine?: string;
    artboard?: string;
    size?: number;
    color?: string;
  }>(),
  { size: 120, color: '#FFD93D' },
);

const canvas = ref<HTMLCanvasElement | null>(null);
const failed = ref(!props.src);
let rive: any = null;

onMounted(async () => {
  if (!import.meta.client || !props.src || !canvas.value) return;
  try {
    const { Rive } = await import('@rive-app/canvas');
    rive = new Rive({
      src: `/rive/${props.src}`,
      canvas: canvas.value,
      autoplay: true,
      artboard: props.artboard,
      stateMachines: props.stateMachine,
      onLoad: () => rive?.resizeDrawingSurfaceToCanvas(),
      onLoadError: () => (failed.value = true),
    });
  } catch {
    failed.value = true;
  }
});

onBeforeUnmount(() => rive?.cleanup?.());
</script>

<template>
  <div :style="{ width: size + 'px', height: size + 'px' }" class="flex items-center justify-center">
    <canvas v-show="!failed" ref="canvas" :width="size" :height="size" />
    <div v-if="failed" style="animation: floaty 2.4s ease-in-out infinite">
      <slot>
        <BeanAvatar :color="color" :size="size * 0.8" />
      </slot>
    </div>
  </div>
</template>
