import { defineStore } from 'pinia';

export interface Player {
  id: string; nick: string; name: string; company: string; dept: string;
  role?: string; color: string; photo: string | null;
  wins: number; drinks: number; prize: number; plays: number;
}
export interface Game {
  key: string; name: string; type: string; icon: string; cover: string | null;
  p1: number; p2: number; p3: number; loserDrink: boolean;
  tigerImg: string | null; dragonImg: string | null; order: number;
}
export interface Reward { id: string; icon: string; label: string; img: string | null; order: number; }
export type ResultMode = 'random' | 'weight' | 'lock';
export interface Session {
  id: string; eventName: string; resultMode: ResultMode;
  roundIds: string[]; spotlightId: string | null;
  weights: Record<string, number>; lock: Record<string, any>; activeGameKey: string | null;
}
export interface GameEvent { gameKey: string | null; type: 'start' | 'result' | 'reset'; payload: any; }

export const useGameStore = defineStore('game', {
  state: () => ({
    connected: false,
    session: null as Session | null,
    players: [] as Player[],
    games: [] as Game[],
    rewards: [] as Reward[],
    adminAuthed: false,
    lastEvent: null as GameEvent | null,
    _bound: false,
  }),

  getters: {
    eventName: (s) => s.session?.eventName ?? 'งานเลี้ยง AOFA 2026',
    mode: (s) => s.session?.resultMode ?? 'random',
    roundIds: (s) => s.session?.roundIds ?? [],
    roundPlayers(s): Player[] {
      const ids = s.session?.roundIds ?? [];
      return ids.map((id) => s.players.find((p) => p.id === id)).filter(Boolean) as Player[];
    },
    spotlight(s): Player | null {
      const id = s.session?.spotlightId;
      return id ? s.players.find((p) => p.id === id) ?? null : null;
    },
    gameByKey: (s) => (key: string) => s.games.find((g) => g.key === key) ?? null,
    playerById: (s) => (id: string) => s.players.find((p) => p.id === id) ?? null,

    // dashboard aggregates (Spec §7)
    totals(s) {
      return {
        players: s.players.length,
        games: s.games.length,
        prize: s.players.reduce((a, p) => a + p.prize, 0),
        drinks: s.players.reduce((a, p) => a + p.drinks, 0),
      };
    },
    rankings(s) {
      const by = (k: keyof Player) => [...s.players].sort((a, b) => (b[k] as number) - (a[k] as number)).slice(0, 5);
      return {
        winners: by('wins'),
        drinkers: by('drinks'),
        lucky: by('prize'),
        unlucky: [...s.players].sort((a, b) => b.drinks - a.drinks || a.wins - b.wins).slice(0, 5),
      };
    },
  },

  actions: {
    /** Bind to the shared socket once (call from app.vue). */
    bind() {
      if (this._bound || !import.meta.client) return;
      const { $socket } = useNuxtApp() as any;
      if (!$socket) return;
      this._bound = true;

      $socket.on('connect', () => (this.connected = true));
      $socket.on('disconnect', () => (this.connected = false));
      $socket.on('state:sync', (s: any) => {
        this.session = s.session;
        this.players = s.players;
        this.games = s.games;
        this.rewards = s.rewards;
      });
      $socket.on('game:event', (e: GameEvent) => (this.lastEvent = e));

      // restore Supabase session (Game Master)
      this.restoreSession();
    },

    async restoreSession() {
      const { $supabase } = useNuxtApp() as any;
      if (!$supabase) return;
      const { data } = await $supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        localStorage.setItem('aofa_token', token);
        this.adminAuthed = true;
      }
      // keep the bearer token fresh on refresh / sign-in / sign-out
      $supabase.auth.onAuthStateChange((_e: string, session: any) => {
        if (session?.access_token) {
          localStorage.setItem('aofa_token', session.access_token);
          this.adminAuthed = true;
        } else {
          localStorage.removeItem('aofa_token');
          this.adminAuthed = false;
        }
      });
    },

    socket() {
      const { $socket } = useNuxtApp() as any;
      return $socket;
    },

    // ----- admin commands -----
    // Each updates local state OPTIMISTICALLY (instant UI), then emits. The
    // server echo (state:sync) reconciles with the same values ~1 RTT later.
    setMode(mode: ResultMode) {
      if (this.session) this.session.resultMode = mode;
      this.socket()?.emit('admin:setMode', { mode });
    },
    setLock(gameKey: string, value: any) {
      if (this.session) this.session.lock = { ...this.session.lock, [gameKey]: value };
      this.socket()?.emit('admin:setLock', { gameKey, value });
    },
    setRound(playerIds: string[]) {
      if (this.session) {
        this.session.roundIds = playerIds;
        const w = { ...this.session.weights };
        playerIds.forEach((id) => { if (!w[id]) w[id] = 50; });
        this.session.weights = w;
        if (!playerIds.includes(this.session.spotlightId ?? '')) this.session.spotlightId = playerIds[0] ?? null;
      }
      this.socket()?.emit('admin:setRound', { playerIds });
    },
    toggleRound(id: string) {
      const ids = this.roundIds.includes(id) ? this.roundIds.filter((x) => x !== id) : [...this.roundIds, id];
      if (ids.length < 2) return;
      this.setRound(ids);
    },
    setSpotlight(playerId: string) {
      if (this.session) this.session.spotlightId = playerId;
      this.socket()?.emit('admin:setSpotlight', { playerId });
    },
    setWeight(playerId: string, value: number) {
      if (this.session) this.session.weights = { ...this.session.weights, [playerId]: value };
      this.socket()?.emit('admin:setWeight', { playerId, value });
    },
    setEventName(name: string) {
      if (this.session) this.session.eventName = name;
      this.socket()?.emit('admin:setEventName', { name });
    },
    startGame(gameKey: string) {
      if (this.session) this.session.activeGameKey = gameKey;
      this.socket()?.emit('admin:startGame', { gameKey });
    },
    resetGame(gameKey?: string) { this.socket()?.emit('admin:resetGame', { gameKey }); },

    /** Ask server to decide the outcome; resolves with the result payload. */
    resolveGame(gameKey: string, inputs: Record<string, any> = {}): Promise<any> {
      return new Promise((resolve) => {
        const s = this.socket();
        if (!s) return resolve(null);
        s.emit('admin:resolveGame', { gameKey, inputs }, (ack: any) => resolve(ack));
      });
    },

    /** Game Master sign-in via Supabase Auth (email + password). */
    async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
      const { $supabase } = useNuxtApp() as any;
      if (!$supabase) return { ok: false, error: 'Supabase ไม่พร้อม' };
      const { data, error } = await $supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data?.session) return { ok: false, error: error?.message || 'เข้าสู่ระบบไม่สำเร็จ' };
      localStorage.setItem('aofa_token', data.session.access_token);
      this.adminAuthed = true;
      return { ok: true };
    },
    async logout() {
      const { $supabase } = useNuxtApp() as any;
      try { await $supabase?.auth.signOut(); } catch { /* ignore */ }
      localStorage.removeItem('aofa_token');
      this.adminAuthed = false;
    },
  },
});
