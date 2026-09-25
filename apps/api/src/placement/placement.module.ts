import { Module } from '@nestjs/common';
import { PlacementService } from './placement.service';
import { PlacementController } from './placement.controller';
import { LoadModule } from '../load/load.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [LoadModule, WebsocketModule],
  providers: [PlacementService],
  controllers: [PlacementController],
  exports: [PlacementService],
})
export class PlacementModule {}

