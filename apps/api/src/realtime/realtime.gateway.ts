import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService, LockState } from '../session/session.service';
import { GameEngineService } from '../game-engine/game-engine.service';
import { ResultMode } from '@prisma/client';

/**
 * Realtime sync hub (Spec §6). Server is the source of truth:
 *  - admin:* events mutate session state, then we broadcast state:sync
 *  - admin:resolveGame asks the engine to decide an outcome, then we
 *    broadcast game:event so every TV animates toward the same result.
 */
@WebSocketGateway({ cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',') } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly engine: GameEngineService,
  ) {}

  async handleConnection(client: Socket) {
    client.emit('state:sync', await this.fullState());
  }

  /** Snapshot every client needs to render TV + admin. */
  private async fullState() {
    const [session, players, games, rewards] = await Promise.all([
      this.session.get(),
      this.prisma.player.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.game.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.reward.findMany({ orderBy: { order: 'asc' } }),
    ]);
    return { session, players, games, rewards };
  }

  /** Called by REST controllers after any mutation. */
  async broadcastState() {
    if (this.server) this.server.emit('state:sync', await this.fullState());
  }

  // ---------- Admin → Server ----------
  @SubscribeMessage('admin:setMode')
  async setMode(@MessageBody() { mode }: { mode: ResultMode }) {
    await this.session.setMode(mode);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setLock')
  async setLock(@MessageBody() { gameKey, value }: { gameKey: keyof LockState; value: any }) {
    await this.session.setLock(gameKey, value);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setRound')
  async setRound(@MessageBody() { playerIds }: { playerIds: string[] }) {
    await this.session.setRound(playerIds);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setSpotlight')
  async setSpotlight(@MessageBody() { playerId }: { playerId: string }) {
    await this.session.setSpotlight(playerId);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setWeight')
  async setWeight(@MessageBody() { playerId, value }: { playerId: string; value: number }) {
    await this.session.setWeight(playerId, value);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:setEventName')
  async setEventName(@MessageBody() { name }: { name: string }) {
    await this.session.setEventName(name);
    await this.broadcastState();
  }

  @SubscribeMessage('admin:startGame')
  async startGame(@MessageBody() { gameKey }: { gameKey: string }) {
    await this.session.setActiveGame(gameKey);
    await this.broadcastState();
    this.server.emit('game:event', { gameKey, type: 'start', payload: {} });
  }

  @SubscribeMessage('admin:resetGame')
  async resetGame(@MessageBody() { gameKey }: { gameKey?: string } = {}) {
    this.server.emit('game:event', { gameKey: gameKey ?? null, type: 'reset', payload: {} });
  }

  /**
   * The key flow: server decides the outcome, then broadcasts it so every
   * screen animates to the same predetermined result.
   */
  @SubscribeMessage('admin:resolveGame')
  async resolveGame(@MessageBody() { gameKey, inputs }: { gameKey: string; inputs?: Record<string, any> }) {
    const result = await this.engine.resolve(gameKey, inputs ?? {});
    this.server.emit('game:event', { gameKey, type: 'result', payload: result });
    await this.broadcastState(); // stats changed
    return result;
  }
}
