import { Module } from '@nestjs/common';
import { LoadService } from './load.service';
import { LoadPackageService } from './load-package.service';
import { LoadController } from './load.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  providers: [LoadService, LoadPackageService],
  controllers: [LoadController],
  exports: [LoadService, LoadPackageService],
})
export class LoadModule {}
