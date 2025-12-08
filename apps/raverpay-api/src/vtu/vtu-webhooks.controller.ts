import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VTPassService } from './services/vtpass.service';
import { VTUService } from './vtu.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface VTPassWebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    transactionId: string;
  };
}

@Controller('vtu/webhooks')
export class VTUWebhooksController {
  private readonly logger = new Logger(VTUWebhooksController.name);

  constructor(
    private readonly vtpassService: VTPassService,
    private readonly vtuService: VTUService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('vtpass')
  @HttpCode(HttpStatus.OK)
  async handleVTPassWebhook(
    @Headers('x-vtpass-signature') signature: string,
    @Body() payload: VTPassWebhookPayload,
  ) {
    this.logger.log(`[VTPassWebhook] Event received: ${payload.event}`);

    // Verify webhook signature
    const isValid = this.vtpassService.verifyWebhook(signature, payload);
    if (!isValid) {
      this.logger.error('[VTPassWebhook] Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    // Handle different events
    switch (payload.event) {
      case 'transaction.success':
        await this.handleTransactionSuccess(payload.data);
        break;

      case 'transaction.failed':
        await this.handleTransactionFailed(payload.data);
        break;

      case 'transaction.pending':
        await this.handleTransactionPending(payload.data);
        break;

      default:
        this.logger.log(`[VTPassWebhook] Unhandled event: ${payload.event}`);
    }

    return { status: 'success' };
  }

  private async handleTransactionSuccess(data: VTPassWebhookPayload['data']) {
    this.logger.log(`[VTPassWebhook] Transaction success: ${data.reference}`);

    await this.vtuService.updateTransactionStatus(data.reference, 'COMPLETED');

    // Get order to retrieve userId and details
    const order = await this.prisma.vTUOrder.findUnique({
      where: { reference: data.reference },
    });

    if (order && order.status === 'COMPLETED') {
      // Create notification for successful purchase
      await this.notificationsService.createNotification({
        userId: order.userId,
        type: NotificationType.TRANSACTION,
        title: 'Purchase Successful',
        message: `${order.serviceType} purchase completed successfully`,
        data: {
          orderId: order.id,
          serviceType: order.serviceType,
          amount: order.amount.toString(),
        },
      });
    }
  }

  private async handleTransactionFailed(data: VTPassWebhookPayload['data']) {
    this.logger.log(`[VTPassWebhook] Transaction failed: ${data.reference}`);

    // Update status and refund user
    await this.vtuService.updateTransactionStatus(data.reference, 'FAILED');

    // Note: Refund is already handled in the service when transaction fails
    // This webhook is for late notifications
  }

  private async handleTransactionPending(data: VTPassWebhookPayload['data']) {
    this.logger.log(`[VTPassWebhook] Transaction pending: ${data.reference}`);

    await this.vtuService.updateTransactionStatus(data.reference, 'PENDING');
  }
}
