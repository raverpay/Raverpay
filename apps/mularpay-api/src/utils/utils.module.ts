import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BVNEncryptionService } from './bvn-encryption.service';

/**
 * Utils Module
 *
 * Provides utility services like BVN encryption
 * Made global so it can be imported by any module
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [BVNEncryptionService],
  exports: [BVNEncryptionService],
})
export class UtilsModule {}
