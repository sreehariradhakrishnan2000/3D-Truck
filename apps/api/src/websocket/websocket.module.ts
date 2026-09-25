import { Module } from '@nestjs/common';
import { LoadGateway } from './load.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [LoadGateway],
  exports: [LoadGateway],
})
export class WebsocketModule {}

