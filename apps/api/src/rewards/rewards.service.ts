import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.reward.findMany({ orderBy: { order: 'asc' } });
  }

  async create(data: { icon?: string; label?: string; img?: string }) {
    const count = await this.prisma.reward.count();
    const img = await this.storage.maybeUpload(data.img, 'rewards');
    return this.prisma.reward.create({
      data: { icon: data.icon ?? 'gift', label: data.label ?? 'รางวัลใหม่', img: img ?? undefined, order: count },
    });
  }

  async update(id: string, patch: { icon?: string; label?: string; img?: string }) {
    if (patch.img !== undefined) patch.img = (await this.storage.maybeUpload(patch.img, 'rewards')) ?? undefined;
    return this.prisma.reward.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    await this.prisma.reward.delete({ where: { id } });
    return { ok: true };
  }
}
