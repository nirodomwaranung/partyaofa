<script setup lang="ts">
// Background music output — lives on the TV screen (tv layout). Driven by the
// shared music state (store.music) which the remote/admin controls. Plays a
// built-in looping track or a YouTube video (audio). Handles browser autoplay
// blocking with a one-tap "enable sound" prompt.
import { ref, watch, onMounted } from 'vue';
import { useGameStore } from '~/stores/game';
import { MUSIC_TRACKS, youtubeId } from '~/utils/musicTracks';

const store = useGameStore();
const audio = ref<HTMLAudioElement | null>(null);
const needsGesture = ref(false);
let yt: any = null;
let ytReady = false;

function loadYTApi(cb: () => void) {
  const w = window as any;
  if (w.YT && w.YT.Player) return cb();
  if (!document.getElementById('yt-iframe-api')) {
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
  const prev = w.onYouTubeIframeAPIReady;
  w.onYouTubeIframeAPIReady = () => { prev?.(); cb(); };
}

function stopAudio() { audio.value?.pause(); }
function stopYT() { try { yt?.pauseVideo?.(); } catch { /* */ } }

function applyYouTube(url: string, m: { playing: boolean; volume: number }) {
  const id = youtubeId(url);
  if (!id) return;
  stopAudio();
  loadYTApi(() => {
    const w = window as any;
    if (!yt) {
      yt = new w.YT.Player('aofa-yt', {
        height: '0', width: '0', videoId: id,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: id, playsinline: 1 },
        events: {
          onReady: () => { ytReady = true; pushYT(m); },
          // YT autoplay blocks are silent (playVideo never throws). Watch the
          // real player state instead: once it actually plays, hide the prompt;
          // if it's stuck unstarted/cued while we want it playing, prompt a tap.
          onStateChange: (e: any) => {
            const PLAYING = 1, BUFFERING = 3;
            if (e.data === PLAYING || e.data === BUFFERING) needsGesture.value = false;
          },
        },
      });
    } else if (ytReady) {
      if (yt.getVideoData?.().video_id !== id) yt.loadVideoById(id);
      pushYT(m);
    }
  });
}
function pushYT(m: { playing: boolean; volume: number }) {
  if (!yt?.setVolume) return;
  yt.setVolume(Math.round(m.volume * 100));
  if (!m.playing) { yt.pauseVideo(); return; }
  yt.playVideo();
  // playVideo() can't be caught when autoplay is blocked — verify it actually
  // started a moment later, and surface the one-tap prompt if it didn't.
  setTimeout(() => {
    const PLAYING = 1, BUFFERING = 3;
    const st = yt?.getPlayerState?.();
    if (store.music.playing && st !== PLAYING && st !== BUFFERING) needsGesture.value = true;
  }, 1200);
}

function apply() {
  if (!import.meta.client) return;
  const m = store.music;
  if (m.trackId === 'youtube' && m.youtubeUrl) { applyYouTube(m.youtubeUrl, m); return; }
  // built-in track
  stopYT();
  const track = MUSIC_TRACKS.find((t) => t.id === m.trackId);
  const el = audio.value;
  if (!el) return;
  if (track && el.getAttribute('data-src') !== track.src) { el.src = track.src; el.setAttribute('data-src', track.src); }
  el.volume = m.volume;
  if (track && m.playing) el.play().catch(() => (needsGesture.value = true));
  else el.pause();
}

function enableSound() {
  needsGesture.value = false;
  apply(); // now inside a user gesture → play() allowed
}

watch(() => store.music, apply, { deep: true });
onMounted(apply);
</script>

<template>
  <div>
    <audio ref="audio" loop preload="auto" />
    <div id="aofa-yt" style="position: absolute; width: 0; height: 0; overflow: hidden" />
    <Transition name="pop">
      <button v-if="needsGesture" class="aofa-btn aofa-btn-pink fixed bottom-5 left-1/2 z-[95] -translate-x-1/2 px-6 py-3 text-base"
        @click="enableSound">
        <Icon name="volume-2" :size="18" color="#fff" />แตะเพื่อเปิดเสียงเพลง
      </button>
    </Transition>
  </div>
</template>
