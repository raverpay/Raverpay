import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationLogService } from './notification-log.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationLogService,
    NotificationDispatcherService,
    EmailService,
    SmsService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationLogService,
    NotificationDispatcherService,
  ],
})
export class NotificationsModule {}
