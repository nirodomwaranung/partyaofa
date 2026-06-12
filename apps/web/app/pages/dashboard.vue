<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';

const store = useGameStore();
const fmt = (n: number) => n.toLocaleString('th-TH');
const totals = computed(() => store.totals);
const rankings = computed(() => store.rankings);

const stats = computed(() => [
  { label: 'ผู้เล่นทั้งหมด', value: totals.value.players, icon: 'users', color: '#4D96FF' },
  { label: 'เกมทั้งหมด', value: totals.value.games, icon: 'gamepad-2', color: '#C780FA' },
  { label: 'เงินที่แจก (฿)', value: fmt(totals.value.prize), icon: 'coins', color: '#34D399' },
  { label: 'โดนยกรวม', value: totals.value.drinks, icon: 'beer', color: '#FF6B6B' },
]);

const boards = computed(() => [
  { title: 'Top Winner', icon: 'trophy', color: '#FFD93D', stat: 'wins', suffix: 'ชนะ', list: rankings.value.winners },
  { title: 'Top Drinker', icon: 'beer', color: '#FF6B6B', stat: 'drinks', suffix: 'แก้ว', list: rankings.value.drinkers },
  { title: 'Top Lucky (เงิน)', icon: 'sparkles', color: '#34D399', stat: 'prize', suffix: '฿', list: rankings.value.lucky },
  { title: 'Top Unlucky', icon: 'cloud-rain', color: '#C780FA', stat: 'drinks', suffix: 'แก้ว', list: rankings.value.unlucky },
]);
</script>

<template>
  <div>
    <h1 class="font-head mb-5 text-[38px] font-extrabold text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,.18)">Dashboard</h1>

    <div class="mb-6 grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))">
      <div v-for="s in stats" :key="s.label" class="aofa-card flex items-center gap-3 p-5">
        <div class="flex h-14 w-14 items-center justify-center rounded-[16px] border-[3px] border-outline shadow-hard-sm" :style="{ background: s.color }">
          <Icon :name="s.icon" :size="26" color="#2A1B4D" :stroke="2.3" />
        </div>
        <div>
          <div class="font-head text-[28px] font-extrabold leading-none text-outline">{{ s.value }}</div>
          <div class="text-sm font-semibold text-[#7a6a99]">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(270px, 1fr))">
      <div v-for="b in boards" :key="b.title" class="aofa-card p-5">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-[11px] border-2 border-outline" :style="{ background: b.color }">
            <Icon :name="b.icon" :size="18" color="#2A1B4D" />
          </div>
          <h3 class="font-head text-lg font-extrabold text-outline">{{ b.title }}</h3>
        </div>
        <div v-for="(p, i) in b.list" :key="p.id" class="flex items-center gap-2.5 border-b border-[#eee] py-1.5 last:border-0">
          <span class="font-head w-5 text-center text-base font-extrabold" :style="{ color: i === 0 ? '#B45309' : '#bbb' }">{{ i + 1 }}</span>
          <PlayerAvatar :player="p" :size="34" />
          <span class="font-head flex-1 text-sm font-bold text-outline">{{ p.nick }}</span>
          <span class="font-head text-sm font-extrabold" :style="{ color: b.color === '#FFD93D' ? '#B45309' : b.color }">
            {{ (p as any)[b.stat] }} {{ b.suffix }}
          </span>
        </div>
        <p v-if="!b.list.length" class="py-3 text-center text-sm text-[#9a86bd]">ยังไม่มีข้อมูล</p>
      </div>
    </div>
  </div>
</template>
