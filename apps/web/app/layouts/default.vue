<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '~/stores/game';

const store = useGameStore();
const route = useRoute();

// TV follows the Game Master. Two triggers for reliability:
//  1) the transient game:event 'start' (fires the moment the remote launches) —
//     bounces /select or /play/* to the chosen game.
//  2) session.activeGameKey changing (arrives via state:sync) — keeps a screen
//     already on /play/* in sync even if it missed the 'start' event (reconnect).
// Control pages (/admin, /remote, /players, /dashboard) are never moved.
function followTo(gameKey: string | null | undefined, fromSelect: boolean) {
  if (!gameKey) return;
  const p = route.path;
  const onPlay = p.startsWith('/play');
  const onSelect = p === '/select';
  if ((onPlay || (fromSelect && onSelect)) && p !== `/play/${gameKey}`) navigateTo(`/play/${gameKey}`);
}
watch(() => store.lastEvent, (e) => {
  if (e && e.type === 'start') followTo(e.gameKey, true);
});
watch(() => store.session?.activeGameKey, (k) => followTo(k, false));

const nav = [
  { to: '/select', label: 'เลือกเกม', icon: 'gamepad-2' },
  { to: '/tv', label: 'จอใหญ่', icon: 'tv' },
  { to: '/players', label: 'ผู้เล่น', icon: 'users' },
  { to: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { to: '/recap', label: 'สรุปงาน', icon: 'trophy' },
  { to: '/admin', label: 'Game Master', icon: 'sliders-horizontal' },
  { to: '/remote', label: 'รีโมต', icon: 'smartphone' },
];

const isActive = (to: string) => route.path === to || route.path.startsWith(to + '/');
const connected = computed(() => store.connected);
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-party-gradient">
    <!-- glow blobs -->
    <div class="pointer-events-none fixed -left-[70px] -top-[90px] h-[340px] w-[340px] rounded-full opacity-50"
      style="background: radial-gradient(circle, #c026d3, transparent 70%)" />
    <div class="pointer-events-none fixed -bottom-[120px] -right-[80px] h-[420px] w-[420px] rounded-full opacity-30"
      style="background: radial-gradient(circle, #22d3ee, transparent 70%)" />

    <header
      class="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b-2 border-white/10 px-6 py-3"
      style="background: rgba(43, 27, 83, 0.62); backdrop-filter: blur(14px)"
    >
      <NuxtLink to="/select" class="flex items-center gap-3">
        <div class="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] border-[3px] border-outline shadow-hard-sm"
          style="background: linear-gradient(180deg, #ffe066, #ffc93c); animation: wob 3s ease-in-out infinite">
          <Icon name="party-popper" :size="24" color="#2A1B4D" :stroke="2.5" />
        </div>
        <div class="font-head text-[23px] font-extrabold leading-none tracking-wide text-white">
          PARTY <span class="text-accent-yellow">AOFA</span>
        </div>
      </NuxtLink>

      <nav class="ml-2 flex flex-wrap gap-2">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="font-head flex items-center gap-1.5 whitespace-nowrap rounded-[14px] border-[2.5px] px-3.5 py-2 text-sm font-bold transition"
          :class="isActive(item.to)
            ? 'bg-accent-yellow text-outline border-outline shadow-hard-sm'
            : 'bg-white/10 text-white border-transparent hover:bg-white/20'"
        >
          <Icon :name="item.icon" :size="17" :color="isActive(item.to) ? '#2A1B4D' : '#fff'" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2.5 rounded-[14px] border-2 border-white/15 bg-black/25 px-3.5 py-1.5">
        <span class="h-2.5 w-2.5 rounded-full"
          :style="{ background: connected ? '#34D399' : '#FF5C5C', boxShadow: `0 0 0 4px ${connected ? 'rgba(52,211,153,.3)' : 'rgba(255,92,92,.3)'}`, animation: 'floaty 1.4s infinite' }" />
        <span class="font-head text-xs font-bold tracking-widest text-white">ON AIR</span>
        <span class="text-[13px] font-semibold text-[#E9DDFF]">{{ store.eventName }}</span>
      </div>
    </header>

    <main class="relative z-[2] mx-auto max-w-[1200px] px-6 pb-[70px] pt-7">
      <slot />
    </main>

    <Celebration />
  </div>
</template>
