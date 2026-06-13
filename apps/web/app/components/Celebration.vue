<script setup lang="ts">
// Screen-wide win celebration: confetti + a brief "ผู้ชนะ!" flash.
// Self-contained — drop into any layout. Listens to the broadcast game:event.
import { ref, watch } from 'vue';
import { useGameStore } from '~/stores/game';
import { useSounds } from '~/composables/useSounds';

const store = useGameStore();
const sounds = useSounds();
const confetti = ref(false);
const flash = ref<{ label: string; sub: string } | null>(null);
let ct: any = null, ft: any = null;

watch(() => store.lastEvent, (e) => {
  if (!e || e.type !== 'result') return;
  const p: any = e.payload || {};
  const drink = p?.prize?.kind === 'drink' || p?.result?.kind === 'drink' || p?.reward?.kind === 'drink';
  const penalty = ['bomb', 'mine'].includes(e.gameKey || '');
  if (drink || penalty) return; // penalties have their own in-game reveal

  // figure out who/what won
  let label = 'ผู้ชนะ!';
  let sub = '';
  const winId = p.winnerId || (Array.isArray(p.ranks) && p.ranks[0]?.id) || (Array.isArray(p.ranks) && p.ranks[0]);
  if (winId) { label = store.playerById(winId)?.nick || 'ผู้ชนะ!'; sub = 'เข้าวิน! 🏆'; }
  else if (p.winner) { label = (e.gameKey === 'boxing' ? (p.winner === 'blue' ? 'ทีมน้ำเงิน' : 'ทีมแดง') : (p.winner === 'tiger' ? 'เสือ' : 'มังกร')) + ' ชนะ!'; sub = '🏆'; }
  else { const sp = store.spotlight; sub = p?.prize?.label || p?.result?.label || p?.reward?.label || ''; label = sp ? `${sp.nick} ได้!` : 'ผู้ชนะ!'; }

  flash.value = { label, sub };
  confetti.value = true;
  sounds.play('confetti');
  clearTimeout(ct); clearTimeout(ft);
  ct = setTimeout(() => (confetti.value = false), 3400);
  ft = setTimeout(() => (flash.value = null), 2800);
});
</script>

<template>
  <Confetti :show="confetti" />
  <Transition name="pop">
    <div v-if="flash" class="pointer-events-none fixed inset-0 z-[85] flex flex-col items-center justify-center" style="animation: pop .35s">
      <div class="font-head text-[64px] font-extrabold text-accent-yellow" style="text-shadow: 0 5px 0 #2A1B4D, 0 0 30px rgba(255,217,61,.7)">🎉 {{ flash.label }}</div>
      <div v-if="flash.sub" class="font-head mt-2 text-3xl font-extrabold text-white" style="text-shadow: 0 3px 0 #2A1B4D">{{ flash.sub }}</div>
    </div>
  </Transition>
</template>
