import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.game.findMany({ orderBy: { order: 'asc' } });
  }

  findOne(key: string) {
    return this.prisma.game.findUnique({ where: { key } });
  }

  /** Patch admin-editable fields (name/type/cover/prizes/penalty/side images). */
  async update(key: string, patch: any) {
    const allowed = ['name', 'type', 'icon', 'cover', 'p1', 'p2', 'p3', 'loserDrink', 'tigerImg', 'dragonImg'];
    const data: any = {};
    for (const k of allowed) if (k in patch) data[k] = patch[k];
    // upload any image fields to local storage
    if (data.cover !== undefined) data.cover = await this.storage.maybeUpload(data.cover, `games/${key}`);
    if (data.tigerImg !== undefined) data.tigerImg = await this.storage.maybeUpload(data.tigerImg, `games/${key}`);
    if (data.dragonImg !== undefined) data.dragonImg = await this.storage.maybeUpload(data.dragonImg, `games/${key}`);
    return this.prisma.game.update({ where: { key }, data });
  }
}
