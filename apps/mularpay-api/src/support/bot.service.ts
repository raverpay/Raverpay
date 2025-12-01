import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, SenderType } from '@prisma/client';

interface BotResponse {
  content: string;
  metadata?: {
    quickReplies?: Array<{ label: string; value: string }>;
    transactionCard?: any;
    actions?: Array<{ label: string; action: string; data?: any }>;
    ticketNumber?: number;
    assignedAgent?: { id: string; name: string } | null;
  };
}

interface TransactionContext {
  transactionId: string;
  transactionType: string;
  serviceProvider?: string;
  recipientNumber?: string;
  amount?: number;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  // Support categories
  private readonly CATEGORIES = [
    {
      label: 'Airtime & Data Issues',
      value: 'airtime_data',
      subOptions: [
        { label: 'Purchase failed', value: 'purchase_failed' },
        { label: 'Wrong number', value: 'wrong_number' },
        { label: "Didn't receive value", value: 'no_value' },
        { label: 'Need refund', value: 'refund' },
      ],
    },
    {
      label: 'Cable TV Payments',
      value: 'cable_tv',
      subOptions: [
        { label: 'Payment not active', value: 'not_active' },
        { label: 'Wrong decoder', value: 'wrong_decoder' },
        { label: 'Package issues', value: 'package_issues' },
        { label: 'Provider problems', value: 'provider_problems' },
      ],
    },
    {
      label: 'Electricity Bills',
      value: 'electricity',
      subOptions: [
        { label: 'Token not received', value: 'no_token' },
        { label: 'Wrong meter number', value: 'wrong_meter' },
        { label: 'Failed payment', value: 'failed_payment' },
        { label: 'Token issues', value: 'token_issues' },
      ],
    },
    {
      label: 'Wallet Funding',
      value: 'wallet_funding',
      subOptions: [
        { label: "Card payment didn't credit", value: 'card_not_credited' },
        { label: 'Bank transfer not showing', value: 'transfer_not_showing' },
        { label: 'Duplicate payment', value: 'duplicate_payment' },
        { label: 'Paystack issues', value: 'paystack_issues' },
      ],
    },
    {
      label: 'Transaction Problems',
      value: 'transaction',
      subOptions: [
        { label: 'Transaction failed', value: 'failed' },
        { label: 'Wrong amount', value: 'wrong_amount' },
        { label: 'Need receipt', value: 'receipt' },
        { label: 'Status unknown', value: 'unknown_status' },
      ],
    },
    {
      label: 'Account & Security',
      value: 'account_security',
      subOptions: [
        { label: 'KYC verification', value: 'kyc' },
        { label: "Can't login", value: 'login_issue' },
        { label: 'Forgot PIN', value: 'forgot_pin' },
        { label: 'Profile update', value: 'profile_update' },
      ],
    },
    {
      label: 'Virtual Account',
      value: 'virtual_account',
      subOptions: [
        { label: "Can't see account number", value: 'no_account' },
        { label: 'Transfer not reflecting', value: 'transfer_not_reflecting' },
        { label: 'Need new account', value: 'new_account' },
      ],
    },
    {
      label: 'Other Inquiry',
      value: 'other',
      subOptions: [],
    },
  ];

  constructor(private prisma: PrismaService) {}

