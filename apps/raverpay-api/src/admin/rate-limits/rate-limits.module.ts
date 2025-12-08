import { Module } from '@nestjs/common';
import { RateLimitsController } from './rate-limits.controller';
import { RateLimitsService } from './rate-limits.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RateLimitsController],
  providers: [RateLimitsService],
})
export class RateLimitsModule {}
