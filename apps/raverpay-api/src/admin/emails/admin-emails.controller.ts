import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Body,
  UseGuards,
  Logger,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminEmailsService } from './admin-emails.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ResendWebhookService } from '../../webhooks/resend-webhook.service';

/**
 * Admin Emails Controller
 *
 * Endpoints for managing inbound emails in admin dashboard
 * Base path: /api/admin/emails
 */
@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminEmailsController {
  private readonly logger = new Logger(AdminEmailsController.name);

  constructor(
    private readonly emailsService: AdminEmailsService,
    private readonly webhookService: ResendWebhookService,
  ) {}

  /**
   * Get emails with role-based filtering
   * GET /api/admin/emails
   */
  @Get()
  async getEmails(
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('targetEmail') targetEmail?: string,
    @Query('targetRole') targetRole?: UserRole,
    @Query('isProcessed') isProcessed?: string,
    @Query('search') search?: string,
  ) {
    return this.emailsService.getEmails(userRole, userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      targetEmail,
      targetRole: targetRole,
      isProcessed:
        isProcessed === 'true'
          ? true
          : isProcessed === 'false'
            ? false
            : undefined,
      search,
    });
  }

  /**
   * Get email statistics
   * GET /api/admin/emails/stats
   */
  @Get('stats')
  async getEmailStats(
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.getEmailStats(userRole, userId);
  }

  /**
   * Manually process an email from Resend by email ID
   * POST /api/admin/emails/process-from-resend
   *
   * Use this to recover emails from missed webhook events
   * Requires ADMIN or SUPER_ADMIN role
   *
   * NOTE: This route MUST be defined before the :id routes to prevent
   * 'process-from-resend' from being matched as an ID parameter
   */
  @Post('process-from-resend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async processEmailFromResend(
    @Body('emailId') emailId: string,
    @GetUser('id') userId: string,
  ) {
    this.logger.log(
      `Admin ${userId} manually processing email ${emailId} from Resend`,
    );
    return this.webhookService.manuallyProcessEmail(emailId);
  }

  /**
   * Get email by ID
   * GET /api/admin/emails/:id
   */
  @Get(':id')
  async getEmailById(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.getEmailById(emailId, userRole, userId);
  }

  /**
   * Mark email as processed
   * PATCH /api/admin/emails/:id/process
   */
  @Patch(':id/process')
  async markAsProcessed(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.markAsProcessed(emailId, userRole, userId);
  }

  /**
   * Reply to an inbound email
   * POST /api/admin/emails/:id/reply
   *
   * Supports file attachments (max 5 files, 10MB each)
   * Content-Type: multipart/form-data
   * Fields: content, subject (optional)
   * Files: attachments[] (optional)
   */
  @Post(':id/reply')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  async replyToEmail(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Body() dto: ReplyEmailDto,
    @UploadedFiles() attachments?: Express.Multer.File[],
  ) {
    return this.emailsService.replyToEmail(
      emailId,
      userRole,
      userId,
      dto,
      attachments,
    );
  }

  /**
   * Fetch email body content from Resend API (on-demand)
   * GET /api/admin/emails/:id/content
   */
  @Get(':id/content')
  async fetchEmailContent(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.fetchEmailContent(emailId, userRole, userId);
  }

  /**
   * Download an email attachment
   * GET /api/admin/emails/:id/attachments/:attachmentId
   */
  @Get(':id/attachments/:attachmentId')
  async downloadAttachment(
    @Param('id') emailId: string,
    @Param('attachmentId') attachmentId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.downloadAttachment(
      emailId,
      attachmentId,
      userRole,
      userId,
    );
  }

  /**
   * Forward an email to another address
   * POST /api/admin/emails/:id/forward
   */
  @Post(':id/forward')
  async forwardEmail(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Body('toEmail') toEmail?: string,
  ) {
    return this.emailsService.forwardEmail(
      emailId,
      userRole,
      userId,
      toEmail || 'raverpay@outlook.com',
    );
  }
}
