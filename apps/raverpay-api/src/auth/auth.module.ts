import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { VirtualAccountsModule } from '../virtual-accounts/virtual-accounts.module';
import { UsersModule } from '../users/users.module';
import { DeviceModule } from '../device/device.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Authentication Module
 *
 * Handles user authentication, registration, and JWT token management
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
    VirtualAccountsModule,
    UsersModule,
    DeviceModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
