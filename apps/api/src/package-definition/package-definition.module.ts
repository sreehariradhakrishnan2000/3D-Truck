import { Module } from '@nestjs/common';
import { PackageDefinitionService } from './package-definition.service';
import { PackageDefinitionController } from './package-definition.controller';

@Module({
  providers: [PackageDefinitionService],
  controllers: [PackageDefinitionController],
  exports: [PackageDefinitionService],
})
export class PackageDefinitionModule {}

