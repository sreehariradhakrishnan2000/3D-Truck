import { Module } from '@nestjs/common';
import { LoadService } from './load.service';
import { LoadPackageService } from './load-package.service';
import { LoadController } from './load.controller';

@Module({
  providers: [LoadService, LoadPackageService],
  controllers: [LoadController],
  exports: [LoadService, LoadPackageService],
})
export class LoadModule {}

