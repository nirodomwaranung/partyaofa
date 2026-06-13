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
export interface MusicState { playing: boolean; volume: number; trackId: string | null; youtubeUrl: string | null; }

export const useGameStore = defineStore('game', {
  state: () => ({
    connected: false,
    session: null as Session | null,
    players: [] as Player[],
    games: [] as Game[],
    rewards: [] as Reward[],
    teams: {} as Record<string, string>,
    mine: { active: false, victimId: null as string | null, turn: 0, revealed: {} as Record<number, 'safe' | 'bomb'>, loserId: null as string | null },
    picks: {} as Record<string, number>,
    times: {} as Record<string, number>,
    adminAuthed: false,
    lastEvent: null as GameEvent | null,
    music: { playing: false, volume: 0.4, trackId: null, youtubeUrl: null } as MusicState,
    // set by a game when its animation finishes revealing a WIN → drives the
    // screen-wide Celebration (so it never spoils the result before the reveal)
    celebration: null as { label: string; sub: string; key: number } | null,
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
        if (s.music) this.music = s.music;
        if (s.teams) this.teams = s.teams;
        if (s.mine) this.mine = s.mine;
        if (s.picks) this.picks = s.picks;
        if (s.times) this.times = s.times;
      });
      $socket.on('game:event', (e: GameEvent) => (this.lastEvent = e));

      // restore admin session from stored JWT
      if (localStorage.getItem('aofa_token')) this.adminAuthed = true;
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
    /**
     * A player adds/removes themselves from the current round — PUBLIC (no admin
     * auth needed). Drives the "ร่วมเล่น" panel on the TV. Optimistic + broadcast.
     */
    joinRound(playerId: string, join?: boolean) {
      const has = this.roundIds.includes(playerId);
      const shouldJoin = join ?? !has;
      if (shouldJoin === has) return;
      if (this.session) {
        const ids = shouldJoin ? [...this.roundIds, playerId] : this.roundIds.filter((x) => x !== playerId);
        this.session.roundIds = ids;
        const w = { ...this.session.weights };
        if (shouldJoin && !w[playerId]) w[playerId] = 50;
        this.session.weights = w;
        if (!ids.includes(this.session.spotlightId ?? '')) this.session.spotlightId = ids[0] ?? null;
      }
      this.socket()?.emit('player:joinRound', { playerId, join: shouldJoin });
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
      this.teams = {}; this.picks = {}; this.times = {}; // fresh per game
      this.socket()?.emit('admin:startGame', { gameKey });
    },
    /** Assign a player to a team (boxing/tiger-dragon) — public, optimistic + broadcast. */
    setTeam(playerId: string, side: string) {
      this.teams = { ...this.teams, [playerId]: side };
      this.socket()?.emit('player:setTeam', { playerId, side });
    },
    /** Reveal a minefield tile — public; the server decides safe/bomb and echoes the board. */
    revealMine(index: number) {
      this.socket()?.emit('mine:reveal', { index });
    },
    /** Set a player's number (เลขนี้พี่ขอ) — public, optimistic + broadcast. */
    setPick(playerId: string, value: number) {
      this.picks = { ...this.picks, [playerId]: Math.max(1, Math.min(100, Math.round(value))) };
      this.socket()?.emit('number:setPick', { playerId, value });
    },
    /** Set/clear a player's time in ms (ยกเดียวโลกจำ) — public, optimistic + broadcast. */
    setTime(playerId: string, ms: number | null) {
      const next = { ...this.times };
      if (ms == null || ms < 0) delete next[playerId]; else next[playerId] = ms;
      this.times = next;
      this.socket()?.emit('yk1:setTime', { playerId, ms });
    },
    clearTimes() {
      this.times = {};
      this.socket()?.emit('yk1:clearTimes');
    },
    resetGame(gameKey?: string) { this.socket()?.emit('admin:resetGame', { gameKey }); },

    /** A game calls this when its reveal animation finishes on a win. */
    celebrate(label: string, sub = '') {
      this.celebration = { label, sub, key: Date.now() + Math.random() };
    },

    /** Background music control (admin only). Optimistic + broadcast. */
    setMusic(patch: Partial<MusicState>) {
      this.music = { ...this.music, ...patch };
      this.socket()?.emit('admin:music', patch);
    },

    /** Ask server to decide the outcome; resolves with the result payload. */
    resolveGame(gameKey: string, inputs: Record<string, any> = {}): Promise<any> {
      return new Promise((resolve) => {
        const s = this.socket();
        if (!s) return resolve(null);
        s.emit('admin:resolveGame', { gameKey, inputs }, (ack: any) => resolve(ack));
      });
    },

    /** Game Master sign-in with the shared admin password → JWT. */
    async login(password: string): Promise<{ ok: boolean; error?: string }> {
      try {
        const api = useApi();
        const res = await api.post<{ token: string }>('/auth/login', { password });
        localStorage.setItem('aofa_token', res.token);
        this.adminAuthed = true;
        // authenticate the live socket so admin:* events are honored + full state arrives
        this.socket()?.emit('admin:auth', { token: res.token });
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.data?.message || 'รหัสผ่านไม่ถูกต้อง' };
      }
    },
    logout() {
      localStorage.removeItem('aofa_token');
      this.adminAuthed = false;
      this.socket()?.emit('admin:deauth');
    },
  },
});
