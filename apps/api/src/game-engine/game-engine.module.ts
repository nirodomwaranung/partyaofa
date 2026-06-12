import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  providers: [GameEngineService],
  exports: [GameEngineService],
})
export class GameEngineModule {}
