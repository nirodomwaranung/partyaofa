<script setup lang="ts">
// Screen-wide win celebration: confetti + a brief "ผู้ชนะ!" flash.
// Triggered by store.celebrate(), which each game calls AT THE END of its
// reveal animation — so it never spoils a locked result early.
import { ref, watch } from 'vue';
import { useGameStore } from '~/stores/game';

const store = useGameStore();
const confetti = ref(false);
const flash = ref<{ label: string; sub: string } | null>(null);
let ct: any = null, ft: any = null;

watch(() => store.celebration, (c) => {
  if (!c) return;
  flash.value = { label: c.label, sub: c.sub };
  confetti.value = true;
  clearTimeout(ct); clearTimeout(ft);
  ct = setTimeout(() => (confetti.value = false), 3400);
  ft = setTimeout(() => (flash.value = null), 2800);
});
</script>

<template>
  <div>
    <Confetti :show="confetti" />
    <Transition name="pop">
      <div v-if="flash" class="pointer-events-none fixed inset-0 z-[85] flex flex-col items-center justify-center" style="animation: pop .35s">
        <div class="font-head text-[64px] font-extrabold text-accent-yellow" style="text-shadow: 0 5px 0 #2A1B4D, 0 0 30px rgba(255,217,61,.7)">🎉 {{ flash.label }}</div>
        <div v-if="flash.sub" class="font-head mt-2 text-3xl font-extrabold text-white" style="text-shadow: 0 3px 0 #2A1B4D">{{ flash.sub }}</div>
      </div>
    </Transition>
  </div>
</template>
