import { Module } from '@nestjs/common';
import { PlacementService } from './placement.service';
import { PlacementController } from './placement.controller';
import { LoadModule } from '../load/load.module';

@Module({
  imports: [LoadModule],
  providers: [PlacementService],
  controllers: [PlacementController],
  exports: [PlacementService],
})
export class PlacementModule {}

