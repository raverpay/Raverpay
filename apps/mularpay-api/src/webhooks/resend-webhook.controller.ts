import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ResendWebhookService } from './resend-webhook.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Resend Webhook Controller
 *
 * Receives and processes webhook events from Resend for inbound emails
 * Endpoint: POST /webhooks/resend/inbound
 *
 * Required webhook events to enable on Resend Dashboard:
 * - email.received: Email received at configured addresses
 */
@Controller('webhooks/resend')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);

  constructor(private readonly webhookService: ResendWebhookService) {}

  /**
   * Handle Resend inbound email webhook events
   * POST /webhooks/resend/inbound
   */
  @Public()
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  async handleInboundEmail(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // DEBUG: Log all headers to identify signature header name
    this.logger.log('🔍 DEBUG: All headers received:');
    Object.keys(headers).forEach((key) => {
      this.logger.log(
        `  ${key}: ${headers[key]?.substring(0, 100)}${headers[key]?.length > 100 ? '...' : ''}`,
      );
    });

    // Resend uses Svix for webhook signatures
    // Required headers: svix-id, svix-timestamp, svix-signature
    const svixId = headers['svix-id'];
    const svixTimestamp = headers['svix-timestamp'];
    const svixSignature = headers['svix-signature'];

    this.logger.log(`🔍 DEBUG: Svix headers found:`);
    this.logger.log(
      `  svix-id: ${svixId ? 'YES' : 'NO'} ${svixId ? `(${svixId.substring(0, 20)}...)` : ''}`,
    );
    this.logger.log(
      `  svix-timestamp: ${svixTimestamp ? 'YES' : 'NO'} ${svixTimestamp || ''}`,
    );
    this.logger.log(
      `  svix-signature: ${svixSignature ? 'YES' : 'NO'} ${svixSignature ? `(${svixSignature.substring(0, 50)}...)` : ''}`,
    );

    // DEBUG: Check raw body availability
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);
    this.logger.log(
      `🔍 DEBUG: Raw body available: ${req.rawBody ? 'YES' : 'NO'}`,
    );
    this.logger.log(`🔍 DEBUG: Raw body length: ${rawBody.length}`);
    this.logger.log(
      `🔍 DEBUG: Raw body preview: ${rawBody.substring(0, 200)}...`,
    );

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    this.logger.log(
      `🔍 DEBUG: Webhook secret configured: ${webhookSecret ? 'YES' : 'NO'}`,
    );
    this.logger.log(`🔍 DEBUG: NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

    // In development, skip signature verification for debugging
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!webhookSecret) {
      this.logger.warn('⚠️  RESEND_WEBHOOK_SECRET not configured');
      if (isDevelopment) {
        this.logger.warn(
          '⚠️  DEVELOPMENT MODE: Skipping signature verification',
        );
      } else {
        throw new BadRequestException('Webhook secret not configured');
      }
    } else if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn('⚠️  Missing Svix headers');
      this.logger.warn(`  svix-id: ${svixId ? 'present' : 'missing'}`);
      this.logger.warn(
        `  svix-timestamp: ${svixTimestamp ? 'present' : 'missing'}`,
      );
      this.logger.warn(
        `  svix-signature: ${svixSignature ? 'present' : 'missing'}`,
      );
      if (isDevelopment) {
        this.logger.warn(
          '⚠️  DEVELOPMENT MODE: Skipping signature verification',
        );
      } else {
        throw new BadRequestException('Missing Svix signature headers');
      }
    } else {
      // Attempt signature verification using Svix
      const isValid = this.webhookService.verifyWebhookSignature(
        {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
        rawBody,
        webhookSecret,
      );

      this.logger.log(
        `🔍 DEBUG: Signature verification result: ${isValid ? 'VALID' : 'INVALID'}`,
      );

      if (!isValid) {
        if (isDevelopment) {
          this.logger.warn(
            '⚠️  DEVELOPMENT MODE: Invalid signature but allowing request',
          );
        } else {
          this.logger.warn('❌ Invalid webhook signature');
          throw new BadRequestException('Invalid signature');
        }
      } else {
        this.logger.log('✅ Signature verified successfully');
      }
    }

    const { type, data } = body;

    this.logger.log(`📨 Received Resend webhook: ${type}`);

    try {
      switch (type) {
        case 'email.received':
          await this.webhookService.handleEmailReceived({ type, data });
          break;

        default:
          this.logger.log(`⚠️  Unhandled webhook event: ${type}`);
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error processing webhook ${type}:`, error);
      // Return 200 to prevent Resend from retrying
      // Log error for manual investigation
      return { status: 'error', message: 'Processed with errors' };
    }
  }
}
