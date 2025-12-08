import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminVirtualAccountsService {
  constructor(private prisma: PrismaService) {}

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
}
