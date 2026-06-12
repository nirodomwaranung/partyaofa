<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '~/stores/game';
import type { Player } from '~/stores/game';

const store = useGameStore();
const api = useApi();
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '') + 'k' : String(n));
const players = computed(() => store.players);

const PALETTE = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA', '#FF9F45', '#22D3EE', '#F368A8', '#A0E548', '#FF7A59', '#5CE1E6', '#FFB84C'];

// add / edit modal
const editing = ref<{ id?: string; nick: string; company: string; color: string } | null>(null);
const isNew = ref(false);
const saving = ref(false);

function openAdd() {
  editing.value = { nick: '', company: '', color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
  isNew.value = true;
}
function openEdit(p: Player) {
  editing.value = { id: p.id, nick: p.nick, company: p.company, color: p.color };
  isNew.value = false;
}
function close() { editing.value = null; }

function authError(err: any): string {
  const s = err?.response?.status ?? err?.statusCode;
  if (s === 401 || s === 403) return 'เซสชันหมดอายุหรือไม่มีสิทธิ์ — กรุณาเข้าสู่ระบบใหม่';
  return err?.data?.message || err?.message || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
}

async function save() {
  if (!editing.value || saving.value) return;
  const e = editing.value;
  if (!e.nick.trim()) return;
  saving.value = true;
  try {
    const body = { nick: e.nick.trim(), company: e.company.trim(), color: e.color };
    if (isNew.value) await api.post('/players', body);
    else await api.patch(`/players/${e.id}`, body);
    editing.value = null;
  } catch (err) {
    alert(authError(err));
  } finally {
    saving.value = false;
  }
}

async function remove(p: Player) {
  if (!confirm(`ลบผู้เล่น "${p.nick}" ?`)) return;
  try {
    await api.del(`/players/${p.id}`);
  } catch (err) {
    alert(authError(err));
  }
}

function onUpload(id: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = async () => { await api.patch(`/players/${id}`, { photo: rd.result }); };
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
        <button class="aofa-btn aofa-btn-green ml-auto flex items-center gap-1.5 px-4 py-2.5 text-[15px]" @click="openAdd">
          <Icon name="user-plus" :size="18" color="#fff" />เพิ่มผู้เล่น
        </button>
      </template>
    </div>

    <LoginCard v-if="!store.adminAuthed" title="Game Master เท่านั้น" subtitle="เข้าสู่ระบบเพื่อจัดการผู้เล่น" />

    <div v-else>
      <p class="mb-5 flex items-center gap-1.5 text-sm text-[#C9B6FF]">
        <Icon name="camera" :size="15" color="#C9B6FF" />แตะรูปเพื่ออัปโหลดโปรไฟล์ · ปุ่มดินสอ = แก้ไข · ถังขยะ = ลบ
      </p>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
        <div v-for="p in players" :key="p.id" class="aofa-card relative flex flex-col items-center gap-2 p-4">
          <!-- edit / delete -->
          <div class="absolute right-2 top-2 flex gap-1">
            <button class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-outline bg-[#F1ECFB]" title="แก้ไข" @click="openEdit(p)">
              <Icon name="pencil" :size="13" color="#6D28D9" />
            </button>
            <button class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-outline bg-[#FCEEF1]" title="ลบ" @click="remove(p)">
              <Icon name="trash-2" :size="13" color="#D6336C" />
            </button>
          </div>

          <label class="relative flex h-[76px] cursor-pointer items-end" title="อัปโหลดรูปโปรไฟล์">
            <input type="file" accept="image/*" class="hidden" @change="onUpload(p.id, $event)" />
            <PlayerAvatar :player="p" :size="68" />
            <span class="absolute -right-1 bottom-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-white bg-[#6D28D9] shadow-hard-sm">
              <Icon name="camera" :size="14" color="#fff" />
            </span>
          </label>
          <div class="font-head text-xl font-extrabold leading-none text-outline">{{ p.nick }}</div>
          <span v-if="p.company" class="rounded-lg bg-[#F1ECFB] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]">{{ p.company }}</span>

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

    <!-- add / edit modal -->
    <div v-if="editing" class="fixed inset-0 z-[90] flex items-center justify-center p-4" style="background: rgba(20,10,40,.55)" @click.self="close">
      <div class="aofa-card w-full max-w-sm p-6 text-outline">
        <h2 class="font-head mb-4 text-2xl font-extrabold">{{ isNew ? 'เพิ่มผู้เล่น' : 'แก้ไขผู้เล่น' }}</h2>

        <div class="mb-3 flex justify-center"><BeanAvatar :color="editing.color" :size="64" /></div>

        <label class="text-sm font-semibold">ชื่อเล่น</label>
        <input v-model="editing.nick" placeholder="เช่น ออฟ" class="mb-3 mt-1 w-full rounded-[12px] border-[2.5px] border-outline px-3 py-2.5 outline-none" @keyup.enter="save" />

        <label class="text-sm font-semibold">บริษัท <span class="font-normal text-[#9a86bd]">(ไม่บังคับ)</span></label>
        <input v-model="editing.company" placeholder="เช่น AOFA Tech" class="mb-3 mt-1 w-full rounded-[12px] border-[2.5px] border-outline px-3 py-2.5 outline-none" @keyup.enter="save" />

        <label class="text-sm font-semibold">สีประจำตัว</label>
        <div class="mb-5 mt-1.5 flex flex-wrap gap-2">
          <button v-for="c in PALETTE" :key="c" class="h-7 w-7 rounded-full border-2 transition"
            :style="{ background: c, borderColor: editing.color === c ? '#2A1B4D' : 'transparent', transform: editing.color === c ? 'scale(1.15)' : 'none' }"
            @click="editing.color = c" />
        </div>

        <div class="flex gap-2">
          <button class="aofa-btn aofa-btn-pink flex-1 py-2.5" :disabled="saving || !editing.nick.trim()" @click="save">
            {{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}
          </button>
          <button class="rounded-[14px] border-2 border-outline/20 px-4 font-bold text-[#7a6a99]" @click="close">ยกเลิก</button>
        </div>
      </div>
    </div>
  </div>
</template>
