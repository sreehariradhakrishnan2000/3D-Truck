import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cargoflow-api',
      uptimeSec: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  async ready() {
    try {
      // Verify database connection responsiveness
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        message: error.message || 'Database unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }
}


