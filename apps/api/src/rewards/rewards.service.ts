import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.reward.findMany({ orderBy: { order: 'asc' } });
  }

  async create(data: { icon?: string; label?: string; img?: string }) {
    const count = await this.prisma.reward.count();
    return this.prisma.reward.create({
      data: { icon: data.icon ?? 'gift', label: data.label ?? 'รางวัลใหม่', img: data.img, order: count },
    });
  }

  update(id: string, patch: { icon?: string; label?: string; img?: string }) {
    return this.prisma.reward.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    await this.prisma.reward.delete({ where: { id } });
    return { ok: true };
  }
}
