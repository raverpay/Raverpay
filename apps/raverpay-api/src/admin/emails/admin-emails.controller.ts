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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminEmailsService } from './admin-emails.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ResendWebhookService } from '../../webhooks/resend-webhook.service';

@ApiTags('Admin - Emails')
@ApiBearerAuth('JWT-auth')
@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminEmailsController {
  private readonly logger = new Logger(AdminEmailsController.name);

  constructor(
    private readonly emailsService: AdminEmailsService,
    private readonly webhookService: ResendWebhookService,
  ) {}

  @ApiOperation({ summary: 'Get emails with role-based filtering' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'targetEmail', required: false, type: String })
  @ApiQuery({ name: 'targetRole', required: false, enum: UserRole })
  @ApiQuery({ name: 'isProcessed', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
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

  @ApiOperation({ summary: 'Get email statistics' })
  @Get('stats')
  async getEmailStats(
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.getEmailStats(userRole, userId);
  }

  @ApiOperation({ summary: 'Get outbound emails (sent emails)' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'fromEmail', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @Get('outbound')
  async getOutboundEmails(
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('fromEmail') fromEmail?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.emailsService.getOutboundEmails(userRole, userId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      fromEmail,
      search,
      status,
    });
  }

  @ApiOperation({ summary: 'Get outbound email by ID' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @Get('outbound/:id')
  async getOutboundEmailById(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.getOutboundEmailById(emailId, userRole, userId);
  }

  @ApiOperation({
    summary: 'Manually process an email from Resend by email ID',
  })
  @ApiBody({
    schema: { type: 'object', properties: { emailId: { type: 'string' } } },
  })
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

  @ApiOperation({ summary: 'Get email by ID' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @Get(':id')
  async getEmailById(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.getEmailById(emailId, userRole, userId);
  }

  @ApiOperation({ summary: 'Mark email as processed' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @Patch(':id/process')
  async markAsProcessed(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.markAsProcessed(emailId, userRole, userId);
  }

  @ApiOperation({ summary: 'Reply to an inbound email' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiConsumes('multipart/form-data')
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

  @ApiOperation({ summary: 'Fetch email body content from Resend API' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @Get(':id/content')
  async fetchEmailContent(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
  ) {
    return this.emailsService.fetchEmailContent(emailId, userRole, userId);
  }

  @ApiOperation({ summary: 'Download an email attachment' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
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

  @ApiOperation({ summary: 'Forward an email to another address' })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiBody({
    schema: { type: 'object', properties: { toEmail: { type: 'string' } } },
  })
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

  @ApiOperation({ summary: 'Send a fresh email (not a reply)' })
  @ApiConsumes('multipart/form-data')
  @Post('send')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  async sendFreshEmail(
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Body() dto: SendEmailDto,
    @UploadedFiles() attachments?: Express.Multer.File[],
  ) {
    return this.emailsService.sendFreshEmail(
      userRole,
      userId,
      dto,
      attachments,
    );
  }
}
