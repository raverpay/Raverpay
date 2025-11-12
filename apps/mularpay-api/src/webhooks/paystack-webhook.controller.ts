import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaystackWebhookService } from './paystack-webhook.service';
import { PaystackService } from '../payments/paystack.service';

/**
 * Paystack Webhook Controller
 *
 * Receives and processes webhook events from Paystack
 * Endpoint: POST /webhooks/paystack
 *
 * Required webhook events to enable on Paystack Dashboard:
 * - charge.success: Payment received
 * - customeridentification.success: BVN validation succeeded
 * - customeridentification.failed: BVN validation failed
 * - dedicatedaccount.assign.success: DVA created successfully
 * - dedicatedaccount.assign.failed: DVA creation failed
 */
@Controller('webhooks/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly webhookService: PaystackWebhookService,
  ) {}

  /**
   * Handle Paystack webhook events
   * POST /webhooks/paystack
   */
  @Post()
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Verify webhook signature for security
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);
    const isValid = this.paystackService.verifyWebhookSignature(
      signature,
      rawBody,
    );

    if (!isValid) {
      this.logger.warn('❌ Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = body;

    this.logger.log(`📨 Received Paystack webhook: ${event}`);

    try {
      switch (event) {
        case 'charge.success':
          await this.webhookService.handleChargeSuccess(data);
          break;

        case 'customeridentification.success':
          await this.webhookService.handleCustomerIdentificationSuccess(data);
          break;

        case 'customeridentification.failed':
          await this.webhookService.handleCustomerIdentificationFailed(data);
          break;

        case 'dedicatedaccount.assign.success':
          await this.webhookService.handleDedicatedAccountAssignSuccess(data);
          break;

        case 'dedicatedaccount.assign.failed':
          await this.webhookService.handleDedicatedAccountAssignFailed(data);
          break;

        default:
          this.logger.log(`⚠️  Unhandled webhook event: ${event}`);
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error processing webhook ${event}:`, error);
      // Return 200 to prevent Paystack from retrying
      // Log error for manual investigation
      return { status: 'error', message: 'Processed with errors' };
    }
  }
}
