<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '~/stores/game';

import WheelGame from '~/components/games/WheelGame.vue';
import SlotGame from '~/components/games/SlotGame.vue';
import NumberGame from '~/components/games/NumberGame.vue';
import BombGame from '~/components/games/BombGame.vue';
import MineGame from '~/components/games/MineGame.vue';
import RaceGame from '~/components/games/RaceGame.vue';
import CardGame from '~/components/games/CardGame.vue';
import TeamGame from '~/components/games/TeamGame.vue';
import StopwatchGame from '~/components/games/StopwatchGame.vue';

definePageMeta({ layout: 'tv' });

const store = useGameStore();

const COMPONENTS: Record<string, any> = {
  wheel: WheelGame, slot: SlotGame, number: NumberGame, bomb: BombGame, mine: MineGame,
  horse: RaceGame, race: RaceGame, box: CardGame, card: CardGame, boxing: TeamGame, td: TeamGame, yk1: StopwatchGame,
};

const activeKey = computed(() => store.session?.activeGameKey || null);
const game = computed(() => (activeKey.value ? store.gameByKey(activeKey.value) : null));
const comp = computed(() => (activeKey.value ? COMPONENTS[activeKey.value] : null));
const isSolo = computed(() => ['wheel', 'slot', 'box', 'card'].includes(activeKey.value || ''));

const isFull = ref(false);
function toggleFullscreen() {
  if (!import.meta.client) return;
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); isFull.value = true; }
  else { document.exitFullscreen?.(); isFull.value = false; }
}

// ----- players join the round straight from the TV -----
const showJoin = ref(false);
const inRound = (id: string) => store.roundIds.includes(id);
function toggleJoin(id: string) { store.joinRound(id); }
</script>

<template>
  <div class="flex min-h-screen flex-col px-6 py-4">
    <!-- top bar (minimal) -->
    <div class="z-10 mb-3 flex items-center gap-3">
      <div class="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border-[3px] border-outline shadow-hard-sm"
        style="background: linear-gradient(180deg,#FFE066,#FFC93C); animation: wob 3s ease-in-out infinite">
        <Icon name="party-popper" :size="22" color="#2A1B4D" :stroke="2.5" />
      </div>
      <div class="font-head text-[22px] font-extrabold tracking-wide">PARTY <span class="text-accent-yellow">AOFA</span></div>
      <div class="ml-2 flex items-center gap-2 rounded-[12px] border-2 border-white/15 bg-black/25 px-3 py-1.5">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: store.connected ? '#34D399' : '#FF5C5C', boxShadow: `0 0 0 4px ${store.connected ? 'rgba(52,211,153,.3)' : 'rgba(255,92,92,.3)'}`, animation: 'floaty 1.4s infinite' }" />
        <span class="font-head text-xs font-bold tracking-widest">ON AIR</span>
        <span class="text-[13px] font-semibold text-[#E9DDFF]">{{ store.eventName }}</span>
      </div>
      <div v-if="game" class="ml-auto flex items-center gap-2">
        <Icon :name="game.icon" :size="22" color="#fff" :stroke="2.3" />
        <span class="font-head text-xl font-extrabold">{{ game.name }}</span>
      </div>
      <button class="font-head flex items-center gap-1.5 rounded-[12px] border-[2.5px] border-outline px-3 py-1.5 text-sm font-extrabold shadow-hard-sm"
        :class="game ? 'ml-2' : 'ml-2'" style="background: linear-gradient(180deg,#7CF2A0,#34D399); color:#10341f"
        title="ร่วมเล่น" @click="showJoin = true">
        <Icon name="user-plus" :size="16" color="#10341f" :stroke="2.5" />ร่วมเล่น
        <span v-if="store.roundIds.length" class="rounded-full bg-white/70 px-1.5 text-xs">{{ store.roundIds.length }}</span>
      </button>
      <button class="ml-2 flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-white/20 bg-white/10 hover:bg-white/20" title="เต็มจอ" @click="toggleFullscreen">
        <Icon :name="isFull ? 'minimize' : 'maximize'" :size="16" color="#fff" />
      </button>
    </div>

    <!-- join-the-round overlay: anyone at the TV taps their name to play -->
    <Transition name="pop">
      <div v-if="showJoin" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6" @click.self="showJoin = false">
        <div class="aofa-card flex max-h-[85vh] w-full max-w-3xl flex-col p-6 text-outline">
          <div class="mb-1 flex items-center gap-2">
            <Icon name="user-plus" :size="24" color="#6D28D9" :stroke="2.4" />
            <h2 class="font-head text-2xl font-extrabold">ร่วมเล่น — แตะชื่อเพื่อเข้ารอบ</h2>
            <button class="ml-auto flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-[#eee] hover:bg-[#f4f0ff]" @click="showJoin = false">
              <Icon name="x" :size="18" color="#6D28D9" />
            </button>
          </div>
          <p class="mb-4 text-sm text-[#9a86bd]">เข้ารอบแล้ว {{ store.roundIds.length }} คน · แตะอีกครั้งเพื่อออก</p>
          <div class="grid flex-1 grid-cols-3 gap-3 overflow-auto sm:grid-cols-4 md:grid-cols-5">
            <button v-for="p in store.players" :key="p.id"
              class="relative flex flex-col items-center gap-1.5 rounded-[14px] border-[2.5px] p-2.5 transition"
              :class="inRound(p.id) ? 'border-accent-green bg-[#EAFBF1] shadow-hard-sm' : 'border-[#eee] opacity-80 hover:opacity-100'"
              @click="toggleJoin(p.id)">
              <span v-if="inRound(p.id)" class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green">
                <Icon name="check" :size="12" color="#fff" :stroke="3" />
              </span>
              <PlayerAvatar :player="p" :size="56" />
              <span class="font-head max-w-full truncate text-sm font-bold">{{ p.nick || p.name }}</span>
            </button>
          </div>
          <button class="aofa-btn aofa-btn-pink mt-4 w-full py-3 text-lg" @click="showJoin = false">
            <Icon name="check" :size="20" color="#fff" />เริ่มเล่นได้เลย!
          </button>
        </div>
      </div>
    </Transition>

    <!-- stage -->
    <div class="tv-screen relative flex flex-1 flex-col items-center overflow-hidden p-6">
      <div class="absolute left-1/2 top-3 -translate-x-1/2 font-head text-xs font-bold tracking-[3px] text-white/40">● TV LIVE SCREEN ●</div>

      <template v-if="comp && game">
        <SpotlightStrip v-if="isSolo" />
        <div class="flex w-full flex-1 items-center justify-center">
          <component :is="comp" :game="game" :game-key="activeKey" />
        </div>
      </template>

      <!-- waiting splash -->
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <RiveCharacter src="mascot.riv" :size="160" color="#FFD93D" />
        <div class="font-head text-[40px] font-extrabold" style="text-shadow: 0 4px 0 rgba(0,0,0,.2)">{{ store.eventName }}</div>
        <div class="rounded-[16px] border-[3px] border-white/20 bg-black/20 px-6 py-3 text-lg font-semibold text-[#D9C9FF]">
          รอ Game Master เริ่มเกม… 🎉
        </div>
      </div>
    </div>
  </div>
</template>
