import { Injectable } from '@nestjs/common';
import { ResultMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LockState = {
  wheel: number;
  slot: 'jackpot' | 'cash' | 'drink' | 'none';
  race: string;
  card: string;
  bomb: string;
  number: number;
  boxing: 'blue' | 'red';
  td: 'tiger' | 'dragon';
  mine: string;
};

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Always returns the singleton "live" session, creating it if missing. */
  async get() {
    let s = await this.prisma.session.findUnique({ where: { id: 'live' } });
    if (!s) {
      s = await this.prisma.session.create({ data: { id: 'live' } });
    }
    return s;
  }

  async setMode(mode: ResultMode) {
    return this.prisma.session.update({ where: { id: 'live' }, data: { resultMode: mode } });
  }

  async setEventName(eventName: string) {
    return this.prisma.session.update({ where: { id: 'live' }, data: { eventName } });
  }

  async setRound(roundIds: string[]) {
    const s = await this.get();
    const weights = { ...(s.weights as Record<string, number>) };
    roundIds.forEach((id) => { if (!weights[id]) weights[id] = 50; });
    const spotlightId = roundIds.includes(s.spotlightId ?? '') ? s.spotlightId : roundIds[0] ?? null;
    return this.prisma.session.update({
      where: { id: 'live' },
      data: { roundIds, weights, spotlightId },
    });
  }

  async setSpotlight(playerId: string) {
    return this.prisma.session.update({ where: { id: 'live' }, data: { spotlightId: playerId } });
  }

  async setWeight(playerId: string, value: number) {
    const s = await this.get();
    const weights = { ...(s.weights as Record<string, number>), [playerId]: value };
    return this.prisma.session.update({ where: { id: 'live' }, data: { weights } });
  }

  async setLock(gameKey: keyof LockState, value: any) {
    const s = await this.get();
    const lock = { ...(s.lock as Partial<LockState>), [gameKey]: value };
    return this.prisma.session.update({ where: { id: 'live' }, data: { lock } });
  }

  async setActiveGame(gameKey: string | null) {
    return this.prisma.session.update({ where: { id: 'live' }, data: { activeGameKey: gameKey } });
  }
}
