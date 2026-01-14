import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpWhitelistGuard } from './ip-whitelist.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../services/audit.service';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types';

describe('IpWhitelistGuard', () => {
  let guard: IpWhitelistGuard;
  let prismaService: PrismaService;

  const mockPrismaService = {
    adminIpWhitelist: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(undefined),
  };

  const createMockContext = (
    user: any,
    ip: string,
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const request = {
      user,
      ip,
      headers,
      get: jest.fn((header: string) => headers[header.toLowerCase()]),
    } as unknown as AuthenticatedRequest;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpWhitelistGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    guard = module.get<IpWhitelistGuard>(IpWhitelistGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    // Reset default mock for user.findUnique
    mockPrismaService.user.findUnique.mockResolvedValue({
      ipWhitelistGracePeriodUntil: null,
    });
  });

  describe('canActivate', () => {
    it('should allow non-admin users', async () => {
      const context = createMockContext(
        { id: 'user-1', role: UserRole.USER },
        '192.168.1.1',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        mockPrismaService.adminIpWhitelist.findMany,
      ).not.toHaveBeenCalled();
    });

    it('should allow admin with whitelisted IP', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - no grace period
      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: null,
      });

      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([
        { id: '1', ipAddress: '192.168.1.1', isActive: true },
      ]);

      const context = createMockContext(adminUser, '192.168.1.1');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.adminIpWhitelist.findMany).toHaveBeenCalled();
    });

    it('should block admin with non-whitelisted IP', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - no grace period
      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: null,
      });

      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([]);

      const context = createMockContext(adminUser, '192.168.1.100');

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should support CIDR notation', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - no grace period
      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: null,
      });

      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([
        { id: '1', ipAddress: '192.168.1.0/24', isActive: true },
      ]);

      const context = createMockContext(adminUser, '192.168.1.50');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - no grace period
      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: null,
      });

      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([
        { id: '1', ipAddress: '10.0.0.1', isActive: true },
      ]);

      const context = createMockContext(adminUser, '127.0.0.1', {
        'x-forwarded-for': '10.0.0.1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should update lastUsedAt on successful match', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - no grace period
      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: null,
      });

      const whitelistEntry = {
        id: '1',
        ipAddress: '192.168.1.1',
        isActive: true,
      };

      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([
        whitelistEntry,
      ]);

      const context = createMockContext(adminUser, '192.168.1.1');

      await guard.canActivate(context);

      expect(
        mockPrismaService.adminIpWhitelist.updateMany,
      ).toHaveBeenCalledWith({
        where: { ipAddress: '192.168.1.1' },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
          usageCount: { increment: 1 },
        }),
      });
    });

    it('should allow admin with active grace period even without whitelisted IP', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - active grace period (24 hours from now)
      const gracePeriodUntil = new Date();
      gracePeriodUntil.setHours(gracePeriodUntil.getHours() + 24);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: gracePeriodUntil,
      });

      // No whitelist entries
      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([]);

      const context = createMockContext(adminUser, '192.168.1.100');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      // Should not check whitelist when grace period is active
      expect(mockPrismaService.adminIpWhitelist.findMany).not.toHaveBeenCalled();
    });

    it('should block admin with expired grace period and no whitelisted IP', async () => {
      const adminUser = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };

      // Mock grace period check - expired grace period (24 hours ago)
      const gracePeriodUntil = new Date();
      gracePeriodUntil.setHours(gracePeriodUntil.getHours() - 24);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ipWhitelistGracePeriodUntil: gracePeriodUntil,
      });

      // No whitelist entries
      mockPrismaService.adminIpWhitelist.findMany.mockResolvedValue([]);

      const context = createMockContext(adminUser, '192.168.1.100');

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.adminIpWhitelist.findMany).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });
});
