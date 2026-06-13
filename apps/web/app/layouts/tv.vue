<script setup lang="ts">
// Minimal layout for the big-screen / projector view — no nav, no header.
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-party-gradient text-white">
    <div class="pointer-events-none fixed -left-[70px] -top-[90px] h-[340px] w-[340px] rounded-full opacity-50"
      style="background: radial-gradient(circle, #c026d3, transparent 70%)" />
    <div class="pointer-events-none fixed -bottom-[120px] -right-[80px] h-[420px] w-[420px] rounded-full opacity-30"
      style="background: radial-gradient(circle, #22d3ee, transparent 70%)" />
    <slot />
    <Celebration />
  </div>
</template>
