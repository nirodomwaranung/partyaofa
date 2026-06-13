import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { CARD, CARD_LOCK_MAP, SLOT_POOL, Kind, WHEEL_PALETTE, rewardKind, rewardAmount } from './constants';

type Player = { id: string; nick: string };
type Session = Awaited<ReturnType<SessionService['get']>>;

/**
 * Server-authoritative result resolution (Spec §5–6).
 * The engine DECIDES the winner/loser first (random | weight | lock),
 * applies stats + writes history, and returns a result the TV animates toward.
 */
@Injectable()
export class GameEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
  ) {}

  private rand(n: number) {
    return Math.floor(Math.random() * n);
  }

  private async roundPlayers(s: Session): Promise<Player[]> {
    const players = await this.prisma.player.findMany({ where: { id: { in: s.roundIds } } });
    // preserve round order
    return s.roundIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  }

  private async game(key: string) {
    const g = await this.prisma.game.findUnique({ where: { key } });
    if (!g) throw new BadRequestException(`ไม่พบเกม ${key}`);
    return g;
  }

  private async addStats(id: string | undefined, delta: Partial<{ wins: number; drinks: number; prize: number; plays: number }>) {
    if (!id) return;
    await this.prisma.player.update({
      where: { id },
      data: {
        wins: { increment: delta.wins ?? 0 },
        drinks: { increment: delta.drinks ?? 0 },
        prize: { increment: delta.prize ?? 0 },
        plays: { increment: delta.plays ?? 0 },
      },
    });
  }

  private async history(gameKey: string, rows: Array<{ playerId?: string; outcome: string; rank?: number; amount?: number; drink?: boolean; payload?: any }>) {
    if (!rows.length) return;
    await this.prisma.roundResult.createMany({
      data: rows.map((r) => ({
        gameKey,
        playerId: r.playerId ?? null,
        outcome: r.outcome,
        rank: r.rank ?? null,
        amount: r.amount ?? 0,
        drink: r.drink ?? false,
        payload: r.payload ?? {},
      })),
    });
  }

  // ---- public entry: resolve one game outcome ----
  async resolve(gameKey: string, inputs: Record<string, any> = {}) {
    const s = await this.session.get();
    switch (gameKey) {
      case 'wheel': return this.resolveWheel(s);
      case 'slot': return this.resolveSlot(s);
      case 'horse':
      case 'race': return this.resolveRace(s, gameKey);
      case 'number': return this.resolveNumber(s, inputs.picks ?? {});
      case 'bomb': return this.resolveBomb(s);
      case 'card':
      case 'box': return this.resolveCard(s, gameKey, inputs.index ?? 0);
      case 'boxing': return this.resolveTeam(s, 'boxing', inputs.sides ?? {});
      case 'td': return this.resolveTeam(s, 'td', inputs.sides ?? {});
      case 'mine': return this.resolveMine(s);
      case 'yk1': return this.resolveStopwatch(s, inputs.times ?? {});
      default: throw new BadRequestException(`เกม ${gameKey} ยังไม่รองรับการตัดสินผลที่ server`);
    }
  }

  // ---- WHEEL ----
  private async resolveWheel(s: Session) {
    // Slices come from the admin-managed reward list ("รางวัลในกล่อง").
    const rewards = await this.prisma.reward.findMany({ orderBy: { order: 'asc' } });
    if (!rewards.length) throw new BadRequestException('ยังไม่มีรางวัลในกล่อง — เพิ่มรางวัลก่อนหมุนวงล้อ');

    let idx: number;
    if (s.resultMode === 'lock') idx = Math.min(rewards.length - 1, Math.max(0, (s.lock as any).wheel ?? 0));
    else if (s.resultMode === 'weight') {
      const w = rewards.map((r) => {
        const k = rewardKind(r);
        return k === 'jackpot' ? 1 : k === 'drink' ? 3 : k === 'safe' ? 3 : 5;
      });
      idx = this.weightedPick(w);
    } else idx = this.rand(rewards.length);

    const reward = rewards[idx];
    const kind = rewardKind(reward);
    const amount = rewardAmount(reward, kind);
    const color = WHEEL_PALETTE[idx % WHEEL_PALETTE.length];

    const id = s.spotlightId ?? undefined;
    await this.applyPrizeToSolo(id, kind, amount);
    await this.history('wheel', [{ playerId: id, outcome: kind, amount, drink: kind === 'drink' }]);
    return {
      gameKey: 'wheel',
      index: idx,
      count: rewards.length,
      prize: { label: reward.label, icon: reward.icon, img: reward.img, color, kind, amount },
    };
  }

  // ---- SLOT ----
  private async resolveSlot(s: Session) {
    let final: string[];
    if (s.resultMode === 'lock') {
      const l = (s.lock as any).slot;
      final = l === 'cash' ? ['coins', 'coins', 'coins']
        : l === 'drink' ? ['beer', 'beer', 'beer']
        : l === 'jackpot' ? ['sparkles', 'sparkles', 'sparkles']
        : ['coins', 'beer', 'sparkles'];
    } else if (s.resultMode === 'weight' && Math.random() < 0.4) {
      const m = ['coins', 'beer', 'sparkles'][this.rand(3)];
      final = [m, m, m];
    } else {
      final = [0, 1, 2].map(() => SLOT_POOL[this.rand(6)]);
    }

    const win = final[0] === final[1] && final[1] === final[2];
    let res: { label: string; kind: Kind; color: string };
    if (win && final[0] === 'sparkles') res = { label: 'JACKPOT!', kind: 'jackpot', color: '#C780FA' };
    else if (win && final[0] === 'coins') res = { label: 'ได้เงินสด!', kind: 'cash', color: '#34D399' };
    else if (win && final[0] === 'beer') res = { label: 'ยกเหล้า!', kind: 'drink', color: '#FF6B6B' };
    else if (win) res = { label: 'ตรงกัน! รับรางวัล', kind: 'cash', color: '#4D96FF' };
    else res = { label: 'ไม่ตรง ลองใหม่', kind: 'none', color: '#9a86bd' };

    const id = s.spotlightId ?? undefined;
    const amount = res.kind === 'jackpot' ? 5000 : res.kind === 'cash' ? 500 : 0;
    await this.applyPrizeToSolo(id, res.kind, amount);
    await this.history('slot', [{ playerId: id, outcome: res.kind, amount, drink: res.kind === 'drink' }]);
    return { gameKey: 'slot', syms: final, result: res };
  }

  // ---- RACE / HORSE ----
  private async resolveRace(s: Session, gameKey: string) {
    const round = await this.roundPlayers(s);
    if (round.length < 2) throw new BadRequestException('ต้องมีผู้เล่นในรอบอย่างน้อย 2 คน');
    const winId = this.pickWeightedPlayer(s, round, (s.lock as any).race);

    // produce a full ranking with winner first
    const rest = round.filter((p) => p.id !== winId).sort(() => Math.random() - 0.5);
    const ranks = [winId, ...rest.map((p) => p.id)];

    const g = await this.game(gameKey);
    for (let i = 0; i < ranks.length; i++) {
      const pid = ranks[i];
      if (i === 0) await this.addStats(pid, { wins: 1, prize: g.p1, plays: 1 });
      else if (i === 1) await this.addStats(pid, { prize: g.p2, plays: 1 });
      else if (i === 2) await this.addStats(pid, { prize: g.p3, plays: 1 });
      else if (i === ranks.length - 1 && g.loserDrink) await this.addStats(pid, { drinks: 1, plays: 1 });
      else await this.addStats(pid, { plays: 1 });
    }
    await this.history(gameKey, ranks.map((pid, i) => ({
      playerId: pid, outcome: i === 0 ? 'win' : i === ranks.length - 1 && g.loserDrink ? 'drink' : 'rank',
      rank: i + 1, amount: i === 0 ? g.p1 : i === 1 ? g.p2 : i === 2 ? g.p3 : 0,
      drink: i === ranks.length - 1 && g.loserDrink,
    })));
    return { gameKey, winnerId: winId, ranks };
  }

  // ---- NUMBER ----
  private async resolveNumber(s: Session, picks: Record<string, number>) {
    const round = await this.roundPlayers(s);
    if (round.length < 1) throw new BadRequestException('ไม่มีผู้เล่นในรอบ');
    const center = s.resultMode === 'lock' ? ((s.lock as any).number ?? 50) : 1 + this.rand(100);
    const ranked = round
      .map((p) => {
        const pick = picks[p.id] != null ? picks[p.id] : 50;
        return { id: p.id, nick: p.nick, pick, dist: Math.abs(center - pick) };
      })
      .sort((a, b) => a.dist - b.dist);

    const g = await this.game('number');
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      if (i === 0) await this.addStats(r.id, { wins: 1, prize: g.p1, plays: 1 });
      else if (i === 1) await this.addStats(r.id, { prize: g.p2, plays: 1 });
      else if (i === 2) await this.addStats(r.id, { prize: g.p3, plays: 1 });
      else if (i === ranked.length - 1 && g.loserDrink) await this.addStats(r.id, { drinks: 1, plays: 1 });
      else await this.addStats(r.id, { plays: 1 });
    }
    await this.history('number', ranked.map((r, i) => ({
      playerId: r.id, outcome: i === 0 ? 'win' : i === ranked.length - 1 && g.loserDrink ? 'drink' : 'rank',
      rank: i + 1, drink: i === ranked.length - 1 && g.loserDrink, payload: { pick: r.pick, dist: r.dist },
    })));
    return { gameKey: 'number', center, ranks: ranked };
  }

  // ---- BOMB ----
  private async resolveBomb(s: Session) {
    const round = await this.roundPlayers(s);
    if (round.length < 2) throw new BadRequestException('ต้องมีผู้เล่นอย่างน้อย 2 คน');
    let loserId: string;
    if (s.resultMode === 'lock' && round.find((p) => p.id === (s.lock as any).bomb)) loserId = (s.lock as any).bomb;
    else loserId = round[this.rand(round.length)].id;

    const g = await this.game('bomb');
    if (g.loserDrink) await this.addStats(loserId, { drinks: 1, plays: 1 });
    else await this.addStats(loserId, { plays: 1 });
    await this.history('bomb', [{ playerId: loserId, outcome: 'drink', drink: g.loserDrink }]);
    return { gameKey: 'bomb', loserId };
  }

  // ---- CARD / BOX ----
  private async resolveCard(s: Session, gameKey: string, index: number) {
    // Prizes come from the admin-managed reward list ("รางวัลในกล่อง") — same
    // source as the wheel — so "เปิดเลยอย่าคิดเยอะ" reflects the settings.
    // Falls back to the built-in CARD table only if no rewards are configured.
    const rewards = await this.prisma.reward.findMany({ orderBy: { order: 'asc' } });
    let reward: { icon: string; label: string; img?: string | null; kind: Kind; amount?: number };
    if (rewards.length) {
      let idx: number;
      if (s.resultMode === 'lock' && typeof (s.lock as any).card === 'number') {
        idx = Math.min(rewards.length - 1, Math.max(0, (s.lock as any).card));
      } else idx = this.rand(rewards.length);
      const r = rewards[idx];
      const kind = rewardKind(r);
      reward = { icon: r.icon, label: r.label, img: r.img, kind, amount: rewardAmount(r, kind) };
    } else if (s.resultMode === 'lock') {
      reward = CARD_LOCK_MAP[(s.lock as any).card] ?? CARD[this.rand(CARD.length)];
    } else reward = CARD[this.rand(CARD.length)];

    const id = s.spotlightId ?? undefined;
    await this.applyPrizeToSolo(id, reward.kind, reward.amount);
    await this.history(gameKey, [{ playerId: id, outcome: reward.kind, amount: reward.amount, drink: reward.kind === 'drink' }]);
    return { gameKey, index, reward };
  }

  // ---- TEAM (boxing / tiger-dragon) ----
  private async resolveTeam(s: Session, gameKey: 'boxing' | 'td', sides: Record<string, string>) {
    const round = await this.roundPlayers(s);
    const sideA = gameKey === 'boxing' ? 'blue' : 'tiger';
    const sideB = gameKey === 'boxing' ? 'red' : 'dragon';
    const assigned: Record<string, string> = { ...sides };
    round.forEach((p, i) => {
      if (assigned[p.id] !== sideA && assigned[p.id] !== sideB) assigned[p.id] = i % 2 ? sideB : sideA;
    });

    const lockVal = gameKey === 'boxing' ? (s.lock as any).boxing : (s.lock as any).td;
    const winner = s.resultMode === 'lock' ? lockVal : Math.random() < 0.5 ? sideA : sideB;
    const loser = winner === sideA ? sideB : sideA;

    const g = await this.game(gameKey);
    for (const p of round) {
      const sd = assigned[p.id];
      if (sd === winner) await this.addStats(p.id, { wins: 1, prize: g.p1, plays: 1 });
      else if (sd === loser && g.loserDrink) await this.addStats(p.id, { drinks: 1, plays: 1 });
      else await this.addStats(p.id, { plays: 1 });
    }
    await this.history(gameKey, round.map((p) => ({
      playerId: p.id, outcome: assigned[p.id] === winner ? 'win' : 'drink',
      drink: assigned[p.id] === loser && g.loserDrink,
    })));
    return { gameKey, winner, loser, sides: assigned };
  }

  // ---- MINE ----
  private async resolveMine(s: Session) {
    const round = await this.roundPlayers(s);
    if (round.length < 1) throw new BadRequestException('ไม่มีผู้เล่นในรอบ');
    let victim: string;
    if (s.resultMode === 'lock' && round.find((p) => p.id === (s.lock as any).mine)) victim = (s.lock as any).mine;
    else victim = round[this.rand(round.length)].id;

    const g = await this.game('mine');
    for (const p of round) {
      if (p.id === victim && g.loserDrink) await this.addStats(p.id, { drinks: 1, plays: 1 });
      else await this.addStats(p.id, { plays: 1 });
    }
    await this.history('mine', [{ playerId: victim, outcome: 'drink', drink: g.loserDrink }]);
    return { gameKey: 'mine', victimId: victim };
  }

  // ---- STOPWATCH (yk1) — admin supplies recorded times (ms) ----
  private async resolveStopwatch(s: Session, times: Record<string, number>) {
    const ids = Object.keys(times);
    if (ids.length < 2) throw new BadRequestException('ต้องบันทึกเวลาอย่างน้อย 2 คน');
    const sorted = ids.slice().sort((a, b) => times[a] - times[b]);
    const g = await this.game('yk1');
    await this.addStats(sorted[0], { wins: 1, prize: g.p1, plays: 1 });
    if (g.loserDrink) await this.addStats(sorted[sorted.length - 1], { drinks: 1, plays: 1 });
    await this.history('yk1', sorted.map((id, i) => ({
      playerId: id, outcome: i === 0 ? 'win' : i === sorted.length - 1 && g.loserDrink ? 'drink' : 'rank',
      rank: i + 1, amount: i === 0 ? g.p1 : 0, drink: i === sorted.length - 1 && g.loserDrink, payload: { ms: times[id] },
    })));
    return { gameKey: 'yk1', ranks: sorted.map((id, i) => ({ id, ms: times[id], rank: i + 1 })) };
  }

  // ---- helpers ----
  private weightedPick(weights: number[]): number {
    const tot = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  private pickWeightedPlayer(s: Session, round: Player[], lockId: string): string {
    if (s.resultMode === 'lock' && round.find((p) => p.id === lockId)) return lockId;
    if (s.resultMode === 'weight') {
      const weights = s.weights as Record<string, number>;
      const tot = round.reduce((a, p) => a + (weights[p.id] || 1), 0);
      let r = Math.random() * tot;
      for (const p of round) {
        r -= weights[p.id] || 1;
        if (r <= 0) return p.id;
      }
    }
    return round[this.rand(round.length)].id;
  }

  private async applyPrizeToSolo(id: string | undefined, kind: Kind, amount?: number) {
    if (!id) return;
    if (kind === 'cash' || kind === 'jackpot') await this.addStats(id, { prize: amount ?? 0, wins: 1, plays: 1 });
    else if (kind === 'drink') await this.addStats(id, { drinks: 1, plays: 1 });
    else await this.addStats(id, { plays: 1 });
  }
}
