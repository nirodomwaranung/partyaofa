<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '~/stores/game';

const props = defineProps<{ gameKey: string; lock: Record<string, any> }>();
const emit = defineEmits<{ set: [value: any] }>();
const store = useGameStore();

const WHEEL_LABELS = ['เงิน 500', 'Voucher', 'รอดตัว', 'ยก 1 ช็อต', 'เงิน 1,000', 'ยก 3 ช็อต', 'JACKPOT', 'รอดตัว 2'];
const lockKey = computed(() => (['horse', 'race'].includes(props.gameKey) ? 'race' : props.gameKey === 'box' ? 'card' : props.gameKey));
const val = computed(() => props.lock[lockKey.value]);
</script>

<template>
  <div class="text-sm">
    <!-- wheel -->
    <select v-if="gameKey === 'wheel'" :value="val" class="w-full rounded-[12px] border-2 border-outline px-3 py-2 font-bold" @change="emit('set', +($event.target as HTMLSelectElement).value)">
      <option v-for="(l, i) in WHEEL_LABELS" :key="i" :value="i">ช่อง {{ i + 1 }} — {{ l }}</option>
    </select>

    <!-- slot -->
    <select v-else-if="gameKey === 'slot'" :value="val" class="w-full rounded-[12px] border-2 border-outline px-3 py-2 font-bold" @change="emit('set', ($event.target as HTMLSelectElement).value)">
      <option value="jackpot">JACKPOT</option>
      <option value="cash">เงินสด</option>
      <option value="drink">ยกเหล้า</option>
      <option value="none">ไม่ตรง</option>
    </select>

    <!-- card / box -->
    <select v-else-if="['card', 'box'].includes(gameKey)" :value="val" class="w-full rounded-[12px] border-2 border-outline px-3 py-2 font-bold" @change="emit('set', ($event.target as HTMLSelectElement).value)">
      <option value="jackpot">JACKPOT</option>
      <option value="cash">เงิน 1,000</option>
      <option value="voucher">Voucher</option>
      <option value="double">Double</option>
      <option value="drink">ยกเหล้า</option>
    </select>

    <!-- number -->
    <div v-else-if="gameKey === 'number'" class="flex items-center gap-2">
      <input type="range" min="1" max="100" :value="val ?? 50" class="flex-1" @change="emit('set', +($event.target as HTMLInputElement).value)" />
      <span class="font-head w-10 text-right font-extrabold">{{ val ?? 50 }}</span>
    </div>

    <!-- boxing -->
    <div v-else-if="gameKey === 'boxing'" class="flex gap-2">
      <button v-for="s in ['blue', 'red']" :key="s" class="font-head flex-1 rounded-[12px] border-[2.5px] border-outline py-2 font-bold capitalize"
        :style="val === s ? { background: s === 'blue' ? '#4D96FF' : '#FF6B6B', color: '#fff' } : { background: '#fff', opacity: .6 }" @click="emit('set', s)">
        ทีม{{ s === 'blue' ? 'น้ำเงิน' : 'แดง' }}
      </button>
    </div>

    <!-- tiger-dragon -->
    <div v-else-if="gameKey === 'td'" class="flex gap-2">
      <button v-for="s in ['tiger', 'dragon']" :key="s" class="font-head flex-1 rounded-[12px] border-[2.5px] border-outline py-2 font-bold"
        :style="val === s ? { background: s === 'tiger' ? '#FB923C' : '#10B981', color: '#fff' } : { background: '#fff', opacity: .6 }" @click="emit('set', s)">
        {{ s === 'tiger' ? '🐯 เสือ' : '🐲 มังกร' }}
      </button>
    </div>

    <!-- player-target games: horse/race/bomb/mine -->
    <select v-else-if="['horse', 'race', 'bomb', 'mine'].includes(gameKey)" :value="val" class="w-full rounded-[12px] border-2 border-outline px-3 py-2 font-bold" @change="emit('set', ($event.target as HTMLSelectElement).value)">
      <option v-for="p in store.roundPlayers" :key="p.id" :value="p.id">{{ p.nick }} — {{ p.name }}</option>
    </select>

    <p v-else class="text-[#9a86bd]">เกมนี้ไม่ต้องล็อกผล (ตัดสินจากเวลา/อินพุตจริง)</p>

    <p class="mt-2 text-xs text-[#9a86bd]">
      {{ ['horse', 'race'].includes(gameKey) ? 'ผู้เล่นที่เลือกจะเข้าวินอันดับ 1'
        : ['bomb', 'mine'].includes(gameKey) ? 'ผู้เล่นที่เลือกจะโดนโทษ' : 'ผลที่ตั้งไว้จะออกตอนเริ่มเกม' }}
    </p>
  </div>
</template>
