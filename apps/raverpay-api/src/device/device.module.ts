import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IpGeolocationService } from '../common/services/ip-geolocation.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceController],
  providers: [DeviceService, IpGeolocationService],
  exports: [DeviceService, IpGeolocationService],
})
export class DeviceModule {}
