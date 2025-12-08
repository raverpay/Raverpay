import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupportService } from '../support/support.service';
import { UserRole, TicketPriority } from '@prisma/client';
import { Webhook } from 'svix';
import { Resend } from 'resend';

/**
 * Resend Webhook Service
 *
 * Handles inbound email events from Resend webhooks
 * Processes emails and routes them based on email address and role
 */
@Injectable()
export class ResendWebhookService {
  private readonly logger = new Logger(ResendWebhookService.name);

  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supportService: SupportService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log(
        '✅ Resend client initialized for fetching email content',
      );
    } else {
      this.resend = null;
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found - Cannot fetch email body content',
      );
    }
  }

  /**
   * Verify Resend webhook signature using Svix
   * @param headers - Svix headers (svix-id, svix-timestamp, svix-signature)
   * @param body - Raw request body
   * @param secret - Resend webhook secret from environment
   */
  verifyWebhookSignature(
    headers: {
      'svix-id': string;
      'svix-timestamp': string;
      'svix-signature': string;
    },
    body: string,
    secret: string,
  ): boolean {
    if (
      !headers['svix-id'] ||
      !headers['svix-timestamp'] ||
      !headers['svix-signature'] ||
      !secret
    ) {
      this.logger.warn('🔍 DEBUG: Missing Svix headers or secret');
      return false;
    }

    try {
      // Use Svix library to verify webhook signature
      const wh = new Webhook(secret);

      // Svix expects headers as a record
      const svixHeaders: Record<string, string> = {
        'svix-id': headers['svix-id'],
        'svix-timestamp': headers['svix-timestamp'],
        'svix-signature': headers['svix-signature'],
      };

      this.logger.log(`🔍 DEBUG: Verifying with Svix...`);
      this.logger.log(`🔍 DEBUG: Body length: ${body.length}`);
      this.logger.log(`🔍 DEBUG: Body preview: ${body.substring(0, 100)}...`);

      // Verify the webhook - throws error if invalid
      wh.verify(body, svixHeaders);

      this.logger.log('🔍 DEBUG: Svix verification passed');
      return true;
    } catch (error) {
      this.logger.error('🔍 DEBUG: Svix verification failed', error);
      this.logger.error(
        `🔍 DEBUG: Error message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Handle email.received event from Resend
   * @param eventData - Resend email.received event data
   */
  async handleEmailReceived(eventData: any): Promise<void> {
    const { email_id, created_at, from, to, cc, bcc, message_id, subject } =
      eventData.data;

    this.logger.log(
      `📧 Received email: ${subject} from ${from} to ${to.join(', ')}`,
    );

    try {
      // Filter out system emails (noreply, no-reply, etc.)
      const systemEmailPatterns = [
        /^noreply@/i,
        /^no-reply@/i,
        /^donotreply@/i,
        /^donot-reply@/i,
        /^system@/i,
        /^automated@/i,
      ];

      const fromEmail = from.match(/^(.+?)\s*<(.+)>$/)
        ? from.match(/^(.+?)\s*<(.+)>$/)?.[2]?.trim() || from
        : from;

      const isSystemEmail = systemEmailPatterns.some((pattern) =>
        pattern.test(fromEmail),
      );

      if (isSystemEmail) {
        this.logger.log(
          `⚠️ Skipping system email from ${fromEmail} - not storing in database`,
        );
        return;
      }

      // Check if email already processed (idempotency)
      const existingEmail = await this.prisma.inboundEmail.findUnique({
        where: { emailId: email_id },
      });

      if (existingEmail) {
        this.logger.log(`Email ${email_id} already processed, skipping`);
        return;
      }

      // Determine target email address (first recipient)
      const targetEmail = to[0] || to[0];
      if (!targetEmail) {
        this.logger.error('No recipient email address found');
        return;
      }

      // Get email routing configuration
      const routing = await this.prisma.emailRouting.findUnique({
        where: { emailAddress: targetEmail },
      });

      if (!routing || !routing.isActive) {
        this.logger.warn(
          `No active routing found for ${targetEmail}, storing email without processing`,
        );
        // Store email but don't process
        await this.storeEmail(eventData, targetEmail, null);
        return;
      }

      // Match sender to user (if registered)
      const senderUser = await this.prisma.user.findUnique({
        where: { email: fromEmail },
      });

      // Fetch email body content from Resend API
      // Note: Body might not be available immediately, so we retry with delays
      let textBody: string | null = null;
      let htmlBody: string | null = null;

      if (this.resend) {
        const maxRetries = 3;
        const retryDelays = [1000, 2000, 3000]; // 1s, 2s, 3s delays

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              this.logger.log(
                `📥 Retrying fetch email content for ${email_id} (attempt ${attempt + 1}/${maxRetries})...`,
              );
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelays[attempt - 1]),
              );
            } else {
              this.logger.log(`📥 Fetching email content for ${email_id}...`);
            }

            const emailContent =
              await this.resend.emails.receiving.get(email_id);

            if (emailContent.error) {
              this.logger.error(
                `❌ Resend API error fetching email content (attempt ${attempt + 1}): ${emailContent.error.message}`,
              );
              if (attempt === maxRetries - 1) {
                // Last attempt failed, give up
                break;
              }
              continue; // Retry
            }

            if (emailContent.data) {
              textBody = emailContent.data.text || null;
              htmlBody = emailContent.data.html || null;

              if (textBody || htmlBody) {
                // Successfully got body content
                this.logger.log(
                  `✅ Retrieved email content (attempt ${attempt + 1}) - text: ${textBody ? `YES (${textBody.length} chars)` : 'NO'}, html: ${htmlBody ? `YES (${htmlBody.length} chars)` : 'NO'}`,
                );
                break; // Success, exit retry loop
              } else {
                // No body yet, might need to wait
                if (attempt < maxRetries - 1) {
                  this.logger.log(
                    `⏳ Email body not available yet (attempt ${attempt + 1}), will retry...`,
                  );
                  continue; // Retry
                } else {
                  // Last attempt, body still not available
                  this.logger.warn(
                    `⚠️ Email ${email_id} has no text or HTML body after ${maxRetries} attempts. Full response: ${JSON.stringify(emailContent.data, null, 2)}`,
                  );
                }
              }
            } else {
              this.logger.warn(
                `⚠️ Resend API returned no data for email ${email_id} (attempt ${attempt + 1})`,
              );
              if (attempt === maxRetries - 1) {
                break; // Last attempt, give up
              }
            }
          } catch (error) {
            this.logger.error(
              `❌ Exception fetching email content for ${email_id} (attempt ${attempt + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            if (attempt === maxRetries - 1) {
              // Last attempt failed, give up
              this.logger.error(
                `❌ Failed to fetch email body after ${maxRetries} attempts. Continuing without body.`,
              );
            }
            // Continue to next retry or give up
          }
        }
      } else {
        this.logger.warn(
          `⚠️ Cannot fetch email body - Resend client not initialized`,
        );
      }

      // Store email in database with fetched body content
      const inboundEmail = await this.storeEmail(
        eventData,
        targetEmail,
        routing.targetRole,
        senderUser?.id,
        textBody,
        htmlBody,
      );

      // Process based on routing rules
      if (routing.autoCreateTicket && routing.targetRole === UserRole.SUPPORT) {
        await this.createTicketFromEmail(
          inboundEmail.id,
          routing,
          senderUser?.id,
        );
      }

      // Mark as processed
      await this.prisma.inboundEmail.update({
        where: { id: inboundEmail.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(`✅ Email ${email_id} processed successfully`);
    } catch (error) {
      this.logger.error(`Error processing email ${email_id}:`, error);
      // Update email with error
      try {
        await this.prisma.inboundEmail.update({
          where: { emailId: email_id },
          data: {
            processingError:
              error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        this.logger.error('Failed to update email with error', updateError);
      }
      throw error;
    }
  }

  /**
   * Store email in database
   */
  private async storeEmail(
    eventData: any,
    targetEmail: string,
    targetRole: UserRole | null,
    userId?: string | null,
    textBody?: string | null,
    htmlBody?: string | null,
  ) {
    const { email_id, created_at, from, to, cc, bcc, message_id, subject } =
      eventData.data;

    // Use provided body content (fetched from Resend API) or fallback to event data
    const finalTextBody =
      textBody ?? eventData.data.text ?? eventData.data.textBody ?? null;
    const finalHtmlBody =
      htmlBody ?? eventData.data.html ?? eventData.data.htmlBody ?? null;

    // Extract attachments
    const attachments = eventData.data.attachments || [];

    // Parse from name if available
    const fromMatch = from.match(/^(.+?)\s*<(.+)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : null;
    const fromEmail = fromMatch ? fromMatch[2].trim() : from;

    const emailData = {
      emailId: email_id,
      messageId: message_id,
      from: fromEmail,
      fromName: fromName,
      to: targetEmail,
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || '(No Subject)',
      textBody: finalTextBody,
      htmlBody: finalHtmlBody,
      targetRole: targetRole,
      targetEmail: targetEmail,
      userId: userId || null,
      attachments: attachments.length > 0 ? attachments : null,
      receivedAt: new Date(created_at),
    };

    // Log what we're storing
    this.logger.log(
      `💾 Storing email ${email_id} - textBody: ${finalTextBody ? `YES (${finalTextBody.length} chars)` : 'NULL'}, htmlBody: ${finalHtmlBody ? `YES (${finalHtmlBody.length} chars)` : 'NULL'}`,
    );

    return await this.prisma.inboundEmail.create({
      data: emailData,
    });
  }

  /**
   * Create ticket from email
   */
  private async createTicketFromEmail(
    inboundEmailId: string,
    routing: any,
    userId?: string | null,
  ): Promise<void> {
    const email = await this.prisma.inboundEmail.findUnique({
      where: { id: inboundEmailId },
      include: { user: true },
    });

    if (!email) {
      throw new Error('Email not found');
    }

    // If sender is not a registered user, we can't create a ticket
    // (tickets require a user)
    if (!email.userId || !email.user) {
      this.logger.warn(
        `Cannot create ticket for email ${email.id}: sender is not a registered user`,
      );
      return;
    }

    // Create conversation first
    const conversationResult = await this.supportService.createConversation(
      email.userId,
      {
        category: routing.defaultCategory || 'Email Inquiry',
        transactionContext: undefined,
      },
    );

    const conversation = conversationResult.conversation;

    // Check if conversation already has a ticket
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { conversationId: conversation.id },
      include: {
        inboundEmail: true, // Check if ticket already has an inbound email
      },
    });

    // Always add the email as a message to the conversation
    await this.supportService.sendMessage(
      conversation.id,
      {
        content: email.textBody || email.htmlBody || email.subject,
        senderType: 'USER',
        attachments: email.attachments as any,
      },
      email.userId,
    );

    // Only create ticket if it doesn't exist
    let ticket = existingTicket;
    if (!existingTicket) {
      // Create ticket
      const newTicket = await this.supportService.createTicket(email.userId, {
        conversationId: conversation.id,
        category: routing.defaultCategory || 'Email Inquiry',
        title: email.subject,
        priority:
          (routing.defaultPriority as TicketPriority) || TicketPriority.MEDIUM,
      });

      // Auto-assign ticket using round-robin (least busy agent)
      await this.autoAssignTicketToAgent(newTicket.id, routing.targetRole);

      // Fetch the ticket with inboundEmail relation to check if it has one
      ticket = await this.prisma.ticket.findUnique({
        where: { id: newTicket.id },
        include: {
          inboundEmail: true,
        },
      });

      this.logger.log(
        `✅ Created new ticket #${newTicket.ticketNumber} from email ${email.id}`,
      );
    } else {
      this.logger.log(
        `✅ Adding email to existing ticket #${existingTicket.ticketNumber} from conversation ${conversation.id}`,
      );
    }

    // Link email to conversation (always)
    // Only link to ticket if ticket doesn't already have an inbound email
    // (due to unique constraint: one ticket can only have one inboundEmailId)
    const updateData: any = {
      conversationId: conversation.id,
    };

    if (ticket && !ticket.inboundEmail) {
      // Ticket exists but doesn't have an inbound email yet - link this email to it
      updateData.ticketId = ticket.id;
      this.logger.log(
        `✅ Linked email ${email.id} to ticket #${ticket.ticketNumber}`,
      );
    } else if (ticket && ticket.inboundEmail) {
      // Ticket already has an inbound email - just link to conversation
      this.logger.log(
        `ℹ️  Ticket #${ticket.ticketNumber} already has an inbound email. Linking new email to conversation only.`,
      );
    }

    await this.prisma.inboundEmail.update({
      where: { id: inboundEmailId },
      data: updateData,
    });
  }

  /**
   * Auto-assign ticket to agent using round-robin (least busy agent)
   * Based on the same logic used in bot.service.ts
   */
  private async autoAssignTicketToAgent(
    ticketId: string,
    targetRole: UserRole | null,
  ): Promise<void> {
    try {
      // Determine which roles can be assigned based on target role
      let allowedRoles: UserRole[] = [];
      if (targetRole === UserRole.SUPPORT) {
        allowedRoles = [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
      } else if (targetRole === UserRole.ADMIN) {
        allowedRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
      } else {
        // Default: allow all support roles
        allowedRoles = [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
      }

      // Get all agents with the allowed roles
      const agents = await this.prisma.user.findMany({
        where: {
          role: { in: allowedRoles },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (agents.length === 0) {
        this.logger.warn(`No active agents found for role ${targetRole}`);
        return;
      }

      // Get active ticket counts for each agent
      const agentsWithCounts = await Promise.all(
        agents.map(async (agent) => {
          const activeCount = await this.prisma.ticket.count({
            where: {
              assignedAgentId: agent.id,
              status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
          });
          return { ...agent, activeCount };
        }),
      );

      // Sort by active count (ascending) to find least busy agent
      agentsWithCounts.sort((a, b) => a.activeCount - b.activeCount);
      const selectedAgent = agentsWithCounts[0];

      // Assign the ticket
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: selectedAgent.id,
          status: 'IN_PROGRESS',
        },
      });

      // Update conversation status to AGENT_ASSIGNED
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { conversationId: true },
      });

      if (ticket?.conversationId) {
        await this.prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { status: 'AGENT_ASSIGNED' },
        });
      }

      this.logger.log(
        `✅ Ticket ${ticketId} auto-assigned to agent ${selectedAgent.firstName} ${selectedAgent.lastName} (${selectedAgent.id})`,
      );
    } catch (error) {
      this.logger.error('Error auto-assigning ticket to agent', error);
      // Don't throw - ticket creation should still succeed even if assignment fails
    }
  }
}
