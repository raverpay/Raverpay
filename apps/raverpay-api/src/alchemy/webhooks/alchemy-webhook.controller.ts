import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Get,
} from '@nestjs/common';
import { AlchemyWebhookService } from './alchemy-webhook.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Alchemy Webhook Controller
 *
 * Receives webhooks from Alchemy
 * Public endpoint (no auth) but signature-verified
 */
@ApiTags('Alchemy Webhooks')
@Controller('alchemy/webhooks')
export class AlchemyWebhookController {
  private readonly logger = new Logger(AlchemyWebhookController.name);

  constructor(private readonly webhookService: AlchemyWebhookService) {}

  /**
   * Receive Alchemy webhooks
   *
   * This endpoint is called by Alchemy when blockchain events occur
   * URL to configure in Alchemy dashboard: https://your-domain.com/alchemy/webhooks
   *
   * @param signature - HMAC signature from Alchemy
   * @param body - Webhook payload
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Alchemy webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receiveWebhook(
    @Headers('x-alchemy-signature') signature: string,
    @Body() body: any,
  ) {
    this.logger.log(`Received webhook: ${body.type || 'unknown'}`);

    // Verify signature
    const bodyString = JSON.stringify(body);
    const isValid = this.webhookService.verifySignature(signature, bodyString);

    if (!isValid) {
      this.logger.error('Invalid webhook signature!');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process webhook based on type
    try {
      switch (body.type) {
        case 'ADDRESS_ACTIVITY':
          await this.webhookService.processAddressActivity(body);
          break;

        case 'MINED_TRANSACTION':
          // Handle mined transaction events
          this.logger.debug('Mined transaction event received');
          break;

        case 'DROPPED_TRANSACTION':
          // Handle dropped transaction events
          this.logger.warn('Dropped transaction event received');
          break;

        default:
          this.logger.warn(`Unknown webhook type: ${body.type}`);
      }

      return {
        success: true,
        message: 'Webhook processed',
      };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      
      // Return 200 anyway to prevent Alchemy from retrying
      // We'll handle errors internally
      return {
        success: false,
        message: 'Webhook received but processing failed',
        error: error.message,
      };
    }
  }

  /**
   * Get webhook statistics (for monitoring)
   * This endpoint requires authentication in production
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    const stats = await this.webhookService.getWebhookStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Health check endpoint for webhook monitoring
   */
  @Get('health')
  @ApiOperation({ summary: 'Webhook endpoint health check' })
  @ApiResponse({ status: 200, description: 'Endpoint is healthy' })
  healthCheck() {
    return {
      success: true,
      message: 'Webhook endpoint is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
