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

      // restore admin token
      const t = localStorage.getItem('aofa_token');
      if (t) this.adminAuthed = true;
    },

    socket() {
      const { $socket } = useNuxtApp() as any;
      return $socket;
    },

    // ----- admin commands (emit to server) -----
    setMode(mode: ResultMode) { this.socket()?.emit('admin:setMode', { mode }); },
    setLock(gameKey: string, value: any) { this.socket()?.emit('admin:setLock', { gameKey, value }); },
    setRound(playerIds: string[]) { this.socket()?.emit('admin:setRound', { playerIds }); },
    toggleRound(id: string) {
      const ids = this.roundIds.includes(id) ? this.roundIds.filter((x) => x !== id) : [...this.roundIds, id];
      if (ids.length < 2) return;
      this.setRound(ids);
    },
    setSpotlight(playerId: string) { this.socket()?.emit('admin:setSpotlight', { playerId }); },
    setWeight(playerId: string, value: number) { this.socket()?.emit('admin:setWeight', { playerId, value }); },
    setEventName(name: string) { this.socket()?.emit('admin:setEventName', { name }); },
    startGame(gameKey: string) { this.socket()?.emit('admin:startGame', { gameKey }); },
    resetGame(gameKey?: string) { this.socket()?.emit('admin:resetGame', { gameKey }); },

    /** Ask server to decide the outcome; resolves with the result payload. */
    resolveGame(gameKey: string, inputs: Record<string, any> = {}): Promise<any> {
      return new Promise((resolve) => {
        const s = this.socket();
        if (!s) return resolve(null);
        s.emit('admin:resolveGame', { gameKey, inputs }, (ack: any) => resolve(ack));
      });
    },

    async login(password: string): Promise<boolean> {
      try {
        const api = useApi();
        const res = await api.post<{ token: string }>('/auth/login', { password });
        localStorage.setItem('aofa_token', res.token);
        this.adminAuthed = true;
        return true;
      } catch {
        return false;
      }
    },
    logout() {
      localStorage.removeItem('aofa_token');
      this.adminAuthed = false;
    },
  },
});
