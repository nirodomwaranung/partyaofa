import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SessionModule } from '../session/session.module';
import { GameEngineModule } from '../game-engine/game-engine.module';

@Module({
  imports: [SessionModule, GameEngineModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
