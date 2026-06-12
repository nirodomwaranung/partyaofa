import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const NEW_PALETTE = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA', '#FF9F45', '#22D3EE', '#F368A8', '#A0E548', '#FF7A59'];
const NEW_NICKS = ['ป๊อป', 'ตาล', 'นัท', 'เบนซ์', 'อาร์ม', 'ดิว', 'แพรว', 'กัน', 'มาย', 'โอ๊ต'];

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.player.findMany({ orderBy: { createdAt: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.player.findUnique({ where: { id } });
  }

  async create(data: Partial<{ nick: string; name: string; company: string; dept: string; role: string; color: string; photo: string }>) {
    const count = await this.prisma.player.count();
    const i = count;
    return this.prisma.player.create({
      data: {
        nick: data.nick ?? `${NEW_NICKS[i % NEW_NICKS.length]}${i > 9 ? i : ''}`,
        name: data.name ?? `ผู้เล่นใหม่ #${i + 1}`,
        company: data.company ?? 'AOFA Tech',
        dept: data.dept ?? 'Guest',
        role: data.role,
        color: data.color ?? NEW_PALETTE[i % NEW_PALETTE.length],
        photo: data.photo,
        createdAt: i,
      },
    });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.player.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('ไม่พบผู้เล่น');
    return this.prisma.player.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.player.delete({ where: { id } });
    return { ok: true };
  }

  /** Reset accumulated stats for all players. */
  async resetStats() {
    await this.prisma.player.updateMany({ data: { wins: 0, drinks: 0, prize: 0, plays: 0 } });
    return this.findAll();
  }
}
