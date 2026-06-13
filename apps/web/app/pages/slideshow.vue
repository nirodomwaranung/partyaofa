<script setup lang="ts">
// Full-screen player photo slideshow for the big screen — "รูปผู้เข้าเล่นใหญ่ๆ".
// Public, auto-advancing, no auth. Lives on the tv layout (party bg + music).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useGameStore } from '~/stores/game';

definePageMeta({ layout: 'tv' });

const store = useGameStore();
const players = computed(() => store.players);

const idx = ref(0);
const playing = ref(true);
const progress = ref(0); // 0..1 of the current slide
const SLIDE_MS = 4500;
let raf = 0;
let slideStart = 0;

const cur = computed(() => players.value[idx.value] ?? null);

function clampIdx(n: number) {
  const len = players.value.length;
  return len ? ((n % len) + len) % len : 0;
}
function go(n: number) { idx.value = clampIdx(n); slideStart = performance.now(); progress.value = 0; }
function next() { go(idx.value + 1); }
function prev() { go(idx.value - 1); }
function togglePlay() { playing.value = !playing.value; }

function loop(now: number) {
  const len = players.value.length;
  if (playing.value && len) {
    const el = now - slideStart;
    progress.value = Math.min(1, el / SLIDE_MS);
    if (el >= SLIDE_MS) { idx.value = clampIdx(idx.value + 1); slideStart = now; progress.value = 0; }
  } else {
    // keep progress frozen while paused
    slideStart = now - progress.value * SLIDE_MS;
  }
  raf = requestAnimationFrame(loop);
}

const isFull = ref(false);
function toggleFullscreen() {
  if (!import.meta.client) return;
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); isFull.value = true; }
  else { document.exitFullscreen?.(); isFull.value = false; }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
}

