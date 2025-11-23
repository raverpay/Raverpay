import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, SenderType } from '@prisma/client';

interface BotResponse {
  content: string;
  metadata?: {
    quickReplies?: Array<{ label: string; value: string }>;
    transactionCard?: any;
    actions?: Array<{ label: string; action: string; data?: any }>;
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
            take: 10,
          },
        },
      });

      if (!conversation) return null;

      const messageCount = conversation.messages.length;
      const firstName = conversation.user.firstName;

      // If this is a new conversation (first user message after bot greeting)
      if (messageCount <= 2) {
        // Check if there's transaction context
        if (conversation.transactionContext) {
          return this.handleTransactionContext(
            conversation.transactionContext as unknown as TransactionContext,
            firstName,
          );
        }

        // First user message - show category options
        return this.getGreetingWithCategories(firstName);
      }

      // Check if user selected a category
      const categoryMatch = this.CATEGORIES.find(
        (cat) =>
          userMessage.toLowerCase().includes(cat.value) ||
          userMessage.toLowerCase().includes(cat.label.toLowerCase()),
      );

      if (categoryMatch) {
        return this.handleCategorySelection(categoryMatch, firstName);
      }

      // Check for sub-option selection
      for (const category of this.CATEGORIES) {
        const subOption = category.subOptions.find(
          (sub) =>
            userMessage.toLowerCase().includes(sub.value) ||
            userMessage.toLowerCase().includes(sub.label.toLowerCase()),
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

      // Check for common keywords
      if (this.containsKeywords(userMessage, ['agent', 'human', 'person', 'speak'])) {
        return this.escalateToAgent(conversationId, firstName);
      }

      if (this.containsKeywords(userMessage, ['refund', 'money back', 'return'])) {
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

    const typeLabel = typeLabels[context.transactionType] || context.transactionType;
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

    content += '\nHow would you like me to help?';

    const actions: Array<{ label: string; action: string; data?: any }> = [];

    if (context.status === 'FAILED') {
      actions.push(
        { label: 'Request Refund', action: 'refund', data: context },
        { label: 'Retry Transaction', action: 'retry', data: context },
      );
    }

    actions.push({ label: 'Speak to Agent', action: 'escalate' });

    return {
      content,
      metadata: {
        transactionCard: context,
        actions,
        quickReplies: [
          { label: 'Request Refund', value: 'refund' },
          { label: 'Check Status', value: 'check_status' },
          { label: 'Speak to Agent', value: 'speak_agent' },
        ],
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
          quickReplies: [{ label: 'Speak to Agent', value: 'speak_agent' }],
        },
      };
    }

    return {
      content: `I see you're having issues with ${category.label}. What specific issue are you experiencing?`,
      metadata: {
        quickReplies: category.subOptions.map((sub) => ({
          label: sub.label,
          value: sub.value,
        })),
      },
    };
  }

  private async handleSubOptionSelection(
    category: (typeof this.CATEGORIES)[0],
    subOption: { label: string; value: string },
    firstName: string,
    conversationId: string,
  ): Promise<BotResponse> {
    // Create ticket for this issue
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation && conversation.userId) {
      // Update conversation status
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: ConversationStatus.AWAITING_AGENT,
          category: category.value,
        },
      });

      // Create ticket
      await this.prisma.ticket.create({
        data: {
          conversationId,
          userId: conversation.userId,
          category: category.value,
          title: `${category.label}: ${subOption.label}`,
          updatedAt: new Date(),
        },
      });
    }

    return {
      content: `Thank you for the details, ${firstName}. I've created a support ticket for your "${subOption.label}" issue.\n\nA support agent will be with you shortly. Average response time is under 5 minutes.\n\nIs there anything else you'd like to add while you wait?`,
      metadata: {
        quickReplies: [
          { label: 'Add more details', value: 'add_details' },
          { label: 'Upload screenshot', value: 'upload' },
        ],
      },
    };
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
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
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
