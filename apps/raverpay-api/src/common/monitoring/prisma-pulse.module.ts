import { Module } from '@nestjs/common';
import { PrismaPulseService } from './prisma-pulse.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LogtailModule } from '../logging/logtail.module';

/**
 * Prisma Pulse Module
 *
 * Provides database change monitoring via Prisma Pulse.
 * Requires Prisma Accelerate or Pulse subscription.
 */
@Module({
  imports: [PrismaModule, LogtailModule],
  providers: [PrismaPulseService],
  exports: [PrismaPulseService],
})
export class PrismaPulseModule {}
