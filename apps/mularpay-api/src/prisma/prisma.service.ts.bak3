import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma query event type
 */
interface QueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

/**
 * Prisma Service
 *
 * Provides a singleton instance of PrismaClient throughout the application.
 * Handles connection lifecycle (connect on init, disconnect on destroy).
 *
 * Usage:
 *   constructor(private prisma: PrismaService) {}
 *   const users = await this.prisma.user.findMany();
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Log slow queries (> 1 second)
    this.$on('query' as never, (e: QueryEvent) => {
      if (e.duration > 1000) {
        this.logger.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
      }
    });

    // Log all errors
    this.$on('error' as never, (e: unknown) => {
      this.logger.error('Database error:', e);
    });

    // Log warnings
    this.$on('warn' as never, (e: unknown) => {
      this.logger.warn('Database warning:', e);
    });
  }

  /**
   * Connect to database when the module initializes
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database when the module is destroyed
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Clean all tables (for testing only)
   * WARNING: This deletes all data!
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    const tables = await this.$queryRawUnsafe<{ tablename: string }[]>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
          );
        } catch (error) {
          this.logger.error(`Error truncating ${tablename}:`, error);
        }
      }
    }

    this.logger.log('🧹 Database cleaned');
  }
}
