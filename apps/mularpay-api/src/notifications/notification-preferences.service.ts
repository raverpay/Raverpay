import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto';

/**
 * Notification Preferences Service
 *
 * Manages user notification preferences including:
 * - Channel enablement (email, SMS, push, in-app)
 * - Event type preferences (transactions, security, KYC, promotional)
 * - Frequency controls (immediate, daily, weekly)
 * - Quiet hours / Do Not Disturb settings
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's notification preferences
   * Creates default preferences if they don't exist
   *
   * @param userId - User ID
   * @returns User's notification preferences
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      this.logger.log(`Creating default preferences for user ${userId}`);
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   *
   * @param userId - User ID
   * @param dto - Updated preferences
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    // Ensure preferences exist
    await this.getPreferences(userId);

    const updated = await this.prisma.notificationPreference.update({
      where: { userId },
      data: dto,
    });

    this.logger.log(`Preferences updated for user ${userId}`);

    return updated;
  }

  /**
   * Check if a specific notification should be sent based on user preferences
   *
   * @param userId - User ID
   * @param channel - Notification channel (EMAIL, SMS, PUSH, IN_APP)
   * @param category - Notification category (TRANSACTION, SECURITY, KYC, PROMOTIONAL, SYSTEM, ACCOUNT)
   * @returns True if notification should be sent
   */
  async shouldSendNotification(
    userId: string,
    channel: string,
    category: string,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check if channel is enabled globally
    const channelKey = `${channel.toLowerCase()}Enabled`;
    if (
      channelKey in preferences &&
      preferences[channelKey as keyof typeof preferences] === false
    ) {
      this.logger.log(
        `Channel ${channel} disabled for user ${userId}, skipping`,
      );
      return false;
    }

    // Check category-specific preferences
    const categoryKey = `${category.toLowerCase()}${this.capitalize(channel.toLowerCase())}s`;
    if (
      categoryKey in preferences &&
      preferences[categoryKey as keyof typeof preferences] === false
    ) {
      this.logger.log(
        `Category ${category} disabled for channel ${channel} for user ${userId}, skipping`,
      );
      return false;
    }

    // Check frequency (for now, we only support IMMEDIATE and NEVER)
    const frequencyKey = `${channel.toLowerCase()}Frequency`;
    if (
      frequencyKey in preferences &&
      preferences[frequencyKey as keyof typeof preferences] === 'NEVER'
    ) {
      this.logger.log(
        `Frequency set to NEVER for channel ${channel} for user ${userId}, skipping`,
      );
      return false;
    }

    // Check quiet hours
    if (await this.isInQuietHours(userId)) {
      // Allow security alerts even during quiet hours
      if (category !== 'SECURITY') {
        this.logger.log(
          `User ${userId} is in quiet hours, skipping non-security notification`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user is currently in quiet hours
   *
   * @param userId - User ID
   * @returns True if in quiet hours
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    if (!preferences.quietHoursEnabled) {
      return false;
    }

    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const timeZone = preferences.timeZone || 'Africa/Lagos';

    // Format current time in user's timezone as HH:mm
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Create default notification preferences for a new user
   *
   * @param userId - User ID
   * @returns Created preferences
   */
  private async createDefaultPreferences(userId: string) {
    return this.prisma.notificationPreference.create({
      data: {
        userId,
        // Defaults are set in the Prisma schema
      },
    });
  }

  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Reset preferences to default
   *
   * @param userId - User ID
   * @returns Reset preferences
   */
  async resetToDefault(userId: string) {
    await this.prisma.notificationPreference.delete({
      where: { userId },
    });

    const newPreferences = await this.createDefaultPreferences(userId);

    this.logger.log(`Preferences reset to default for user ${userId}`);

    return newPreferences;
  }

  /**
   * Opt user out of a specific category
   *
   * @param userId - User ID
   * @param category - Category to opt out of
   */
  async optOutCategory(userId: string, category: string) {
    const preferences = await this.getPreferences(userId);

    const optOutCategories = preferences.optOutCategories || [];
    if (!optOutCategories.includes(category)) {
      optOutCategories.push(category);
    }

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: { optOutCategories },
    });
  }

  /**
   * Opt user back into a specific category
   *
   * @param userId - User ID
   * @param category - Category to opt back into
   */
  async optInCategory(userId: string, category: string) {
    const preferences = await this.getPreferences(userId);

    const optOutCategories = (preferences.optOutCategories || []).filter(
      (cat) => cat !== category,
    );

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: { optOutCategories },
    });
  }
}
