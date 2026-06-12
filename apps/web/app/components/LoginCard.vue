<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '~/stores/game';

withDefaults(defineProps<{ title?: string; subtitle?: string }>(), {
  title: 'เข้าสู่ระบบ Game Master',
  subtitle: 'สำหรับแอดมินจัดการผู้เล่นและตั้งค่าเกมเท่านั้น',
});

const store = useGameStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  const res = await store.login(email.value, password.value);
  loading.value = false;
  if (!res.ok) error.value = res.error || 'เข้าสู่ระบบไม่สำเร็จ';
  else { email.value = ''; password.value = ''; }
}
</script>

<template>
  <div class="mx-auto mt-8 max-w-md rounded-[22px] border-[3px] border-outline bg-white p-7 text-outline shadow-hard">
    <div class="mb-3.5 flex h-[60px] w-[60px] items-center justify-center rounded-[18px] border-[3px] border-outline shadow-hard-sm"
      style="background: linear-gradient(180deg,#C780FA,#9333EA)">
      <Icon name="lock-keyhole" :size="30" color="#fff" :stroke="2.4" />
    </div>
    <div class="font-head text-[22px] font-extrabold">{{ title }}</div>
    <div class="mb-4 mt-1 text-[13px] text-[#7a6a99]">{{ subtitle }}</div>

    <input v-model="email" type="email" placeholder="อีเมล" autocomplete="username"
      class="mb-2.5 w-full rounded-[13px] border-[2.5px] border-[#C9B6FF] px-3.5 py-3 outline-none" @keyup.enter="submit" />
    <input v-model="password" type="password" placeholder="รหัสผ่าน" autocomplete="current-password"
      class="w-full rounded-[13px] border-[2.5px] px-3.5 py-3 outline-none"
      :class="error ? 'border-accent-red' : 'border-[#C9B6FF]'" @keyup.enter="submit" />

    <p v-if="error" class="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#E03070]">
      <Icon name="triangle-alert" :size="13" color="#E03070" />{{ error }}
    </p>

    <button class="aofa-btn mt-4 flex w-full items-center justify-center gap-2 py-3 text-[17px]"
      style="background: linear-gradient(180deg,#FF8A3D,#F4621E)" :disabled="loading" @click="submit">
      <Icon name="log-in" :size="19" color="#fff" />{{ loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ' }}
    </button>
    <div class="mt-3 text-center text-[11px] text-[#b3a3cf]">ผู้ชมทั่วไปไม่ต้องเข้าสู่ระบบ • ดูได้เลย</div>
  </div>
</template>
