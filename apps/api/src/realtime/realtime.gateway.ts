import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService, LockState } from '../session/session.service';
import { GameEngineService } from '../game-engine/game-engine.service';
import { ResultMode } from '@prisma/client';

/**
 * Realtime sync hub (Spec §6). Server is the source of truth.
 *
 * Security:
 *  - admin:* events are only honored from sockets authenticated with the
 *    Game Master JWT (verified at connect via handshake.auth.token, or via the
 *    admin:auth event after login).
 *  - lock values + weights (the predetermined outcomes) are stripped from the
 *    state:sync sent to viewers — only admin sockets receive them.
 */
@WebSocketGateway({ cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',') } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly engine: GameEngineService,
    private readonly jwt: JwtService,
  ) {}

  // ---------- auth ----------
  private verifyAdmin(token?: string): boolean {
    if (!token) return false;
    try {
      return this.jwt.verify(token)?.role === 'admin';
    } catch {
      return false;
    }
  }
  private isAdmin(client: Socket): boolean {
    return client.data?.isAdmin === true;
  }

  async handleConnection(client: Socket) {
    const admin = this.verifyAdmin(client.handshake.auth?.token as string | undefined);
    client.data.isAdmin = admin;
    if (admin) client.join('admins');
    const all = await this.fetchAll();
    client.emit('state:sync', this.view(all, admin));
  }

  /** Client re-authenticates after logging in (socket connected before login). */
  @SubscribeMessage('admin:auth')
  async adminAuth(@ConnectedSocket() client: Socket, @MessageBody() body: { token?: string }) {
    const ok = this.verifyAdmin(body?.token);
    client.data.isAdmin = ok;
    if (ok) client.join('admins');
    else client.leave('admins');
    client.emit('state:sync', this.view(await this.fetchAll(), ok));
    return { ok };
  }

  @SubscribeMessage('admin:deauth')
  async adminDeauth(@ConnectedSocket() client: Socket) {
    client.data.isAdmin = false;
    client.leave('admins');
    client.emit('state:sync', this.view(await this.fetchAll(), false));
  }

  // ---------- background music (in-memory, broadcast to all) ----------
  private music: { playing: boolean; volume: number; trackId: string | null; youtubeUrl: string | null } = {
    playing: false,
    volume: 0.4,
    trackId: null,
    youtubeUrl: null,
  };

  // ---------- team assignments for boxing / tiger-dragon (in-memory) ----------
  // playerId -> 'blue' | 'red' | 'tiger' | 'dragon'. Cleared when a new game
  // launches. Shared so TV + remote pick the same teams.
  private teams: Record<string, string> = {};

  // ---------- minefield board (in-memory) ----------
  // The drink victim is decided at resolve time; the tile walk is cosmetic but
  // shared here so the TV and the remote reveal the same board step by step.
  private mine: {
    active: boolean; victimId: string | null; turn: number;
    revealed: Record<number, 'safe' | 'bomb'>; loserId: string | null;
  } = { active: false, victimId: null, turn: 0, revealed: {}, loserId: null };
  private resetMine() { this.mine = { active: false, victimId: null, turn: 0, revealed: {}, loserId: null }; }

  // ---------- per-player inputs, shared so the remote can fill them ----------
  private picks: Record<string, number> = {}; // เลขนี้พี่ขอ — playerId -> 1..100
  private times: Record<string, number> = {}; // ยกเดียวโลกจำ — playerId -> ms

  // ---------- state ----------
  private async fetchAll() {
    const [session, players, games, rewards] = await Promise.all([
      this.session.get(),
      this.prisma.player.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.game.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.reward.findMany({ orderBy: { order: 'asc' } }),
    ]);
    return { session, players, games, rewards, music: this.music, teams: this.teams, mine: this.mine, picks: this.picks, times: this.times };
  }

  /** Admins see everything; viewers get lock + weights stripped. */
  private view(all: Awaited<ReturnType<RealtimeGateway['fetchAll']>>, admin: boolean) {
    if (admin) return all;
    return { ...all, session: { ...all.session, lock: {}, weights: {} } };
  }

  /** Called by REST controllers after any mutation. */
  async broadcastState() {
    if (!this.server) return;
    const all = await this.fetchAll();
    this.server.to('admins').emit('state:sync', this.view(all, true));
    this.server.except('admins').emit('state:sync', this.view(all, false));
  }

  // ---------- GM config — require an authenticated admin socket ----------
  // (mode / lock / weight / event name / music = the "rigging" controls, GM-only)
  @SubscribeMessage('admin:setMode')
  async setMode(@ConnectedSocket() c: Socket, @MessageBody() { mode }: { mode: ResultMode }) {
    if (!this.isAdmin(c)) return;
    await this.session.setMode(mode);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setLock')
  async setLock(@ConnectedSocket() c: Socket, @MessageBody() { gameKey, value }: { gameKey: keyof LockState; value: any }) {
    if (!this.isAdmin(c)) return;
    await this.session.setLock(gameKey, value);
    await this.broadcastState();
  }

  // ---------- gameplay — allowed from ANY screen (TV + remote) so both stay in
  // sync. The rigging (mode/lock/weight) above stays GM-only; here we only
  // pick who plays, start, reset, and trigger the (server-decided) outcome.
  @SubscribeMessage('admin:setRound')
  async setRound(@ConnectedSocket() _c: Socket, @MessageBody() { playerIds }: { playerIds: string[] }) {
    await this.session.setRound(playerIds);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setSpotlight')
  async setSpotlight(@ConnectedSocket() _c: Socket, @MessageBody() { playerId }: { playerId: string }) {
    await this.session.setSpotlight(playerId);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setWeight')
  async setWeight(@ConnectedSocket() c: Socket, @MessageBody() { playerId, value }: { playerId: string; value: number }) {
    if (!this.isAdmin(c)) return;
    await this.session.setWeight(playerId, value);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setEventName')
  async setEventName(@ConnectedSocket() c: Socket, @MessageBody() { name }: { name: string }) {
    if (!this.isAdmin(c)) return;
    await this.session.setEventName(name);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:startGame')
  async startGame(@ConnectedSocket() _c: Socket, @MessageBody() { gameKey }: { gameKey: string }) {
    this.teams = {}; // fresh team assignment per game launch
    this.resetMine();
    this.picks = {};
    this.times = {};
    await this.session.setActiveGame(gameKey);
    await this.broadcastState();
    this.server.emit('game:event', { gameKey, type: 'start', payload: {} });
  }

  @SubscribeMessage('admin:resetGame')
  async resetGame(@ConnectedSocket() _c: Socket, @MessageBody() { gameKey }: { gameKey?: string } = {}) {
    if (gameKey === 'mine' || gameKey == null) { this.resetMine(); await this.broadcastState(); }
    this.server.emit('game:event', { gameKey: gameKey ?? null, type: 'reset', payload: {} });
  }

  /** Server decides the outcome, then broadcasts it so every screen animates the same. */
  @SubscribeMessage('admin:resolveGame')
  async resolveGame(@ConnectedSocket() _c: Socket, @MessageBody() { gameKey, inputs }: { gameKey: string; inputs?: Record<string, any> }) {
    // Team games use the shared team map as the source of truth (so it works
    // whether the TV or the remote triggers); explicit inputs.sides override.
    const merged = {
      ...(inputs ?? {}),
      sides: { ...this.teams, ...(inputs?.sides ?? {}) },
      picks: { ...this.picks, ...(inputs?.picks ?? {}) },
      times: { ...this.times, ...(inputs?.times ?? {}) },
    };
    const result = await this.engine.resolve(gameKey, merged);
    // minefield: arm a fresh shared board the TV + remote walk together
    if (gameKey === 'mine' && (result as any)?.victimId) {
      this.mine = { active: true, victimId: (result as any).victimId, turn: 0, revealed: {}, loserId: null };
    }
    this.server.emit('game:event', { gameKey, type: 'result', payload: result });
    await this.broadcastState();
    return result;
  }

  /**
   * A player adds/removes themselves from the current round — PUBLIC (no admin
   * auth) so anyone at the TV can join in. Toggles by default; `join` forces it.
   */
  @SubscribeMessage('player:joinRound')
  async joinRound(@ConnectedSocket() _c: Socket, @MessageBody() { playerId, join }: { playerId: string; join?: boolean }) {
    if (!playerId) return;
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;
    const s = await this.session.get();
    const ids = (s.roundIds as string[]).slice();
    const has = ids.includes(playerId);
    const shouldJoin = join ?? !has;
    if (shouldJoin && !has) ids.push(playerId);
    else if (!shouldJoin && has) ids.splice(ids.indexOf(playerId), 1);
    else return; // no change
    await this.session.setRound(ids);
    await this.broadcastState();
  }

  /**
   * Assign a player to a team (boxing: blue/red, tiger-dragon: tiger/dragon) —
   * PUBLIC so both the TV and the remote can set teams and stay in sync.
   */
  @SubscribeMessage('player:setTeam')
  async setTeam(@ConnectedSocket() _c: Socket, @MessageBody() { playerId, side }: { playerId: string; side: string }) {
    if (!playerId || !side) return;
    this.teams = { ...this.teams, [playerId]: side };
    await this.broadcastState();
  }

  /**
   * Reveal a minefield tile — PUBLIC so a player at the TV or the admin on the
   * remote can step the board. The drink victim was already decided at resolve;
   * here we just walk turns: the victim's tile is the bomb, everyone else safe.
   */
  @SubscribeMessage('mine:reveal')
  async mineReveal(@ConnectedSocket() _c: Socket, @MessageBody() { index }: { index: number }) {
    if (!this.mine.active || index == null || this.mine.revealed[index]) return;
    const s = await this.session.get();
    const ids = s.roundIds as string[];
    if (!ids.length) return;
    const curId = ids[this.mine.turn % ids.length];
    const revealed = { ...this.mine.revealed };
    if (curId === this.mine.victimId) {
      revealed[index] = 'bomb';
      this.mine = { ...this.mine, revealed, loserId: curId, active: false };
    } else {
      revealed[index] = 'safe';
      this.mine = { ...this.mine, revealed, turn: this.mine.turn + 1 };
    }
    await this.broadcastState();
  }

  // These can fire rapidly (slider drag / typing), so they broadcast a tiny
  // dedicated event instead of the full DB-backed state:sync — live + cheap.
  /** Set a player's number for เลขนี้พี่ขอ — PUBLIC (TV + remote). */
  @SubscribeMessage('number:setPick')
  setPick(@ConnectedSocket() _c: Socket, @MessageBody() { playerId, value }: { playerId: string; value: number }) {
    if (!playerId || typeof value !== 'number') return;
    this.picks = { ...this.picks, [playerId]: Math.max(1, Math.min(100, Math.round(value))) };
    this.server.emit('picks:sync', this.picks);
  }

  /** Set/clear a player's recorded time (ms) for ยกเดียวโลกจำ — PUBLIC (TV + remote). */
  @SubscribeMessage('yk1:setTime')
  setTime(@ConnectedSocket() _c: Socket, @MessageBody() { playerId, ms }: { playerId: string; ms: number | null }) {
    if (!playerId) return;
    const next = { ...this.times };
    if (ms == null || ms < 0) delete next[playerId];
    else next[playerId] = ms;
    this.times = next;
    this.server.emit('times:sync', this.times);
  }

  @SubscribeMessage('yk1:clearTimes')
  clearTimes() {
    this.times = {};
    this.server.emit('times:sync', this.times);
  }

  /** Background music control (play/pause, volume, track, youtube). */
  @SubscribeMessage('admin:music')
  async onMusic(@ConnectedSocket() c: Socket, @MessageBody() patch: Partial<{ playing: boolean; volume: number; trackId: string | null; youtubeUrl: string | null }>) {
    if (!this.isAdmin(c)) return;
    if (typeof patch.playing === 'boolean') this.music.playing = patch.playing;
    if (typeof patch.volume === 'number') this.music.volume = Math.max(0, Math.min(1, patch.volume));
    if ('trackId' in patch) this.music.trackId = patch.trackId ?? null;
    if ('youtubeUrl' in patch) this.music.youtubeUrl = patch.youtubeUrl ?? null;
    await this.broadcastState();
  }
}
