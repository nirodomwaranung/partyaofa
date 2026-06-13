import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { SessionModule } from '../session/session.module';
import { GameEngineModule } from '../game-engine/game-engine.module';

@Module({
  imports: [
    SessionModule,
    GameEngineModule,
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'change-me-in-production' }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
