import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaystackService } from '../../payments/paystack.service';
import { BVNEncryptionService } from '../../utils/bvn-encryption.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';

@Injectable()
export class AdminVirtualAccountsService {
  private readonly logger = new Logger(AdminVirtualAccountsService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private bvnEncryptionService: BVNEncryptionService,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Get all virtual accounts
   */
  async getVirtualAccounts(
    page: number = 1,
    limit: number = 20,
    search?: string,
    provider?: string,
    isActive?: boolean,
    userId?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (provider) where.provider = provider;
    if (isActive !== undefined) where.isActive = isActive;
    if (userId) where.userId = userId;

    // Search by account number, bank name, or user details
    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [accounts, total] = await Promise.all([
      this.prisma.virtualAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.virtualAccount.count({ where }),
    ]);

    return {
      data: accounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get virtual account statistics
   */
  async getStats() {
    const [total, byProvider, active, inactive] = await Promise.all([
      this.prisma.virtualAccount.count(),

      this.prisma.virtualAccount.groupBy({
        by: ['provider'],
        _count: true,
      }),

      this.prisma.virtualAccount.count({ where: { isActive: true } }),

      this.prisma.virtualAccount.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
      byProvider: byProvider.reduce(
        (acc, item) => {
          acc[item.provider] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Get users without virtual accounts
   */
  async getUnassignedUsers() {
    const usersWithoutVA = await this.prisma.user.findMany({
      where: {
        virtualAccounts: {
          none: {},
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return usersWithoutVA;
  }

  /**
   * Get virtual account by user ID
   */
  async getByUserId(userId: string) {
    const accounts = await this.prisma.virtualAccount.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (accounts.length === 0) {
      throw new NotFoundException('No virtual accounts found for this user');
    }

    return accounts;
  }

  /**
   * Deactivate virtual account
   */
  async deactivate(adminUserId: string, accountId: string, reason: string) {
    const account = await this.prisma.virtualAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Virtual account not found');
    }

    const updatedAccount = await this.prisma.virtualAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'DEACTIVATE_VIRTUAL_ACCOUNT',
        resource: 'VirtualAccount',
        resourceId: accountId,
        metadata: {
          accountNumber: account.accountNumber,
          reason,
        },
      },
    });

    return updatedAccount;
  }

  /**
   * Reactivate virtual account
   */
  async reactivate(adminUserId: string, accountId: string) {
    const account = await this.prisma.virtualAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Virtual account not found');
    }

    const updatedAccount = await this.prisma.virtualAccount.update({
      where: { id: accountId },
      data: { isActive: true },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REACTIVATE_VIRTUAL_ACCOUNT',
        resource: 'VirtualAccount',
        resourceId: accountId,
        metadata: {
          accountNumber: account.accountNumber,
        },
      },
    });

    return updatedAccount;
  }

  /**
   * Get users with failed DVA creation
   * Users who have paystackCustomerCode and BVN but no active virtual account
   */
  async getFailedDVACreations(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      paystackCustomerCode: { not: null },
      bvn: { not: null },
      virtualAccounts: {
        none: {
          isActive: true,
          creationStatus: 'ACTIVE',
        },
      },
      status: 'ACTIVE',
    };

    // Search by email, name, or phone
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          paystackCustomerCode: true,
          bvn: true,
          bvnVerified: true,
          createdAt: true,
          updatedAt: true,
          virtualAccounts: {
            where: { isActive: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              creationStatus: true,
              retryCount: true,
              lastRetryAt: true,
              failureReason: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => {
        const lastAccount = user.virtualAccounts[0];
        return {
          ...user,
          bvn: user.bvn
            ? '***' +
              this.bvnEncryptionService.maskForLogging(user.bvn).slice(-4)
            : null,
          lastFailure: lastAccount
            ? {
                id: lastAccount.id,
                failureReason: lastAccount.failureReason || null,
                retryCount: lastAccount.retryCount || 0,
                lastRetryAt: lastAccount.lastRetryAt || null,
                createdAt: lastAccount.createdAt,
              }
            : null,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manually create DVA for a user
   * Requires user to have paystackCustomerCode and BVN
   */
  async createDVAForUser(
    adminUserId: string,
    userId: string,
    preferredBank: string = 'wema-bank',
  ) {
    // Get user with all necessary data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        virtualAccounts: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active DVA
    if (user.virtualAccounts.length > 0) {
      throw new BadRequestException(
        'User already has an active virtual account',
      );
    }

    // Validate prerequisites
    if (!user.paystackCustomerCode) {
      throw new BadRequestException(
        'User does not have a Paystack customer code. Please create customer first.',
      );
    }

    if (!user.bvn) {
      throw new BadRequestException(
        'User does not have a BVN. BVN is required for DVA creation.',
      );
    }

    if (!user.phone) {
      throw new BadRequestException(
        'User does not have a phone number. Phone number is required for DVA creation.',
      );
    }

    try {
      // Ensure customer has phone number updated
      try {
        await this.paystackService.updateCustomer(user.paystackCustomerCode, {
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
        });
        this.logger.log(
          `Updated Paystack customer ${user.paystackCustomerCode} with phone number`,
        );
      } catch (updateError) {
        this.logger.warn(
          `Failed to update customer ${user.paystackCustomerCode} phone number`,
          updateError,
        );
      }

      // Decrypt BVN for Paystack API
      let plainBvn: string;
      try {
        plainBvn = this.bvnEncryptionService.decrypt(user.bvn);
      } catch (error) {
        throw new BadRequestException(
          'Failed to decrypt BVN. Please ensure BVN is properly encrypted.',
        );
      }

      // Create DVA
      const virtualAccount =
        await this.paystackService.createDedicatedVirtualAccount(
          user.paystackCustomerCode,
          preferredBank,
        );

      // Save to database
      const savedAccount = await this.prisma.virtualAccount.create({
        data: {
          userId: user.id,
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
          bankCode: virtualAccount.bank.slug,
          provider: 'paystack',
          providerRef: virtualAccount.id.toString(),
          isActive: virtualAccount.active,
          creationStatus: 'ACTIVE',
          retryCount: 0,
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'CREATE_VIRTUAL_ACCOUNT_MANUAL',
          resource: 'VirtualAccount',
          resourceId: savedAccount.id,
          metadata: {
            accountNumber: virtualAccount.account_number,
            bankName: virtualAccount.bank.name,
            preferredBank,
          },
        },
      });

      // Send notification to user
      await this.notificationDispatcher.sendNotification({
        userId: user.id,
        eventType: 'VIRTUAL_ACCOUNT_CREATED',
        category: 'ACCOUNT',
        title: 'Virtual Account Created',
        message: `Your virtual account has been created successfully. Account Number: ${virtualAccount.account_number}`,
        channels: ['EMAIL', 'IN_APP', 'PUSH'],
        data: {
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
        },
      });

      this.logger.log(
        `✅ Admin ${adminUserId} manually created DVA for user ${userId}: ${virtualAccount.account_number}`,
      );

      return savedAccount;
    } catch (error: any) {
      this.logger.error(
        `Failed to manually create DVA for user ${userId}`,
        error,
      );

      const errorMessage =
        error?.response?.message ||
        error?.message ||
        'Failed to create virtual account';

      throw new BadRequestException(
        `Failed to create virtual account: ${errorMessage}`,
      );
    }
  }

  /**
   * Get DVA creation status for a user
   */
  async getDVACreationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        virtualAccounts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const latestAccount = user.virtualAccounts[0];

    return {
      hasCustomerCode: !!user.paystackCustomerCode,
      hasBVN: !!user.bvn,
      hasPhone: !!user.phone,
      customerCode: user.paystackCustomerCode,
      latestAccount: latestAccount
        ? {
            id: latestAccount.id,
            status: latestAccount.creationStatus || 'UNKNOWN',
            retryCount: latestAccount.retryCount || 0,
            failureReason: latestAccount.failureReason || null,
            lastRetryAt: latestAccount.lastRetryAt || null,
            createdAt: latestAccount.createdAt,
          }
        : null,
    };
  }
}
