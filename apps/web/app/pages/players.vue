<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';

const store = useGameStore();
const api = useApi();
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '') + 'k' : String(n));
const players = computed(() => store.players);

async function addPlayer() {
  await api.post('/players', {});
}
function onUpload(id: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = async () => {
    await api.patch(`/players/${id}`, { photo: rd.result });
  };
  rd.readAsDataURL(file);
}
</script>

<template>
  <div>
    <div class="mb-2 flex flex-wrap items-center gap-3">
      <h1 class="font-head m-0 text-[38px] font-extrabold text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,.18)">
        ผู้เล่นทั้งหมด
      </h1>
      <template v-if="store.adminAuthed">
        <div class="font-head rounded-[12px] border-[2.5px] border-outline bg-accent-yellow px-3.5 py-0.5 text-lg font-extrabold text-outline shadow-hard-sm">
          {{ players.length }} คน
        </div>
        <button class="aofa-btn aofa-btn-green ml-auto flex items-center gap-1.5 px-4 py-2.5 text-[15px]" @click="addPlayer">
          <Icon name="user-plus" :size="18" color="#fff" />เพิ่มผู้เล่น
        </button>
      </template>
    </div>

    <!-- login gate -->
    <LoginCard v-if="!store.adminAuthed" title="Game Master เท่านั้น" subtitle="เข้าสู่ระบบเพื่อจัดการผู้เล่น" />

    <div v-else>
      <p class="mb-5 flex items-center gap-1.5 text-sm text-[#C9B6FF]">
        <Icon name="camera" :size="15" color="#C9B6FF" />แตะรูปผู้เล่นเพื่ออัปโหลดรูปโปรไฟล์จริง
      </p>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))">
        <div v-for="p in players" :key="p.id" class="aofa-card flex flex-col items-center gap-2 p-4">
          <label class="relative flex h-[76px] cursor-pointer items-end" title="อัปโหลดรูปโปรไฟล์">
            <input type="file" accept="image/*" class="hidden" @change="onUpload(p.id, $event)" />
            <PlayerAvatar :player="p" :size="68" />
            <span class="absolute -right-1 bottom-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-white bg-[#6D28D9] shadow-hard-sm">
              <Icon name="camera" :size="14" color="#fff" />
            </span>
          </label>
          <div class="font-head text-xl font-extrabold leading-none text-outline">{{ p.nick }}</div>
          <div class="text-center text-[13px] font-semibold leading-tight text-[#7a6a99]">{{ p.name }}</div>
          <div class="flex flex-wrap justify-center gap-1.5">
            <span class="rounded-lg bg-[#F1ECFB] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]">{{ p.company }}</span>
            <span class="rounded-lg bg-[#FFF1D6] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">{{ p.dept }}</span>
          </div>
          <div class="mt-0.5 flex w-full gap-1.5">
            <div class="flex-1 rounded-[11px] border-2 border-[#FFE08A] bg-[#FFF8E6] py-1.5 text-center">
              <div class="font-head text-[17px] font-extrabold text-[#B45309]">{{ p.wins }}</div>
              <div class="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-[#B98A2E]"><Icon name="trophy" :size="11" color="#B98A2E" />ชนะ</div>
            </div>
            <div class="flex-1 rounded-[11px] border-2 border-[#F6C6D2] bg-[#FCEEF1] py-1.5 text-center">
              <div class="font-head text-[17px] font-extrabold text-[#D6336C]">{{ p.drinks }}</div>
              <div class="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-[#C25478]"><Icon name="beer" :size="11" color="#C25478" />โดนยก</div>
            </div>
            <div class="flex-[1.2] rounded-[11px] border-2 border-[#B6ECCF] bg-[#E9F9F1] py-1.5 text-center">
              <div class="font-head text-[15px] font-extrabold text-[#0F9D58]">{{ fmt(p.prize) }}</div>
              <div class="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-[#3FA776]"><Icon name="coins" :size="11" color="#3FA776" />สะสม</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
