import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface OneSignalNotification {
  headings: { en: string };
  contents: { en: string };
  data?: Record<string, any>;
  buttons?: Array<{ id: string; text: string; icon?: string }>;
  ios_badgeType?: 'Increase' | 'SetTo';
  ios_badgeCount?: number;
}

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.appId = this.config.get<string>('ONESIGNAL_APP_ID') || '';
    this.apiKey = this.config.get<string>('ONESIGNAL_API_KEY') || '';

    if (!this.appId || !this.apiKey) {
      this.logger.warn(
        'OneSignal credentials not configured. Push notifications will not work. ' +
          'Please set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in your .env file.',
      );
    }

    this.client = axios.create({
      baseURL: 'https://onesignal.com/api/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.apiKey}`,
      },
    });
  }

  /**
   * Send push notification to a user by their external user ID (userId)
   * This is the recommended approach - no need to store player IDs in database
   */
  async sendToUser(
    userId: string,
    notification: OneSignalNotification,
  ): Promise<void> {
    if (!this.appId || !this.apiKey) {
      this.logger.error(
        'Cannot send push notification: OneSignal not configured',
      );
      throw new Error('OneSignal credentials not configured');
    }

    try {
      const response = await this.client.post('/notifications', {
        app_id: this.appId,
        include_external_user_ids: [userId],
        headings: notification.headings,
        contents: notification.contents,
        data: notification.data,
        buttons: notification.buttons,
        ios_badgeType: notification.ios_badgeType,
        ios_badgeCount: notification.ios_badgeCount,
      });

      const notificationId = response.data?.id || 'unknown';
      this.logger.log(
        `Push notification sent to user ${userId}: ${notificationId} (recipients: ${response.data?.recipients || 0})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to user ${userId}`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Send push notification to multiple users by their external user IDs
   */
  async sendToUsers(
    userIds: string[],
    notification: OneSignalNotification,
  ): Promise<void> {
    try {
      const response = await this.client.post('/notifications', {
        app_id: this.appId,
        include_external_user_ids: userIds,
        headings: notification.headings,
        contents: notification.contents,
        data: notification.data,
        buttons: notification.buttons,
        ios_badgeType: notification.ios_badgeType,
        ios_badgeCount: notification.ios_badgeCount,
      });

      this.logger.log(
        `Push notification sent to ${userIds.length} users: ${response.data.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to users`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Send push notification to a specific device by player ID
   * Use this if you need to target a specific device when user has multiple devices
   */
  async sendToDevice(
    playerId: string,
    notification: OneSignalNotification,
  ): Promise<void> {
    try {
      const response = await this.client.post('/notifications', {
        app_id: this.appId,
        include_player_ids: [playerId],
        headings: notification.headings,
        contents: notification.contents,
        data: notification.data,
        buttons: notification.buttons,
        ios_badgeType: notification.ios_badgeType,
        ios_badgeCount: notification.ios_badgeCount,
      });

      this.logger.log(
        `Push notification sent to device ${playerId}: ${response.data.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to device ${playerId}`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Send push notification to all users with a specific segment/tag
   */
  async sendToSegment(
    segment: string,
    notification: OneSignalNotification,
  ): Promise<void> {
    try {
      const response = await this.client.post('/notifications', {
        app_id: this.appId,
        included_segments: [segment],
        headings: notification.headings,
        contents: notification.contents,
        data: notification.data,
        buttons: notification.buttons,
        ios_badgeType: notification.ios_badgeType,
        ios_badgeCount: notification.ios_badgeCount,
      });

      this.logger.log(
        `Push notification sent to segment ${segment}: ${response.data.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to segment ${segment}`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Convenience methods for common notification types
   */

  async sendTransactionNotification(
    userId: string,
    title: string,
    message: string,
    transactionData?: Record<string, any>,
  ): Promise<void> {
    return this.sendToUser(userId, {
      headings: { en: title },
      contents: { en: message },
      data: {
        type: 'TRANSACTION',
        ...transactionData,
      },
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
    });
  }

  async sendSecurityNotification(
    userId: string,
    title: string,
    message: string,
    securityData?: Record<string, any>,
  ): Promise<void> {
    return this.sendToUser(userId, {
      headings: { en: title },
      contents: { en: message },
      data: {
        type: 'SECURITY',
        ...securityData,
      },
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
    });
  }

  async sendKYCNotification(
    userId: string,
    title: string,
    message: string,
    kycData?: Record<string, any>,
  ): Promise<void> {
    return this.sendToUser(userId, {
      headings: { en: title },
      contents: { en: message },
      data: {
        type: 'KYC',
        ...kycData,
      },
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
    });
  }

  async sendPromotionalNotification(
    userId: string,
    title: string,
    message: string,
    promotionalData?: Record<string, any>,
  ): Promise<void> {
    return this.sendToUser(userId, {
      headings: { en: title },
      contents: { en: message },
      data: {
        type: 'PROMOTIONAL',
        ...promotionalData,
      },
    });
  }
}
