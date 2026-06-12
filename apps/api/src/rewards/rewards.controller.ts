import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly rewards: RewardsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get()
  findAll() {
    return this.rewards.findAll();
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  async create(@Body() body: any) {
    const r = await this.rewards.create(body);
    await this.realtime.broadcastState();
    return r;
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const r = await this.rewards.update(id, body);
    await this.realtime.broadcastState();
    return r;
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const r = await this.rewards.remove(id);
    await this.realtime.broadcastState();
    return r;
  }
}
