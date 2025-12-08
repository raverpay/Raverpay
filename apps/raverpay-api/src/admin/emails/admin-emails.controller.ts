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
} from '@nestjs/common';
import { AdminEmailsService } from './admin-emails.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { ReplyEmailDto } from './dto/reply-email.dto';

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

  constructor(private readonly emailsService: AdminEmailsService) {}

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
   */
  @Post(':id/reply')
  async replyToEmail(
    @Param('id') emailId: string,
    @GetUser('role') userRole: UserRole,
    @GetUser('id') userId: string,
    @Body() dto: ReplyEmailDto,
  ) {
    return this.emailsService.replyToEmail(emailId, userRole, userId, dto);
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
}
