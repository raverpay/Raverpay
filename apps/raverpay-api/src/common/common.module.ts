import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}
