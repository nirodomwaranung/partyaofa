import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { GamesModule } from './games/games.module';
import { RewardsModule } from './rewards/rewards.module';
import { SessionModule } from './session/session.module';
import { GameEngineModule } from './game-engine/game-engine.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    PlayersModule,
    GamesModule,
    RewardsModule,
    SessionModule,
    GameEngineModule,
    RealtimeModule,
  ],
})
export class AppModule {}
