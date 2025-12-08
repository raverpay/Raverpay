import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

interface ExpoNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true, // Use FCM V1 API
    });

    this.logger.log('✅ Expo Push Notification Service initialized');
  }

  /**
   * Send push notification to a single user by their Expo push token
   *
   * @param pushToken - User's Expo push token
   * @param notification - Notification details
   * @returns Promise<boolean> - Success status
   */
  async sendToToken(
    pushToken: string,
    notification: ExpoNotification,
  ): Promise<boolean> {
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.error(`Invalid Expo push token: ${pushToken}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      badge: notification.badge,
      channelId: notification.channelId,
      categoryId: notification.categoryId,
      priority: notification.priority ?? 'high',
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const result = this.handleTickets(tickets, [pushToken]);
      return result.successful > 0;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to ${pushToken}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   *
   * @param pushTokens - Array of Expo push tokens
   * @param notification - Notification details
   * @returns Promise<{ successful: number; failed: number }>
   */
  async sendToTokens(
    pushTokens: string[],
    notification: ExpoNotification,
  ): Promise<{ successful: number; failed: number }> {
    // Filter valid tokens
    const validTokens = pushTokens.filter((token) =>
      Expo.isExpoPushToken(token),
    );

    if (validTokens.length === 0) {
      this.logger.warn('No valid Expo push tokens provided');
      return { successful: 0, failed: pushTokens.length };
    }

    // Build messages
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      badge: notification.badge,
      channelId: notification.channelId,
      categoryId: notification.categoryId,
      priority: notification.priority ?? 'high',
    }));

    try {
      // Split into chunks of 100 (Expo's limit)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const chunkTickets =
            await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...chunkTickets);
        } catch (error) {
          this.logger.error('Error sending chunk:', error.message);
          // Push error tickets for failed chunk
          tickets.push(
            ...chunk.map(() => ({
              status: 'error' as const,
              message: error.message,
            })),
          );
        }
      }

      return this.handleTickets(tickets, validTokens);
    } catch (error) {
      this.logger.error('Failed to send batch push notifications:', error);
      return { successful: 0, failed: validTokens.length };
    }
  }

  /**
   * Handle push notification tickets and return success/failure counts
   */
  private handleTickets(
    tickets: ExpoPushTicket[],
    tokens: string[],
  ): { successful: number; failed: number } {
    let successful = 0;
    let failed = 0;

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        successful++;
      } else if (ticket.status === 'error') {
        failed++;
        const token = tokens[index] || 'unknown';
        this.logger.error(
          `Push notification error for ${token}: ${ticket.message}`,
        );

        // Handle specific error cases
        if (
          ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.details?.error === 'InvalidCredentials'
        ) {
          this.logger.warn(`Token ${token} is invalid and should be removed`);
          // TODO: Emit event to remove token from database
        }
      }
    });

    this.logger.log(
      `Push notifications sent: ${successful} successful, ${failed} failed`,
    );

    return { successful, failed };
  }

  /**
   * Convenience methods for common notification types
   */

  async sendTransactionNotification(
    pushToken: string,
    title: string,
    message: string,
    transactionData?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendToToken(pushToken, {
      title,
      body: message,
      data: {
        type: 'TRANSACTION',
        ...transactionData,
      },
      sound: 'default',
      badge: 1,
      priority: 'high',
      channelId: 'transactions',
    });
  }

  async sendSecurityNotification(
    pushToken: string,
    title: string,
    message: string,
    securityData?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendToToken(pushToken, {
      title,
      body: message,
      data: {
        type: 'SECURITY',
        ...securityData,
      },
      sound: 'default',
      badge: 1,
      priority: 'high',
      channelId: 'security',
    });
  }

  async sendKYCNotification(
    pushToken: string,
    title: string,
    message: string,
    kycData?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendToToken(pushToken, {
      title,
      body: message,
      data: {
        type: 'KYC',
        ...kycData,
      },
      sound: 'default',
      badge: 1,
      priority: 'default',
      channelId: 'kyc',
    });
  }

  async sendPromotionalNotification(
    pushToken: string,
    title: string,
    message: string,
    promotionalData?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendToToken(pushToken, {
      title,
      body: message,
      data: {
        type: 'PROMOTIONAL',
        ...promotionalData,
      },
      sound: 'default',
      priority: 'default',
      channelId: 'promotions',
    });
  }
}
