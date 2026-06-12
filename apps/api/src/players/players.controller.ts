import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('players')
export class PlayersController {
  constructor(
    private readonly players: PlayersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get()
  findAll() {
    return this.players.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any) {
    const p = await this.players.create(body);
    await this.realtime.broadcastState();
    return p;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const p = await this.players.update(id, body);
    await this.realtime.broadcastState();
    return p;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const r = await this.players.remove(id);
    await this.realtime.broadcastState();
    return r;
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-stats')
  async resetStats() {
    const r = await this.players.resetStats();
    await this.realtime.broadcastState();
    return r;
  }
}