  async processMessage(
    conversationId: string,
    userMessage: string,
    userId: string,
  ): Promise<BotResponse | null> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) return null;

      const firstName = conversation.user.firstName;
      const lowerMessage = userMessage.toLowerCase().trim();

      // Check for restart flow command
      if (
        lowerMessage === 'restart' ||
        lowerMessage === 'restart_flow' ||
        lowerMessage.includes('start over') ||
        lowerMessage.includes('go back')
      ) {
        return this.getGreetingWithCategories(firstName);
      }

      // Check if user selected a category (exact match on value for quick reply clicks)
      const categoryMatch = this.CATEGORIES.find(
        (cat) =>
          lowerMessage === cat.value ||
          lowerMessage === cat.label.toLowerCase(),
      );

      if (categoryMatch) {
        return this.handleCategorySelection(categoryMatch, firstName);
      }

      // Check for sub-option selection (exact match on value for quick reply clicks)
      for (const category of this.CATEGORIES) {
        const subOption = category.subOptions.find(
          (sub) =>
            lowerMessage === sub.value ||
            lowerMessage === sub.label.toLowerCase(),
        );

        if (subOption) {
          return this.handleSubOptionSelection(
            category,
            subOption,
            firstName,
            conversationId,
          );
        }
      }

      // Check if bot is waiting for transaction ID
      const lastBotMessage = [...conversation.messages]
        .reverse()
        .find((m) => m.senderType === 'BOT');

      if (
        lastBotMessage?.content?.includes('transaction ID') ||
        lastBotMessage?.content?.includes('reference number')
      ) {
        // User is providing transaction ID
        return this.handleTransactionIdProvided(
          conversationId,
          userMessage,
          firstName,
          userId,
        );
      }

      // Check for common keywords
      if (
        this.containsKeywords(userMessage, [
          'agent',
          'human',
          'person',
          'speak',
        ])
      ) {
        return this.escalateToAgent(conversationId, firstName);
      }

      if (
        this.containsKeywords(userMessage, ['refund', 'money back', 'return'])
      ) {
        return this.handleRefundRequest(firstName);
      }

      if (this.containsKeywords(userMessage, ['balance', 'wallet'])) {
        return this.handleBalanceInquiry(userId, firstName);
      }

      // Default - ask for more details or escalate
      return this.getDefaultResponse(firstName);
    } catch (error) {
      this.logger.error('Error processing bot message:', error);
      return null;
    }
  }

  async generateGreeting(
    conversationId: string,
    userId: string,
    transactionContext?: TransactionContext,
  ): Promise<BotResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    const firstName = user?.firstName || 'there';

    if (transactionContext) {
      return this.handleTransactionContext(transactionContext, firstName);
    }

    return this.getGreetingWithCategories(firstName);
  }

  private getGreetingWithCategories(firstName: string): BotResponse {
    return {
      content: `Hi ${firstName}! I'm here to help you with any issues or questions.\n\nWhat can I help you with today?`,
      metadata: {
        quickReplies: this.CATEGORIES.map((cat) => ({
          label: cat.label,
          value: cat.value,
        })),
      },
    };
  }

  private handleTransactionContext(
    context: TransactionContext,
    firstName: string,
  ): BotResponse {
    const typeLabels: Record<string, string> = {
      VTU_AIRTIME: 'Airtime Purchase',
      VTU_DATA: 'Data Purchase',
      VTU_CABLE: 'Cable TV Payment',
      VTU_ELECTRICITY: 'Electricity Payment',
      DEPOSIT: 'Wallet Deposit',
      WITHDRAWAL: 'Withdrawal',
      TRANSFER: 'Transfer',
    };

    const statusLabels: Record<string, string> = {
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      COMPLETED: 'Successful',
      FAILED: 'Failed',
      CANCELLED: 'Cancelled',
      REVERSED: 'Reversed',
    };

    // Map transaction type to relevant category for subcategory filtering
    const transactionTypeToCategoryMap: Record<string, string> = {
      VTU_AIRTIME: 'airtime_data',
      VTU_DATA: 'airtime_data',
      VTU_CABLE: 'cable_tv',
      VTU_ELECTRICITY: 'electricity',
      DEPOSIT: 'wallet_funding',
      WITHDRAWAL: 'transaction',
      TRANSFER: 'transaction',
    };

    const typeLabel =
      typeLabels[context.transactionType] || context.transactionType;
    const statusLabel = statusLabels[context.status || ''] || context.status;
    const statusEmoji =
      context.status === 'COMPLETED'
        ? '✅'
        : context.status === 'FAILED'
          ? '❌'
          : '⏳';

    let content = `Hi ${firstName}!\n\nI can see you need help with your transaction:\n\n`;
    content += `📱 ${typeLabel}${context.serviceProvider ? ` - ${context.serviceProvider}` : ''}\n`;
    content += `💰 Amount: ₦${(context.amount || 0).toLocaleString()}\n`;
    if (context.recipientNumber) {
      content += `📋 Recipient: ${context.recipientNumber}\n`;
    }
    content += `${statusEmoji} Status: ${statusLabel}\n`;

    if (context.errorMessage) {
      content += `⚠️ Error: ${context.errorMessage}\n`;
    }

    content += '\nWhat issue are you experiencing?';

    // Get relevant subcategories based on transaction type
    const relevantCategoryValue =
      transactionTypeToCategoryMap[context.transactionType] || 'transaction';
    const relevantCategory = this.CATEGORIES.find(
      (c) => c.value === relevantCategoryValue,
    );

    // Build quick replies from relevant subcategories
    const quickReplies = relevantCategory?.subOptions.length
      ? [
          ...relevantCategory.subOptions.map((sub) => ({
            label: sub.label,
            value: sub.value,
          })),
          { label: 'Other Issue', value: 'speak_agent' },
          { label: '← See All Categories', value: 'restart_flow' },
        ]
      : [
          { label: 'Request Refund', value: 'refund' },
          { label: 'Check Status', value: 'check_status' },
          { label: 'Speak to Agent', value: 'speak_agent' },
          { label: '← See All Categories', value: 'restart_flow' },
        ];

    return {
      content,
      metadata: {
        transactionCard: context,
        quickReplies,
      },
    };
  }

  private handleCategorySelection(
    category: (typeof this.CATEGORIES)[0],
    firstName: string,
  ): BotResponse {
    if (category.subOptions.length === 0) {
      return {
        content: `I understand you have a question about "${category.label}". Please describe your issue and I'll connect you with an agent who can help.`,
        metadata: {
          quickReplies: [
            { label: 'Speak to Agent', value: 'speak_agent' },
            { label: '← Restart', value: 'restart_flow' },
          ],
        },
      };
    }

    // Add restart option to subcategories
    const quickReplies = [
      ...category.subOptions.map((sub) => ({
        label: sub.label,
        value: sub.value,
      })),
      { label: '← Restart', value: 'restart_flow' },
    ];

    return {
      content: `I see you're having issues with ${category.label}. What specific issue are you experiencing?`,
      metadata: {
        quickReplies,
      },
    };
  }

  private async handleSubOptionSelection(
    category: (typeof this.CATEGORIES)[0],
    subOption: { label: string; value: string },
    firstName: string,
    conversationId: string,
  ): Promise<BotResponse> {
    // Store the selected category and subcategory in conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        category: `${category.value}:${subOption.value}`,
      },
    });

    // Ask for transaction ID before creating ticket and assigning agent
    return {
      content: `Thank you for selecting "${subOption.label}", ${firstName}.\n\nTo help you faster, please provide your transaction ID or reference number.\n\n💡 You can find this in your transaction history or receipt.`,
      metadata: {
        quickReplies: [
          { label: "I don't have it", value: 'no_transaction_id' },
          { label: 'Speak to Agent', value: 'speak_agent' },
          { label: '← Restart', value: 'restart_flow' },
        ],
      },
    };
  }

  private async handleTransactionIdProvided(
    conversationId: string,
    transactionId: string,
    firstName: string,
    userId: string,
  ): Promise<BotResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return this.getDefaultResponse(firstName);
    }

    // Check if user said they don't have transaction ID
    const lowerMessage = transactionId.toLowerCase().trim();
    if (
      lowerMessage === 'no_transaction_id' ||
      lowerMessage.includes("don't have") ||
      lowerMessage.includes('dont have')
    ) {
      return this.createTicketAndAssignAgent(
        conversationId,
        conversation.category || 'General',
        firstName,
        userId,
        null,
      );
    }

    // Validate and look up transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        OR: [
          { id: transactionId.trim() },
          { reference: transactionId.trim() },
        ],
        userId,
      },
    });

    if (transaction) {
      // Found transaction - update conversation context and create ticket
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          transactionId: transaction.id,
          transactionType: transaction.type,
          transactionContext: {
            transactionId: transaction.id,
            reference: transaction.reference,
            type: transaction.type,
            amount: Number(transaction.amount),
            status: transaction.status,
          },
        },
      });

      return this.createTicketAndAssignAgent(
        conversationId,
        conversation.category || 'General',
        firstName,
        userId,
        transaction,
      );
    }

    // Transaction not found - still create ticket but mention it
    return this.createTicketAndAssignAgent(
      conversationId,
      conversation.category || 'General',
      firstName,
      userId,
      null,
      transactionId.trim(),
    );
  }

  private async createTicketAndAssignAgent(
    conversationId: string,
    category: string,
    firstName: string,
    userId: string,
    transaction: any,
    providedTransactionId?: string,
  ): Promise<BotResponse> {
    // Parse category to get main category and subcategory
    const [mainCategory, subCategory] = category.split(':');
    const categoryInfo = this.CATEGORIES.find((c) => c.value === mainCategory);
    const subCategoryInfo = categoryInfo?.subOptions.find(
      (s) => s.value === subCategory,
    );

    const ticketTitle = subCategoryInfo
      ? `${categoryInfo?.label || mainCategory}: ${subCategoryInfo.label}`
      : categoryInfo?.label || mainCategory;

    // Create ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        conversationId,
        userId,
        category: mainCategory,
        title: ticketTitle,
        updatedAt: new Date(),
      },
    });

    // Update conversation status to AWAITING_AGENT
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.AWAITING_AGENT,
      },
    });

    // Auto-assign to an available agent (round-robin based on active chats)
    const assignedAgent = await this.autoAssignAgent(ticket.id);

    let content = `Thank you, ${firstName}! I've created support ticket #${ticket.ticketNumber} for you.\n\n`;

    if (transaction) {
      content += `📋 Transaction Found:\n`;
      content += `• Reference: ${transaction.reference}\n`;
      content += `• Amount: ₦${Number(transaction.amount).toLocaleString()}\n`;
      content += `• Status: ${transaction.status}\n\n`;
    } else if (providedTransactionId) {
      content += `⚠️ I couldn't find a transaction with ID "${providedTransactionId}" in your account. Our agent will help verify this.\n\n`;
    }

    if (assignedAgent) {
      content += `✅ ${assignedAgent.firstName} has been assigned to help you.\n`;
      content += `⏱️ Expected response time: under 5 minutes.\n\n`;
      content += `Feel free to add any additional details while you wait.`;
    } else {
      content += `⏳ A support agent will be assigned shortly.\n`;
      content += `⏱️ Average response time: under 5 minutes.\n\n`;
      content += `Feel free to add any additional details while you wait.`;
    }

    return {
      content,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        assignedAgent: assignedAgent
          ? {
              id: assignedAgent.id,
              name: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
            }
          : null,
      },
    };
  }

  private async autoAssignAgent(ticketId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
  } | null> {
    try {
      // Get all support agents with their active ticket counts
      const agents = await this.prisma.user.findMany({
        where: {
          role: { in: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (agents.length === 0) {
        return null;
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
      const ticket = await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: selectedAgent.id,
          status: 'IN_PROGRESS',
        },
        include: { conversation: true },
      });

      // Update conversation status to AGENT_ASSIGNED
      if (ticket.conversation) {
        await this.prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { status: ConversationStatus.AGENT_ASSIGNED },
        });
      }

      this.logger.log(
        `Ticket ${ticketId} auto-assigned to agent ${selectedAgent.id}`,
      );

      return selectedAgent;
    } catch (error) {
      this.logger.error('Error auto-assigning agent:', error);
      return null;
    }
  }

  private async escalateToAgent(
    conversationId: string,
    firstName: string,
  ): Promise<BotResponse> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.AWAITING_AGENT },
    });

    return {
      content: `No problem, ${firstName}! I'm connecting you with a support agent now.\n\nPlease hold on, someone will be with you shortly. Average wait time is under 5 minutes.`,
    };
  }

  private handleRefundRequest(firstName: string): BotResponse {
    return {
      content: `I understand you're looking for a refund, ${firstName}.\n\nTo process your refund request, I'll need to connect you with a support agent who can verify the transaction and initiate the refund.\n\nWould you like me to do that?`,
      metadata: {
        quickReplies: [
          { label: 'Yes, connect me', value: 'speak_agent' },
          { label: 'No, I have another question', value: 'other' },
        ],
      },
    };
  }

  private async handleBalanceInquiry(
    userId: string,
    firstName: string,
  ): Promise<BotResponse> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'NAIRA',
      },
    });

    if (wallet) {
      return {
        content: `Hi ${firstName}! Your current wallet balance is ₦${Number(wallet.balance).toLocaleString()}.\n\nIs there anything else I can help you with?`,
        metadata: {
          quickReplies: [
            { label: 'Fund my wallet', value: 'fund_wallet' },
            { label: 'View transactions', value: 'transactions' },
            { label: 'Other question', value: 'other' },
          ],
        },
      };
    }

    return {
      content: `I couldn't retrieve your wallet information at the moment, ${firstName}. Please try again or speak to an agent for assistance.`,
      metadata: {
        quickReplies: [{ label: 'Speak to Agent', value: 'speak_agent' }],
      },
    };
  }

  private getDefaultResponse(firstName: string): BotResponse {
    return {
      content: `Thanks for the information, ${firstName}. To better assist you, could you please select one of the options below or provide more details about your issue?`,
      metadata: {
        quickReplies: [
          ...this.CATEGORIES.slice(0, 4).map((cat) => ({
            label: cat.label,
            value: cat.value,
          })),
          { label: 'Speak to Agent', value: 'speak_agent' },
        ],
      },
    };
  }

  private containsKeywords(message: string, keywords: string[]): boolean {
    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
  }
}
