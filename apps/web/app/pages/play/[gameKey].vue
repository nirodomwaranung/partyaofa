<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '~/stores/game';

// game components
import WheelGame from '~/components/games/WheelGame.vue';
import SlotGame from '~/components/games/SlotGame.vue';
import NumberGame from '~/components/games/NumberGame.vue';
import BombGame from '~/components/games/BombGame.vue';
import MineGame from '~/components/games/MineGame.vue';
import RaceGame from '~/components/games/RaceGame.vue';
import CardGame from '~/components/games/CardGame.vue';
import TeamGame from '~/components/games/TeamGame.vue';
import StopwatchGame from '~/components/games/StopwatchGame.vue';

const route = useRoute();
const store = useGameStore();
const gameKey = computed(() => String(route.params.gameKey));
const game = computed(() => store.gameByKey(gameKey.value));

const COMPONENTS: Record<string, any> = {
  wheel: WheelGame,
  slot: SlotGame,
  number: NumberGame,
  bomb: BombGame,
  mine: MineGame,
  horse: RaceGame,
  race: RaceGame,
  box: CardGame,
  card: CardGame,
  boxing: TeamGame,
  td: TeamGame,
  yk1: StopwatchGame,
};
const comp = computed(() => COMPONENTS[gameKey.value] || null);
// solo games show the spotlight strip
const isSolo = computed(() => ['wheel', 'slot', 'box', 'card'].includes(gameKey.value));
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <NuxtLink to="/select"
        class="font-head flex items-center gap-1.5 rounded-[13px] border-[2.5px] border-white/25 bg-white/15 px-3.5 py-2 text-sm font-bold text-white hover:bg-white/25">
        <Icon name="arrow-left" :size="16" color="#fff" />กลับ
      </NuxtLink>
      <div class="flex items-center gap-2.5">
        <Icon v-if="game" :name="game.icon" :size="30" color="#fff" :stroke="2.4" />
        <h1 class="font-head m-0 text-[30px] font-extrabold text-white" style="text-shadow: 0 3px 0 rgba(0,0,0,.18)">
          {{ game?.name || gameKey }}
        </h1>
      </div>
      <ModeBadge class="ml-auto" />
    </div>

    <div class="tv-screen relative overflow-hidden p-7">
      <div class="absolute left-1/2 top-3 -translate-x-1/2 font-head text-xs font-bold tracking-[3px] text-white/40">
        ● TV LIVE SCREEN ●
      </div>

      <SpotlightStrip v-if="isSolo" />

      <component :is="comp" v-if="comp && game" :game="game" :game-key="gameKey" />
      <div v-else class="py-16 text-center text-[#C9B6FF]">
        เกมนี้ยังไม่พร้อม หรือกำลังโหลดข้อมูล…
      </div>
    </div>
  </div>
</template>
