import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.game.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(key: string) {
    return this.prisma.game.findUnique({ where: { key } });
  }

  /** Patch admin-editable fields (name/type/cover/prizes/penalty/side images). */
  update(key: string, patch: any) {
    const allowed = ['name', 'type', 'icon', 'cover', 'p1', 'p2', 'p3', 'loserDrink', 'tigerImg', 'dragonImg'];
    const data: any = {};
    for (const k of allowed) if (k in patch) data[k] = patch[k];
    return this.prisma.game.update({ where: { key }, data });
  }
}
