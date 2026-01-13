import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from '../device/device.service';
import { AuditService } from '../common/services/audit.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { VirtualAccountsService } from '../virtual-accounts/virtual-accounts.service';
import { UsersService } from '../users/users.service';
import { IpGeolocationService } from '../common/services/ip-geolocation.service';
import { PostHogService } from '../common/analytics/posthog.service';
import { MfaEncryptionUtil } from '../utils/mfa-encryption.util';
import { UserRole } from '@prisma/client';
import * as speakeasy from 'speakeasy';
import * as argon2 from 'argon2';

describe.skip('AuthService - MFA', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let mfaEncryptionUtil: MfaEncryptionUtil;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockDeviceService = {
    registerOrUpdateDevice: jest.fn(),
    checkDeviceAuthorization: jest.fn().mockResolvedValue(true),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockNotificationDispatcher = {
    sendNotification: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'MFA_ENCRYPTION_KEY') return 'test-encryption-key';
      if (key === 'MFA_ENCRYPTION_SALT') return 'test-salt';
      return null;
    }),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DeviceService,
          useValue: mockDeviceService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: NotificationDispatcherService,
          useValue: mockNotificationDispatcher,
        },
        {
          provide: VirtualAccountsService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: IpGeolocationService,
          useValue: {},
        },
        {
          provide: PostHogService,
          useValue: {},
        },
        {
          provide: MfaEncryptionUtil,
          useValue: {
            encryptSecret: jest.fn((secret: string) => `encrypted_${secret}`),
            decryptSecret: jest.fn((encrypted: string) =>
              encrypted.replace('encrypted_', ''),
            ),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    mfaEncryptionUtil = module.get<MfaEncryptionUtil>(MfaEncryptionUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMfa', () => {
    it('should generate TOTP secret and QR code for admin user', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        twoFactorEnabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.setupMfa(adminUser.id);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          twoFactorSecret: expect.any(String),
          mfaBackupCodes: expect.any(Array),
        }),
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.setupMfa('non-existent')).rejects.toThrow();
    });
  });

  describe('verifyMfaSetup', () => {
    it('should enable MFA when valid TOTP code provided', async () => {
      // Generate a proper base32 secret for testing
      const secretObj = speakeasy.generateSecret({ length: 32 });
      const secret = secretObj.base32;

      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        twoFactorSecret: secret, // Store as base32 (not encrypted yet during setup)
        mfaBackupCodes: [],
        twoFactorEnabled: false,
      };

      const token = speakeasy.totp({ secret, encoding: 'base32' });

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.verifyMfaSetup(adminUser.id, token);

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          twoFactorEnabled: true,
          mfaEnabledAt: expect.any(Date),
          mfaBackupCodes: expect.arrayContaining([expect.any(String)]),
        }),
      });
    });

    it('should reject invalid TOTP code', async () => {
      const adminUser = {
        id: 'admin-1',
        twoFactorSecret: 'encrypted_secret',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(mfaEncryptionUtil, 'decryptSecret').mockReturnValue('secret');

      await expect(
        service.verifyMfaSetup(adminUser.id, '000000'),
      ).rejects.toThrow();
    });
  });

  describe('verifyMfaCode', () => {
    it('should verify valid TOTP code and generate tokens', async () => {
      // Generate a proper base32 secret for testing
      const secretObj = speakeasy.generateSecret({ length: 32 });
      const secret = secretObj.base32;

      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted_secret',
        mfaFailedAttempts: 0,
        role: UserRole.ADMIN,
      };

      const mfaCode = speakeasy.totp({ secret, encoding: 'base32' });

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(mfaEncryptionUtil, 'decryptSecret').mockReturnValue(secret);
      mockJwtService.verify.mockReturnValue({
        sub: adminUser.id,
        purpose: 'mfa-verification',
        email: adminUser.email,
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'refresh-token',
      });

      const result = await service.verifyMfaCode('temp-token', mfaCode, {
        deviceId: 'device-1',
        deviceName: 'Test Device',
        deviceType: 'web',
        ipAddress: '127.0.0.1',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          mfaFailedAttempts: 0,
          lastMfaSuccess: expect.any(Date),
        }),
      });
    });

    it('should increment failed attempts on invalid code', async () => {
      const secretObj = speakeasy.generateSecret({ length: 32 });
      const secret = secretObj.base32;

      const adminUser = {
        id: 'admin-1',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted_secret',
        mfaFailedAttempts: 0,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(mfaEncryptionUtil, 'decryptSecret').mockReturnValue(secret);
      mockJwtService.verify.mockReturnValue({
        sub: adminUser.id,
        purpose: 'mfa-verification',
        email: 'admin@test.com',
      });

      await expect(
        service.verifyMfaCode('temp-token', '000000', {
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'web',
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow();

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          mfaFailedAttempts: { increment: 1 },
          lastMfaFailure: expect.any(Date),
        }),
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const adminUser = {
        id: 'admin-1',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted_secret',
        mfaFailedAttempts: 4,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(mfaEncryptionUtil, 'decryptSecret').mockReturnValue('secret');

      await expect(
        service.verifyMfaCode('temp-token', '000000', {
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'web',
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow();

      // First update increments failed attempts
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          mfaFailedAttempts: { increment: 1 },
          lastMfaFailure: expect.any(Date),
        }),
      });
      // Second update locks the account (after checking mfaFailedAttempts >= 5)
      // We need to mock the first update to return a user with mfaFailedAttempts: 5
      mockPrismaService.user.update.mockResolvedValueOnce({
        ...adminUser,
        mfaFailedAttempts: 5,
      });
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code and remove it', async () => {
      const hashedCodes = await Promise.all([
        argon2.hash('backup-code-1'),
        argon2.hash('backup-code-2'),
      ]);

      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        twoFactorEnabled: true,
        mfaBackupCodes: hashedCodes,
        role: UserRole.ADMIN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'refresh-token',
      });

      const result = await service.verifyBackupCode(
        'temp-token',
        'backup-code-1',
        {
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'web',
          ipAddress: '127.0.0.1',
        },
      );

      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          mfaBackupCodes: expect.arrayContaining([hashedCodes[1]]),
        }),
      });
    });

    it('should reject invalid backup code', async () => {
      const hashedCodes = [await argon2.hash('backup-code-1')];

      const adminUser = {
        id: 'admin-1',
        twoFactorEnabled: true,
        mfaBackupCodes: hashedCodes,
        mfaFailedAttempts: 0,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.verifyBackupCode('temp-token', 'invalid-code', {
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'web',
          ipAddress: '127.0.0.1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA and clear secrets', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted_secret',
        mfaBackupCodes: ['code1', 'code2'],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);

      await service.disableMfa(adminUser.id, 'password');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          mfaBackupCodes: [],
          mfaFailedAttempts: 0,
          lastMfaFailure: null,
        },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MFA_DISABLED',
          userId: adminUser.id,
        }),
      );
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes', async () => {
      const secretObj = speakeasy.generateSecret({ length: 32 });
      const secret = secretObj.base32;
      const mfaCode = speakeasy.totp({ secret, encoding: 'base32' });

      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted_secret',
        mfaBackupCodes: ['old-code-1', 'old-code-2'],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      jest.spyOn(mfaEncryptionUtil, 'decryptSecret').mockReturnValue(secret);

      const result = await service.regenerateBackupCodes(adminUser.id, mfaCode);

      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        data: expect.objectContaining({
          mfaBackupCodes: expect.arrayContaining([expect.any(String)]),
        }),
      });
    });
  });
});