onMounted(() => {
  store.bind();
  slideStart = performance.now();
  raf = requestAnimationFrame(loop);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="flex min-h-screen flex-col px-6 py-5">
    <!-- header -->
    <div class="z-10 mb-2 flex items-center gap-3">
      <div class="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border-[3px] border-outline shadow-hard-sm"
        style="background: linear-gradient(180deg,#FFE066,#FFC93C); animation: wob 3s ease-in-out infinite">
        <Icon name="users" :size="22" color="#2A1B4D" :stroke="2.5" />
      </div>
      <div class="font-head text-[22px] font-extrabold tracking-wide">ผู้ร่วมงาน <span class="text-accent-yellow">PARTY AOFA</span></div>
      <div class="ml-auto flex items-center gap-2">
        <div class="rounded-[12px] border-2 border-white/15 bg-black/25 px-3 py-1.5 font-head text-sm font-bold tracking-widest">
          {{ players.length ? idx + 1 : 0 }} / {{ players.length }}
        </div>
        <button class="flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-white/20 bg-white/10 hover:bg-white/20" title="เต็มจอ" @click="toggleFullscreen">
          <Icon :name="isFull ? 'minimize' : 'maximize'" :size="16" color="#fff" />
        </button>
      </div>
    </div>

    <!-- stage -->
    <div class="relative flex flex-1 flex-col items-center justify-center">
      <template v-if="cur">
        <Transition name="aofa-slide" mode="out-in">
          <div :key="cur.id" class="flex flex-col items-center gap-5">
            <!-- big photo -->
            <div style="animation: floaty 3.2s ease-in-out infinite">
              <div v-if="cur.photo"
                class="rounded-full border-[7px] border-outline"
                :style="{
                  width: 'clamp(230px, 42vh, 440px)', height: 'clamp(230px, 42vh, 440px)',
                  backgroundImage: `url(${cur.photo})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  backgroundColor: cur.color,
                  boxShadow: '0 0 0 10px rgba(255,217,61,.5), 0 20px 0 rgba(0,0,0,.28)',
                }" />
              <BeanAvatar v-else :color="cur.color || '#FF7A59'" :size="360" />
            </div>
            <!-- name -->
            <div class="flex flex-col items-center gap-2 text-center">
              <div class="font-head text-[clamp(40px,6vh,72px)] font-extrabold leading-none" style="text-shadow: 0 5px 0 rgba(0,0,0,.22)">{{ cur.nick || cur.name }}</div>
              <div v-if="cur.name && cur.name !== cur.nick" class="text-[clamp(16px,2.4vh,24px)] font-semibold text-[#E9DDFF]">{{ cur.name }}</div>
              <div v-if="cur.company || cur.dept || cur.role" class="mt-1 flex flex-wrap items-center justify-center gap-2">
                <span v-if="cur.company" class="rounded-full border-2 border-white/20 bg-black/25 px-3.5 py-1 text-sm font-bold text-[#D9C9FF]">{{ cur.company }}</span>
                <span v-if="cur.dept" class="rounded-full border-2 border-white/20 bg-black/25 px-3.5 py-1 text-sm font-bold text-[#D9C9FF]">{{ cur.dept }}</span>
                <span v-if="cur.role" class="rounded-full border-2 border-accent-yellow bg-accent-yellow/15 px-3.5 py-1 text-sm font-bold text-accent-yellow">{{ cur.role }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </template>
      <div v-else class="flex flex-col items-center gap-4 text-center">
        <RiveCharacter src="mascot.riv" :size="140" color="#FFD93D" />
        <div class="font-head text-2xl font-extrabold text-[#D9C9FF]">ยังไม่มีผู้เล่น — เพิ่มที่หน้า Game Master</div>
      </div>
    </div>

    <!-- progress bar -->
    <div v-if="players.length" class="mx-auto mb-3 h-2 w-full max-w-[680px] overflow-hidden rounded-full border-2 border-white/15 bg-black/25">
      <div class="h-full rounded-full bg-accent-yellow" :style="{ width: progress * 100 + '%' }" />
    </div>

    <!-- controls -->
    <div v-if="players.length" class="z-10 flex items-center justify-center gap-3">
      <button class="flex h-12 w-12 items-center justify-center rounded-[14px] border-[3px] border-outline bg-white shadow-hard-sm" title="ก่อนหน้า" @click="prev">
        <Icon name="chevron-left" :size="24" color="#2A1B4D" :stroke="2.6" />
      </button>
      <button class="flex h-14 w-14 items-center justify-center rounded-[16px] border-[3px] border-outline shadow-hard-sm" :style="{ background: playing ? '#FF5C8A' : '#34D399' }" :title="playing ? 'หยุด' : 'เล่น'" @click="togglePlay">
        <Icon :name="playing ? 'pause' : 'play'" :size="26" color="#fff" :stroke="2.4" />
      </button>
      <button class="flex h-12 w-12 items-center justify-center rounded-[14px] border-[3px] border-outline bg-white shadow-hard-sm" title="ถัดไป" @click="next">
        <Icon name="chevron-right" :size="24" color="#2A1B4D" :stroke="2.6" />
      </button>
    </div>

    <!-- thumbnail strip -->
    <div v-if="players.length" class="mx-auto mt-3 flex max-w-full flex-wrap justify-center gap-1.5 overflow-hidden">
      <button v-for="(p, i) in players" :key="p.id"
        class="rounded-full border-2 transition" :class="i === idx ? 'border-accent-yellow' : 'border-transparent opacity-50 hover:opacity-90'"
        :style="{ transform: i === idx ? 'scale(1.12)' : 'none' }" @click="go(i)">
        <PlayerAvatar :player="p" :size="34" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.aofa-slide-enter-active { transition: all .5s cubic-bezier(.18,.7,.25,1); }
.aofa-slide-leave-active { transition: all .35s ease-in; }
.aofa-slide-enter-from { opacity: 0; transform: translateY(28px) scale(.92); }
.aofa-slide-leave-to { opacity: 0; transform: translateY(-22px) scale(.96); }
</style>
