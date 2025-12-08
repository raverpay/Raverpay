import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Welcome to RaverPay API.';
  }

  /**
   * Health check endpoint
   * Tests database connectivity and returns system status
   */
  async getHealth() {
    const startTime = Date.now();

    try {
      // Test database connection by running a simple query
      await this.prisma.$queryRaw`SELECT 1`;

      const uptime = process.uptime();
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
        responseTime: `${responseTime}ms`,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
