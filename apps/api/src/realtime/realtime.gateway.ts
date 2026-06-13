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

  // ---------- state ----------
  private async fetchAll() {
    const [session, players, games, rewards] = await Promise.all([
      this.session.get(),
      this.prisma.player.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.game.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.reward.findMany({ orderBy: { order: 'asc' } }),
    ]);
    return { session, players, games, rewards, music: this.music };
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

  // ---------- Admin → Server (all require an authenticated admin socket) ----------
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

  @SubscribeMessage('admin:setRound')
  async setRound(@ConnectedSocket() c: Socket, @MessageBody() { playerIds }: { playerIds: string[] }) {
    if (!this.isAdmin(c)) return;
    await this.session.setRound(playerIds);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setSpotlight')
  async setSpotlight(@ConnectedSocket() c: Socket, @MessageBody() { playerId }: { playerId: string }) {
    if (!this.isAdmin(c)) return;
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
  async startGame(@ConnectedSocket() c: Socket, @MessageBody() { gameKey }: { gameKey: string }) {
    if (!this.isAdmin(c)) return;
    await this.session.setActiveGame(gameKey);
    await this.broadcastState();
    this.server.emit('game:event', { gameKey, type: 'start', payload: {} });
  }

  @SubscribeMessage('admin:resetGame')
  async resetGame(@ConnectedSocket() c: Socket, @MessageBody() { gameKey }: { gameKey?: string } = {}) {
    if (!this.isAdmin(c)) return;
    this.server.emit('game:event', { gameKey: gameKey ?? null, type: 'reset', payload: {} });
  }

  /** Server decides the outcome, then broadcasts it so every screen animates the same. */
  @SubscribeMessage('admin:resolveGame')
  async resolveGame(@ConnectedSocket() c: Socket, @MessageBody() { gameKey, inputs }: { gameKey: string; inputs?: Record<string, any> }) {
    if (!this.isAdmin(c)) return { ok: false };
    const result = await this.engine.resolve(gameKey, inputs ?? {});
    this.server.emit('game:event', { gameKey, type: 'result', payload: result });
    await this.broadcastState();
    return result;
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
