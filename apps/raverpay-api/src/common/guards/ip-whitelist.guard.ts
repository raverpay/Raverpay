import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../services/audit.service';
import { isIPv4, isIPv6 } from 'net';
import { Address4, Address6 } from 'ip-address';
import {
  AuditAction,
  AuditStatus,
  AuditSeverity,
} from '../types/audit-log.types';
import { AuthenticatedRequest, isAdminUser } from '../types/auth.types';

export const SKIP_IP_WHITELIST_KEY = 'skipIpWhitelist';
export const SkipIpWhitelist = () => SetMetadata(SKIP_IP_WHITELIST_KEY, true);

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if IP whitelisting should be skipped for this route
    const skipWhitelist = this.reflector.getAllAndOverride<boolean>(
      SKIP_IP_WHITELIST_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipWhitelist) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Only apply to admin users
    if (!isAdminUser(user)) {
      return true; // Not an admin, skip whitelist check
    }

    // Extract client IP
    const clientIp = this.extractClientIp(request);

    // Check if IP is whitelisted
    const isWhitelisted = await this.isIpWhitelisted(clientIp, user.id);

    if (isWhitelisted) {
      // Update last used timestamp
      await this.updateLastUsed(clientIp);
      return true;
    }

    // IP not whitelisted - block and log
    this.logger.warn(
      `Blocked admin access from non-whitelisted IP: ${clientIp} for user: ${user.email}`,
    );

    const attemptedRoute = request.url || 'unknown';
    const userAgentHeader = request.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

    await this.auditService.log(
      {
        userId: user.id,
        action: AuditAction.IP_BLOCKED,
        resource: 'AUTH',
        status: AuditStatus.FAILURE,
        severity: AuditSeverity.HIGH,
        metadata: {
          blockedIp: clientIp,
          attemptedRoute: attemptedRoute,
          userAgent: userAgent,
        },
      },
      request,
    );

    throw new ForbiddenException(
      'Access denied: Your IP address is not whitelisted for admin access. Please contact support.',
    );
  }

  private extractClientIp(request: Request): string {
    // Consider proxy headers
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      // Take the first IP (original client)
      return xForwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
      return xForwardedFor[0].trim();
    }

    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string') {
      return xRealIp;
    }

    if (request.ip) {
      return request.ip;
    }

    if (request.socket?.remoteAddress) {
      return request.socket.remoteAddress;
    }

    return 'unknown';
  }

  private async isIpWhitelisted(
    clientIp: string,
    userId: string,
  ): Promise<boolean> {
    // Trim IP address to handle any whitespace
    const trimmedIp = clientIp?.trim();

    if (!trimmedIp || trimmedIp === 'unknown') {
      this.logger.warn(
        `IP whitelist check skipped: invalid IP address "${clientIp}" for user ${userId}`,
      );
      return false;
    }

    // Check grace period first (for new admins)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ipWhitelistGracePeriodUntil: true },
    });

    if (
      user?.ipWhitelistGracePeriodUntil &&
      new Date() < user.ipWhitelistGracePeriodUntil
    ) {
      // Still within grace period - allow access
      return true;
    }

    // Check expired entries (expiresAt < now) and exclude them
    const now = new Date();
    const whitelistEntries = await this.prisma.adminIpWhitelist.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [{ userId: null }, { userId: userId }], // Global whitelist or user-specific
          },
          {
            OR: [
              { expiresAt: null }, // Permanent entries
              { expiresAt: { gt: now } }, // Not expired yet
            ],
          },
        ],
      },
    });

    // Log whitelist entries being checked (for debugging)
    if (whitelistEntries.length > 0) {
      this.logger.debug(
        `Checking IP ${trimmedIp} against ${whitelistEntries.length} whitelist entries for user ${userId}`,
      );
    } else {
      this.logger.warn(
        `No active whitelist entries found for user ${userId}. IP ${trimmedIp} will be blocked.`,
      );
    }

    // Check each entry
    for (const entry of whitelistEntries) {
      const trimmedEntry = entry.ipAddress?.trim();
      if (this.matchesIpOrCidr(trimmedIp, trimmedEntry)) {
        this.logger.debug(
          `IP ${trimmedIp} matched whitelist entry: ${trimmedEntry} (ID: ${entry.id})`,
        );
        return true;
      }
    }

    // Log which entries were checked (for debugging CIDR issues)
    const entryList = whitelistEntries.map((e) => e.ipAddress).join(', ');
    this.logger.debug(
      `IP ${trimmedIp} did not match any whitelist entries: [${entryList}]`,
    );

    return false;
  }

  private matchesIpOrCidr(clientIp: string, whitelistEntry: string): boolean {
    if (!clientIp || !whitelistEntry) {
      return false;
    }

    // Trim both IPs to handle any whitespace
    const trimmedClientIp = clientIp.trim();
    const trimmedEntry = whitelistEntry.trim();

    // Check if exact match
    if (trimmedClientIp === trimmedEntry) {
      return true;
    }

    // Check if CIDR notation
    if (trimmedEntry.includes('/')) {
      try {
        // IPv4 CIDR check
        if (isIPv4(trimmedClientIp)) {
          const networkAddress = new Address4(trimmedEntry);
          const clientAddress = new Address4(trimmedClientIp);
          const isMatch = clientAddress.isInSubnet(networkAddress);

          // Log CIDR matching for debugging
          if (isMatch) {
            this.logger.debug(
              `CIDR match: ${trimmedClientIp} is in subnet ${trimmedEntry}`,
            );
          }

          return isMatch;
        }

        // IPv6 CIDR check
        if (isIPv6(trimmedClientIp)) {
          const networkAddress = new Address6(trimmedEntry);
          const clientAddress = new Address6(trimmedClientIp);
          const isMatch = clientAddress.isInSubnet(networkAddress);

          // Log CIDR matching for debugging
          if (isMatch) {
            this.logger.debug(
              `CIDR match: ${trimmedClientIp} is in subnet ${trimmedEntry}`,
            );
          }

          return isMatch;
        }

        // If IP is not valid IPv4 or IPv6, log warning
        this.logger.warn(
          `IP address ${trimmedClientIp} is not a valid IPv4 or IPv6 address`,
        );
      } catch (error) {
        this.logger.error(
          `Invalid CIDR notation or IP address. Entry: ${trimmedEntry}, Client IP: ${trimmedClientIp}`,
          error,
        );
        return false;
      }
    }

    return false;
  }

  private async updateLastUsed(clientIp: string): Promise<void> {
    try {
      await this.prisma.adminIpWhitelist.updateMany({
        where: { ipAddress: clientIp },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });
    } catch (error) {
      // Non-critical, don't throw
      this.logger.error('Failed to update IP whitelist usage', error);
    }
  }
}
