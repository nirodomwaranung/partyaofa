export interface MusicTrack { id: string; name: string; src: string }

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'party', name: '🎉 ปาร์ตี้', src: '/music/party.wav' },
  { id: 'chill', name: '😌 ชิล', src: '/music/chill.wav' },
  { id: 'gameshow', name: '🎬 เกมโชว์', src: '/music/gameshow.wav' },
];

/** Extract an 11-char YouTube video id from common URL shapes. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(url) ? url : null;
}
