import { Module } from '@nestjs/common';
import { LoadValidationController } from './load-validation.controller';
import { LoadValidationService } from './load-validation.service';

@Module({
  providers: [LoadValidationService],
  controllers: [LoadValidationController],
})
export class LoadValidationModule {}

