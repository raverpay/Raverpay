import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import {
  AuditAction,
  AuditStatus,
  AuditSeverity,
} from '../../common/types/audit-log.types';
import {
  CreateIpWhitelistDto,
  UpdateIpWhitelistDto,
} from './dto/ip-whitelist.dto';
import { isIPv4, isIPv6 } from 'net';
import { Address4, Address6 } from 'ip-address';

@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate IP address or CIDR notation
   */
  private validateIpAddress(ipAddress: string): boolean {
    // Check if it's a valid IPv4 or IPv6 address
    if (isIPv4(ipAddress) || isIPv6(ipAddress)) {
      return true;
    }

    // Check if it's a valid CIDR notation
    if (ipAddress.includes('/')) {
      try {
        const parts = ipAddress.split('/');
        if (parts.length !== 2) {
          return false;
        }

        const ip = parts[0];
        const prefix = parseInt(parts[1], 10);

        if (isNaN(prefix)) {
          return false;
        }

        if (isIPv4(ip)) {
          // Validate CIDR format (constructor will throw if invalid)
          new Address4(ipAddress);
          return prefix >= 0 && prefix <= 32;
        }

        if (isIPv6(ip)) {
          // Validate CIDR format (constructor will throw if invalid)
          new Address6(ipAddress);
          return prefix >= 0 && prefix <= 128;
        }

        return false;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Get IP whitelist entries with pagination
   */
  async getIpWhitelist(options: {
    page: number;
    limit: number;
    isActive?: boolean;
    userId?: string;
  }) {
    const { page, limit, isActive, userId } = options;
    const skip = (page - 1) * limit;

    const where: {
      isActive?: boolean;
      userId?: string;
    } = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (userId) {
      where.userId = userId;
    }

    const [entries, total] = await Promise.all([
      this.prisma.adminIpWhitelist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          user: userId
            ? {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              }
            : undefined,
        },
      }),
      this.prisma.adminIpWhitelist.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add IP to whitelist
   */
  async addIpWhitelist(dto: CreateIpWhitelistDto, createdBy: string) {
    // Validate IP address format
    if (!this.validateIpAddress(dto.ipAddress)) {
      throw new BadRequestException(
        'Invalid IP address format. Must be a valid IPv4, IPv6, or CIDR notation (e.g., "203.0.113.45" or "203.0.113.0/24")',
      );
    }

    // Check if IP already exists
    const existing = await this.prisma.adminIpWhitelist.findUnique({
      where: { ipAddress: dto.ipAddress },
    });

    if (existing) {
      throw new ConflictException('IP address is already whitelisted');
    }

    // Create whitelist entry
    const entry = await this.prisma.adminIpWhitelist.create({
      data: {
        ipAddress: dto.ipAddress,
        description: dto.description,
        userId: dto.userId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log action
    await this.auditService.log({
      userId: createdBy,
      action: AuditAction.IP_WHITELIST_ADDED,
      resource: 'SECURITY',
      resourceId: entry.id,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: {
        ipAddress: dto.ipAddress,
        description: dto.description,
        userId: dto.userId,
      },
    });

    this.logger.log(
      `IP whitelist entry added: ${dto.ipAddress} by user ${createdBy}`,
    );

    return entry;
  }

  /**
   * Update IP whitelist entry
   */
  async updateIpWhitelist(id: string, dto: UpdateIpWhitelistDto) {
    const entry = await this.prisma.adminIpWhitelist.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('IP whitelist entry not found');
    }

    // If IP address is being updated, validate it
    if (dto.ipAddress !== undefined && dto.ipAddress !== entry.ipAddress) {
      if (!this.validateIpAddress(dto.ipAddress)) {
        throw new BadRequestException(
          'Invalid IP address format. Must be a valid IPv4, IPv6, or CIDR notation (e.g., "203.0.113.45" or "203.0.113.0/24")',
        );
      }

      // Check if the new IP address already exists (unique constraint)
      const existing = await this.prisma.adminIpWhitelist.findUnique({
        where: { ipAddress: dto.ipAddress },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'IP address is already whitelisted for another entry',
        );
      }
    }

    const updateData: {
      ipAddress?: string;
      description?: string;
      isActive?: boolean;
    } = {};

    if (dto.ipAddress !== undefined) {
      updateData.ipAddress = dto.ipAddress;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.adminIpWhitelist.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log action
    await this.auditService.log({
      userId: entry.createdBy,
      action: AuditAction.IP_WHITELIST_UPDATED,
      resource: 'SECURITY',
      resourceId: id,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: {
        oldIpAddress: entry.ipAddress,
        newIpAddress: updated.ipAddress,
        changes: dto,
      },
    });

    this.logger.log(
      `IP whitelist entry updated: ${entry.ipAddress} -> ${updated.ipAddress}`,
    );

    return updated;
  }

  /**
   * Remove IP from whitelist
   */
  async removeIpWhitelist(id: string) {
    const entry = await this.prisma.adminIpWhitelist.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('IP whitelist entry not found');
    }

    await this.prisma.adminIpWhitelist.delete({
      where: { id },
    });

    // Log action
    await this.auditService.log({
      userId: entry.createdBy,
      action: AuditAction.IP_WHITELIST_REMOVED,
      resource: 'SECURITY',
      resourceId: id,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: {
        ipAddress: entry.ipAddress,
      },
    });

    this.logger.log(`IP whitelist entry removed: ${entry.ipAddress}`);

    return {
      success: true,
      message: 'IP address removed from whitelist successfully',
    };
  }
}
