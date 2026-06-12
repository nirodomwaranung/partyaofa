import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('games')
export class GamesController {
  constructor(
    private readonly games: GamesService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get()
  findAll() {
    return this.games.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.games.findOne(key);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':key')
  async update(@Param('key') key: string, @Body() patch: any) {
    const g = await this.games.update(key, patch);
    await this.realtime.broadcastState();
    return g;
  }
}
