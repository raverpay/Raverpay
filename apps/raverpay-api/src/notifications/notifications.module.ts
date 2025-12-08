import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationLogService } from './notification-log.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { ExpoPushService } from './expo-push.service';
import { BirthdaySchedulerService } from './birthday-scheduler.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
// import { OneSignalService } from './onesignal.service'; // Deprecated - replaced by Expo
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';

@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationLogService,
    NotificationDispatcherService,
    ExpoPushService,
    BirthdaySchedulerService,
    NotificationQueueProcessor,
    // OneSignalService, // Deprecated
    EmailService,
    SmsService,
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationLogService,
    NotificationDispatcherService,
    ExpoPushService,
    BirthdaySchedulerService,
    NotificationQueueProcessor,
  ],
})
export class NotificationsModule {}
