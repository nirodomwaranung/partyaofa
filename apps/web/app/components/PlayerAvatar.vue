<script setup lang="ts">
import type { Player } from '~/stores/game';
const props = withDefaults(defineProps<{ player?: Player | null; size?: number }>(), { size: 64 });
const o = '#2A1B4D';
</script>

<template>
  <div
    v-if="player && player.photo"
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      border: '3px solid ' + o,
      boxShadow: 'inset 0 -5px 9px rgba(0,0,0,.2)',
      backgroundImage: `url(${player.photo})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: player.color,
    }"
  />
  <BeanAvatar v-else :color="player?.color || '#FF7A59'" :size="size" />
</template>
