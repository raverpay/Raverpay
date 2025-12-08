import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface PaystackInitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    paid_at: string;
    fees: number;
    channel: string;
    currency: string;
    metadata?: unknown;
  };
}

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface PaystackRecipient {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string | null;
      bank_code: string;
      bank_name: string;
    };
  };
}

interface PaystackResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

interface PaystackVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    bank: {
      name: string;
      id: number;
      slug: string;
    };
    account_name: string;
    account_number: string;
    assigned: boolean;
    currency: string;
    metadata: unknown;
    active: boolean;
    id: number;
    created_at: string;
    updated_at: string;
    assignment: {
      integration: number;
      assignee_id: number;
      assignee_type: string;
      expired: boolean;
      account_type: string;
      assigned_at: string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      risk_action: string;
    };
  };
}

interface PaystackBankResponse {
  status: boolean;
  message: string;
  data: Array<{
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    is_deleted: boolean;
    country: string;
    currency: string;
    type: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface PaystackCreateCustomerResponse {
  status: boolean;
  message: string;
  data: {
    email: string;
    integration: number;
    domain: string;
    customer_code: string;
    id: number;
    identified: boolean;
    identifications: unknown;
    createdAt: string;
    updatedAt: string;
  };
}

interface PaystackValidateCustomerResponse {
  status: boolean;
  message: string;
}

interface PaystackDVAProvidersResponse {
  status: boolean;
  message: string;
  data: Array<{
    provider_slug: string;
    bank_id: number;
    bank_name: string;
    id: number;
  }>;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    callbackUrl?: string,
  ): Promise<PaystackInitializePaymentResponse['data']> {
    try {
      // Amount in kobo (multiply by 100)
      const amountInKobo = amount * 100;

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          reference,
          callback_url: callbackUrl,
        }),
      });

      const data = (await response.json()) as PaystackInitializePaymentResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to initialize payment', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(
    reference: string,
  ): Promise<PaystackVerifyPaymentResponse['data']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = (await response.json()) as PaystackVerifyPaymentResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to verify payment', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Create a transfer recipient
   */
  private async createRecipient(
    accountName: string,
    accountNumber: string,
    bankCode: string,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      });

      const data = (await response.json()) as PaystackRecipient;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data.recipient_code;
    } catch (error) {
      this.logger.error('Failed to create recipient', error);
      throw new BadRequestException('Failed to create recipient');
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason: string,
    reference: string,
  ): Promise<PaystackTransferResponse['data']> {
    try {
      // Amount in kobo
      const amountInKobo = amount * 100;

      const response = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amountInKobo,
          recipient: recipientCode,
          reason,
          reference,
        }),
      });

      const data = (await response.json()) as PaystackTransferResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to initiate transfer', error);
      throw new BadRequestException('Failed to initiate transfer');
    }
  }

  /**
   * Process withdrawal (create recipient + initiate transfer)
   */
  async processWithdrawal(
    amount: number,
    accountName: string,
    accountNumber: string,
    bankCode: string,
    reason: string,
    reference: string,
  ): Promise<PaystackTransferResponse['data']> {
    // Create recipient
    const recipientCode = await this.createRecipient(
      accountName,
      accountNumber,
      bankCode,
    );

    // Initiate transfer
    return this.initiateTransfer(amount, recipientCode, reason, reference);
  }

  /**
   * Resolve account number
   */
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<PaystackResolveAccountResponse['data']> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = (await response.json()) as PaystackResolveAccountResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to resolve account number', error);
      throw new BadRequestException('Failed to resolve account number');
    }
  }

  /**
   * Get list of Nigerian banks
   */
  async getBanks(): Promise<PaystackBankResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/bank?currency=NGN`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = (await response.json()) as PaystackBankResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to get banks', error);
      throw new BadRequestException('Failed to get banks');
    }
  }

  /**
   * Create a customer on Paystack
   */
  async createCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
  ): Promise<{ customer_code: string; customer_id: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      });

      const data = (await response.json()) as PaystackCreateCustomerResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return {
        customer_code: data.data.customer_code,
        customer_id: data.data.id,
      };
    } catch (error) {
      this.logger.error('Failed to create customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Validate customer identity (BVN validation for Financial Services)
   * This is required for Nigerian Financial Services businesses
   */
  async validateCustomer(
    customerCode: string,
    firstName: string,
    lastName: string,
    accountNumber: string,
    bvn: string,
    bankCode: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/customer/${customerCode}/identification`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: 'NG',
            type: 'bank_account',
            account_number: accountNumber,
            bvn: bvn,
            bank_code: bankCode,
            first_name: firstName,
            last_name: lastName,
          }),
        },
      );

      const data = (await response.json()) as PaystackValidateCustomerResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      // Returns 202 Accepted - validation happens asynchronously
      // Must listen to customeridentification.success/failed webhook
      this.logger.log(
        `Customer validation initiated for customer: ${customerCode}`,
      );
    } catch (error) {
      this.logger.error('Failed to validate customer', error);
      throw new BadRequestException('Failed to validate customer');
    }
  }

  /**
   * Create dedicated virtual account for a customer
   * Customer must be created first using createCustomer()
   * For Financial Services, customer must be validated first using validateCustomer()
   */
  async createDedicatedVirtualAccount(
    customerCode: string,
    preferredBank: string = 'wema-bank',
  ): Promise<PaystackVirtualAccountResponse['data']> {
    try {
      const response = await fetch(`${this.baseUrl}/dedicated_account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerCode,
          preferred_bank: preferredBank,
        }),
      });

      const data = (await response.json()) as PaystackVirtualAccountResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to create dedicated virtual account', error);
      throw new BadRequestException(
        'Failed to create dedicated virtual account',
      );
    }
  }

  /**
   * Get available bank providers for dedicated virtual accounts
   */
  async getDedicatedAccountProviders(): Promise<
    PaystackDVAProvidersResponse['data']
  > {
    try {
      const response = await fetch(
        `${this.baseUrl}/dedicated_account/available_providers`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = (await response.json()) as PaystackDVAProvidersResponse;

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Failed to get DVA providers', error);
      throw new BadRequestException('Failed to get DVA providers');
    }
  }

  /**
   * Requery dedicated virtual account for pending transactions
   * Rate limit: Once every 10 minutes per account
   */
  async requeryDedicatedAccount(
    accountNumber: string,
    providerSlug: string,
    date?: string,
  ): Promise<void> {
    try {
      const queryParams = new URLSearchParams({
        account_number: accountNumber,
        provider_slug: providerSlug,
        ...(date && { date }),
      });

      const response = await fetch(
        `${this.baseUrl}/dedicated_account/requery?${queryParams}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = (await response.json()) as {
        status: boolean;
        message: string;
      };

      if (!data.status) {
        throw new BadRequestException(data.message);
      }

      this.logger.log(
        `Requery initiated for account: ${accountNumber}. Will send webhook if transactions found.`,
      );
    } catch (error) {
      this.logger.error('Failed to requery dedicated account', error);
      throw new BadRequestException('Failed to requery dedicated account');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');

    return hash === signature;
  }
}
