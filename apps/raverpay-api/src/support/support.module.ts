import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../services/email/email.module';

// Services
import { SupportService } from './support.service';
import { HelpService } from './help.service';
import { CannedResponseService } from './canned-response.service';
import { BotService } from './bot.service';
import { SupportNotificationService } from './support-notification.service';

// Controllers
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { HelpController } from './help.controller';

// Gateway
import { SupportGateway } from './support.gateway';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => NotificationsModule),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '15m',
        },
      }),
    }),
  ],
  controllers: [SupportController, SupportAdminController, HelpController],
  providers: [
    SupportService,
    HelpService,
    CannedResponseService,
    BotService,
    SupportGateway,
    SupportNotificationService,
  ],
  exports: [
    SupportService,
    HelpService,
    BotService,
    SupportGateway,
    SupportNotificationService,
  ],
})
export class SupportModule {}
