import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditAction,
  AuditResource,
  AuditSeverity,
  ActorType,
  AuditStatus,
  CreateAuditLogDto,
  RequestMetadata,
  getSeverityForAction,
} from '../types/audit-log.types';
import { Request } from 'express';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract request metadata from Express request object
   */
  private extractRequestMetadata(request?: Request): RequestMetadata {
    if (!request) {
      return {
        ipAddress: 'system',
        userAgent: 'system',
      };
    }

    // Extract real IP address (considering proxies)
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';

    const userAgent = request.headers['user-agent'] || 'unknown';
    const deviceId = request.headers['x-device-id'] as string;

    return {
      ipAddress,
      userAgent,
      deviceId,
      requestId: request.headers['x-request-id'] as string,
      timestamp: new Date(),
    };
  }

  /**
   * Parse location from IP address (basic implementation)
   * In production, integrate with IP geolocation service
   */
  private async getLocationFromIp(
    ipAddress?: string,
  ): Promise<string | undefined> {
    if (!ipAddress || ipAddress === 'unknown' || ipAddress === 'system') {
      return undefined;
    }

    // TODO: Integrate with IP geolocation service (MaxMind, IP-API, etc.)
    // For now, return undefined
    return undefined;
  }

  /**
   * Core method to create an audit log entry
   */
  async log(dto: CreateAuditLogDto, request?: Request): Promise<void> {
    try {
      const startTime = Date.now();
      const metadata = this.extractRequestMetadata(request);

      // Auto-determine severity if not provided
      const severity =
        dto.severity ||
        (dto.action in AuditAction
          ? getSeverityForAction(dto.action as AuditAction)
          : AuditSeverity.LOW);

      // Get location from IP if not provided
      const location =
        dto.location || (await this.getLocationFromIp(metadata.ipAddress));

      const executionTime = dto.executionTime || Date.now() - startTime;

      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          resource: dto.resource,
          resourceId: dto.resourceId,
          ipAddress: dto.ipAddress || metadata.ipAddress,
          userAgent: dto.userAgent || metadata.userAgent,
          metadata: dto.metadata as any,
          actorType: dto.actorType || ActorType.USER,
          severity,
          status: dto.status || AuditStatus.SUCCESS,
          errorMessage: dto.errorMessage,
          executionTime,
          deviceId: dto.deviceId || metadata.deviceId,
          location,
          oldValue: dto.oldValue as any,
          newValue: dto.newValue as any,
        },
      });
    } catch (error) {
      // Never throw - audit logging should not break the application
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: AuditAction,
    userId: string | null,
    metadata?: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId: userId ?? undefined,
        action,
        resource: AuditResource.AUTH,
        resourceId: userId ?? undefined,
        metadata,
        actorType: ActorType.USER,
        severity: getSeverityForAction(action),
        status,
      },
      request,
    );
  }

  /**
   * Log transaction events
   */
  async logTransaction(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.TRANSACTION,
        resourceId: metadata.transactionId || metadata.reference,
        metadata,
        actorType: ActorType.USER,
        severity: getSeverityForAction(action),
        status,
      },
      request,
    );
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: AuditAction,
    userId: string | null,
    metadata: any,
    request?: Request,
    errorMessage?: string,
  ): Promise<void> {
    await this.log(
      {
        userId: userId ?? undefined,
        action,
        resource: AuditResource.SECURITY,
        metadata,
        actorType: ActorType.SYSTEM,
        severity: AuditSeverity.HIGH,
        status: AuditStatus.FAILURE,
        errorMessage,
      },
      request,
    );
  }

  /**
   * Log admin operations
   */
  async logAdmin(
    action: AuditAction,
    adminUserId: string,
    targetUserId: string,
    metadata: any,
    request?: Request,
  ): Promise<void> {
    await this.log(
      {
        userId: adminUserId,
        action,
        resource: AuditResource.USER,
        resourceId: targetUserId,
        metadata: {
          ...metadata,
          targetUserId,
          adminAction: true,
        },
        actorType: ActorType.ADMIN,
        severity: AuditSeverity.HIGH,
      },
      request,
    );
  }

  /**
   * Log system events (automated processes)
   */
  async logSystem(
    action: AuditAction,
    resource: AuditResource,
    metadata: any,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      metadata,
      actorType: ActorType.SYSTEM,
      severity: AuditSeverity.LOW,
      ipAddress: 'system',
      userAgent: 'system',
    });
  }

  /**
   * Log webhook events
   */
  async logWebhook(
    action: AuditAction,
    resource: AuditResource,
    metadata: any,
    status: AuditStatus = AuditStatus.SUCCESS,
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      metadata,
      actorType: ActorType.WEBHOOK,
      severity: AuditSeverity.MEDIUM,
      status,
      errorMessage,
      ipAddress: 'webhook',
      userAgent: metadata.provider || 'webhook',
    });
  }

  /**
   * Log failed login attempts
   */
  async logFailedLogin(
    email: string,
    reason: string,
    request?: Request,
    attemptCount?: number,
  ): Promise<void> {
    await this.logAuth(
      AuditAction.LOGIN_FAILED,
      null,
      {
        email,
        reason,
        attemptCount,
      },
      request,
      AuditStatus.FAILURE,
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | null,
    reason: string,
    metadata: any,
    request?: Request,
  ): Promise<void> {
    await this.logSecurity(
      AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
      userId,
      {
        ...metadata,
        reason,
      },
      request,
      reason,
    );
  }

  /**
   * Log data changes (useful for UPDATE operations)
   */
  async logDataChange(
    resource: AuditResource,
    resourceId: string,
    oldValue: any,
    newValue: any,
    userId: string,
    request?: Request,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action: AuditAction.UPDATE,
        resource,
        resourceId,
        oldValue,
        newValue,
        metadata: {
          changes: this.getChangedFields(oldValue, newValue),
        },
        actorType: ActorType.USER,
        severity: AuditSeverity.MEDIUM,
      },
      request,
    );
  }

  /**
   * Helper to detect changed fields between old and new values
   */
  private getChangedFields(oldValue: any, newValue: any): string[] {
    if (!oldValue || !newValue) return [];

    const changes: string[] = [];
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    keys.forEach((key) => {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changes.push(key);
      }
    });

    return changes;
  }

  /**
   * Log P2P transfer
   */
  async logP2PTransfer(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.P2P_TRANSFER,
        resourceId: metadata.transferId || metadata.reference,
        metadata,
        actorType: ActorType.USER,
        severity: AuditSeverity.MEDIUM,
        status,
      },
      request,
    );
  }

  /**
   * Log VTU operations
   */
  async logVTU(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.VTU_ORDER,
        resourceId: metadata.orderId || metadata.reference,
        metadata,
        actorType: ActorType.USER,
        severity: AuditSeverity.LOW,
        status,
      },
      request,
    );
  }

  /**
   * Log crypto operations
   */
  async logCrypto(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.CRYPTO_TRANSACTION,
        resourceId: metadata.transactionId || metadata.transactionHash,
        metadata,
        actorType: ActorType.USER,
        severity: AuditSeverity.MEDIUM,
        status,
      },
      request,
    );
  }

  /**
   * Log Circle/USDC operations
   */
  async logCircle(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.CIRCLE_TRANSACTION,
        resourceId: metadata.circleTransactionId || metadata.transactionId,
        metadata,
        actorType: ActorType.USER,
        severity: AuditSeverity.MEDIUM,
        status,
      },
      request,
    );
  }

  /**
   * Log wallet operations
   */
  async logWallet(
    action: AuditAction,
    userId: string,
    metadata: any,
    request?: Request,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): Promise<void> {
    await this.log(
      {
        userId,
        action,
        resource: AuditResource.WALLET,
        resourceId: metadata.walletId,
        metadata,
        actorType: ActorType.USER,
        severity: getSeverityForAction(action),
        status,
      },
      request,
    );
  }
}
