<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';

definePageMeta({ layout: 'tv' });

const store = useGameStore();
const fmt = (n: number) => n.toLocaleString('th-TH');
const r = computed(() => store.rankings);
const t = computed(() => store.totals);
const podium = computed(() => r.value.winners.slice(0, 3)); // [1st,2nd,3rd]
// reorder for stage: 2nd, 1st, 3rd
const stage = computed(() => {
  const w = podium.value;
  return [w[1], w[0], w[2]].map((p, i) => ({ p, place: i === 1 ? 1 : i === 0 ? 2 : 3 }));
});
const medalColor = (place: number) => (place === 1 ? '#FFD93D' : place === 2 ? '#C0C0C0' : '#CD7F32');
const podiumH = (place: number) => (place === 1 ? 170 : place === 2 ? 120 : 90);
const avatarSz = (place: number) => (place === 1 ? 96 : 72);
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center px-6 py-6">
    <Confetti :show="true" :count="120" />

    <h1 class="font-head text-center text-[44px] font-extrabold" style="text-shadow: 0 5px 0 rgba(0,0,0,.2)">
      🏆 สรุปงาน {{ store.eventName }} 🏆
    </h1>
    <p class="mb-6 mt-1 text-[#D9C9FF]">ขอบคุณทุกคนที่มาร่วมสนุก — นี่คือสุดยอดแห่งค่ำคืน!</p>

    <!-- podium -->
    <div v-if="podium.length" class="flex items-end justify-center gap-5">
      <div v-for="(s, i) in stage" :key="i" class="flex flex-col items-center" :class="{ 'opacity-0': !s.p }">
        <template v-if="s.p">
          <div class="font-head text-2xl font-extrabold" :style="{ color: medalColor(s.place) }">#{{ s.place }}</div>
          <div class="relative mb-1">
            <PlayerAvatar :player="s.p" :size="avatarSz(s.place)" />
            <div v-if="s.place === 1" class="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl">👑</div>
          </div>
          <div class="font-head text-lg font-extrabold text-white">{{ s.p.nick }}</div>
          <div class="text-sm font-bold text-accent-yellow">{{ s.p.wins }} ชนะ</div>
          <div class="mt-2 flex w-[110px] items-start justify-center rounded-t-[14px] border-[3px] border-b-0 border-outline"
            :style="{ height: podiumH(s.place) + 'px', background: `linear-gradient(180deg, ${medalColor(s.place)}, ${medalColor(s.place)}aa)` }">
            <Icon name="trophy" :size="30" color="#2A1B4D" class="mt-3" />
          </div>
        </template>
      </div>
    </div>
    <div v-else class="py-10 text-[#C9B6FF]">ยังไม่มีผลการเล่น</div>

    <!-- award cards -->
    <div class="mt-8 grid w-full max-w-4xl gap-4" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
      <div v-for="award in [
        { title: 'ราชาแห่งการดื่ม', icon: 'beer', color: '#FF6B6B', list: r.drinkers, stat: 'drinks', suffix: 'แก้ว' },
        { title: 'ดวงเฮงที่สุด', icon: 'clover', color: '#34D399', list: r.lucky, stat: 'prize', suffix: '฿', money: true },
        { title: 'ผู้โชคร้ายแห่งคืน', icon: 'cloud-rain', color: '#C780FA', list: r.unlucky, stat: 'drinks', suffix: 'แก้ว' },
      ]" :key="award.title" class="aofa-card p-4 text-outline">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-[11px] border-2 border-outline" :style="{ background: award.color }"><Icon :name="award.icon" :size="18" color="#2A1B4D" /></div>
          <h3 class="font-head text-lg font-extrabold">{{ award.title }}</h3>
        </div>
        <div v-if="award.list[0]" class="flex items-center gap-2.5">
          <PlayerAvatar :player="award.list[0]" :size="44" />
          <span class="font-head flex-1 text-lg font-extrabold">{{ award.list[0].nick }}</span>
          <span class="font-head text-base font-extrabold" :style="{ color: award.color }">{{ award.money ? fmt(award.list[0][award.stat]) : award.list[0][award.stat] }} {{ award.suffix }}</span>
        </div>
        <div v-else class="text-sm text-[#9a86bd]">—</div>
      </div>
    </div>

    <!-- totals -->
    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <div class="rounded-[14px] border-2 border-white/15 bg-black/20 px-5 py-2 text-center">
        <div class="font-head text-2xl font-extrabold text-accent-green">{{ fmt(t.prize) }}฿</div>
        <div class="text-xs text-[#C9B6FF]">เงินแจกรวม</div>
      </div>
      <div class="rounded-[14px] border-2 border-white/15 bg-black/20 px-5 py-2 text-center">
        <div class="font-head text-2xl font-extrabold text-accent-red">{{ t.drinks }}</div>
        <div class="text-xs text-[#C9B6FF]">โดนยกรวม (แก้ว)</div>
      </div>
      <div class="rounded-[14px] border-2 border-white/15 bg-black/20 px-5 py-2 text-center">
        <div class="font-head text-2xl font-extrabold text-accent-blue">{{ t.players }}</div>
        <div class="text-xs text-[#C9B6FF]">ผู้เล่นทั้งหมด</div>
      </div>
    </div>

    <NuxtLink to="/select" class="font-head mt-6 rounded-[14px] border-2 border-white/25 bg-white/10 px-5 py-2 text-sm font-bold text-white hover:bg-white/20">← กลับหน้าเลือกเกม</NuxtLink>
  </div>
</template>
