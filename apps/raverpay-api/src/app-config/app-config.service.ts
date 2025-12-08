import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the rating prompt configuration (public endpoint for mobile app)
   */
  async getRatingConfig() {
    // Get the first (and should be only) rating config
    const config = await this.prisma.appRatingConfig.findFirst();

    if (!config) {
      throw new NotFoundException('Rating configuration not found');
    }

    return config;
  }

  /**
   * Update rating configuration (admin only)
   */
  async updateRatingConfig(updateDto: UpdateRatingConfigDto) {
    // Get the first config
    const config = await this.prisma.appRatingConfig.findFirst();

    if (!config) {
      throw new NotFoundException('Rating configuration not found');
    }

    // Update the configuration
    return this.prisma.appRatingConfig.update({
      where: { id: config.id },
      data: updateDto,
    });
  }

  /**
   * Initialize default rating configuration (called during setup)
   */
  async initializeRatingConfig() {
    const existingConfig = await this.prisma.appRatingConfig.findFirst();

    if (existingConfig) {
      return existingConfig;
    }

    // Create default configuration
    return this.prisma.appRatingConfig.create({
      data: {
        enabled: true,
        promptFrequencyDays: 30,
        minTransactionsRequired: 3,
        minUsageDaysRequired: 7,
        promptTitle: 'Enjoying RaverPay?',
        promptMessage:
          'Rate us on the app store! Your feedback helps us improve.',
        iosAppStoreUrl:
          'https://apps.apple.com/ng/app/expertpay-bill-payments/id6755424543',
        androidPlayStoreUrl:
          'https://apps.apple.com/ng/app/expertpay-bill-payments/id6755424543',
      },
    });
  }
}
