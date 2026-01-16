import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Custom exception to carry VTpass error details
export class VTPassException extends BadRequestException {
  constructor(
    message: string,
    public readonly vtpassCode?: string,
    public readonly vtpassResponseDescription?: string,
  ) {
    super(message);
  }
}

interface VTPassConfig {
  apiKey: string;
  secretKey: string;
  publicKey: string;
  baseUrl: string;
  webhookSecret: string;
}

interface VTPassResponse<T = unknown> {
  code?: string; // POST endpoints use 'code'
  response_description: string; // GET endpoints use this as status code
  content: T;
  requestId?: string;
  amount?: string | number;
  transaction_date?: {
    date: string;
  };
  purchased_code?: string;
  // Electricity-specific fields (prepaid)
  token?: string;
  units?: string;
  tokenAmount?: number;
  exchangeReference?: string;
  resetToken?: string;
  configureToken?: string;
  tariff?: string;
  taxAmount?: number;
  debtAmount?: number;
  customerName?: string;
  customerAddress?: string;
  meterNumber?: string;
  // Electricity-specific fields (postpaid)
  utilityName?: string;
  balance?: number;
}

export interface ServiceVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

interface VerifyCustomerResponse {
  Customer_Name: string;
  Status?: string;
  Due_Date?: string;
  Customer_Number?: string;
  Customer_Type?: string;
  Address?: string;
  Minimum_Purchase_Amount?: string;
  // Electricity-specific fields
  Meter_Number?: string;
  Customer_Arrears?: string;
  Min_Purchase_Amount?: string;
  Customer_Account_Type?: string;
  Meter_Type?: string;
  Can_Vend?: string;
  Business_Unit?: string;
  WrongBillersCode?: boolean;
}

interface TransactionContent {
  transactions: {
    status: string;
    product_name: string;
    unique_element: string;
    unit_price: number;
    quantity: number;
    service_verification: unknown;
    channel: string;
    commission: number;
    total_amount: number;
    discount: unknown;
    type: string;
    email: unknown;
    phone: string;
    name: unknown;
    convinience_fee: number;
    amount: number;
    platform: string;
    method: string;
    transactionId: string;
  };
}

@Injectable()
export class VTPassService {
  private readonly logger = new Logger(VTPassService.name);
  private readonly config: VTPassConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiKey: this.configService.get<string>('VTPASS_API_KEY') || '',
      secretKey: this.configService.get<string>('VTPASS_SECRET_KEY') || '',
      publicKey: this.configService.get<string>('VTPASS_PUBLIC_KEY') || '',
      baseUrl:
        this.configService.get<string>('VTPASS_BASE_URL') ||
        'https://sandbox.vtpass.com/api',
      webhookSecret:
        this.configService.get<string>('VTPASS_WEBHOOK_SECRET') || '',
    };

    // Validate configuration
    if (!this.config.apiKey || !this.config.secretKey) {
      this.logger.warn(
        'VTPass API keys not configured. VTU services will not work.',
      );
    }
  }

  private getHeaders() {
    return {
      'api-key': this.config.apiKey,
      'secret-key': this.config.secretKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Maps VTpass response codes to user-friendly error messages
   * Based on VTpass API documentation
   */
  private getVTPassErrorMessage(
    code: string,
    responseDescription: string,
  ): string {
    const codeMap: Record<string, string> = {
      '000': 'Transaction processed successfully',
      '001': 'Transaction query',
      '010': 'Variation code does not exist',
      '011': 'Invalid arguments',
      '012': 'Product does not exist',
      '013': 'Below minimum amount allowed',
      '014': 'Request ID already exists',
      '015': 'Invalid request ID',
      '016': 'Transaction failed',
      '017': 'Above maximum amount allowed',
      '018': 'Low wallet balance on provider account',
      '019': 'Likely duplicate transaction',
      '020': 'Biller confirmed',
      '021': 'Account locked',
      '022': 'Account suspended',
      '023': 'API access not enabled for user',
      '024': 'Account inactive',
      '025': 'Recipient bank invalid',
      '026': 'Recipient account could not be verified',
      '027': 'IP not whitelisted, contact support',
      '028': 'Product is not whitelisted on your account',
      '030': 'Biller not reachable at this time',
      '031': 'Below minimum quantity allowed',
      '032': 'Above minimum quantity allowed',
      '034': 'Service suspended',
      '035': 'Service inactive',
      '040': 'Transaction reversal',
      '044': 'Transaction resolved',
      '083': 'System error',
      '085': 'Improper request ID format',
      '087': 'Invalid credentials',
      '089': 'Request is processing, please wait',
      '091': 'Transaction not processed',
      '099': 'Transaction is processing',
    };

    // Return mapped message if available, otherwise use response description
    return (
      codeMap[code] ||
      responseDescription ||
      `VTPass API error (Code: ${code})`
    );
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: unknown,
  ): Promise<VTPassResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;

    this.logger.log(`[VTPass] ${method} ${endpoint}`);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = (await response.json()) as VTPassResponse<T>;

      // Check for success: POST endpoints use 'code', GET endpoints use 'response_description'
      const statusCode = result.code || result.response_description;
      if (statusCode !== '000') {
        const errorCode = result.code || statusCode;
        const errorMessage = this.getVTPassErrorMessage(
          errorCode,
          result.response_description || 'VTPass API error',
        );
        this.logger.error(
          `[VTPass] API error (Code: ${errorCode}): ${errorMessage}`,
        );
        throw new VTPassException(
          errorMessage,
          errorCode,
          result.response_description,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`[VTPass] Request failed:`, error);
      throw new BadRequestException(
        'Service provider temporarily unavailable. Please try again.',
      );
    }
  }

  // ==================== Product Catalog ====================

  async getServiceVariations(serviceId: string): Promise<ServiceVariation[]> {
    const response = await this.makeRequest<{
      variations: ServiceVariation[];
    }>(`/service-variations?serviceID=${serviceId}`);

    return response.content.variations || [];
  }

  getAirtimeProducts() {
    return [
      { code: 'mtn', name: 'MTN', logo: '🟡' },
      { code: 'glo', name: 'GLO', logo: '🟢' },
      { code: 'airtel', name: 'AIRTEL', logo: '🔴' },
      { code: '9mobile', name: '9MOBILE', logo: '🟢' },
    ];
  }

  async getDataProducts(network: string): Promise<ServiceVariation[]> {
    const serviceId = `${this.mapNetworkToServiceId(network)}-data`;
    return this.getServiceVariations(serviceId);
  }

  async getCableTVProducts(provider: string): Promise<ServiceVariation[]> {
    const serviceId = provider.toLowerCase();
    return this.getServiceVariations(serviceId);
  }

  getElectricityDISCOs() {
    return [
      {
        code: 'ikeja-electric',
        name: 'Ikeja Electric (IKEDC)',
        region: 'Lagos',
      },
      { code: 'eko-electric', name: 'Eko Electric (EKEDC)', region: 'Lagos' },
      {
        code: 'abuja-electric',
        name: 'Abuja Electric (AEDC)',
        region: 'Abuja',
      },
      { code: 'kano-electric', name: 'Kano Electric (KEDCO)', region: 'Kano' },
      {
        code: 'portharcourt-electric',
        name: 'Port Harcourt Electric (PHED)',
        region: 'Port Harcourt',
      },
      { code: 'jos-electric', name: 'Jos Electric (JED)', region: 'Jos' },
      {
        code: 'ibadan-electric',
        name: 'Ibadan Electric (IBEDC)',
        region: 'Ibadan',
      },
      {
        code: 'enugu-electric',
        name: 'Enugu Electric (EEDC)',
        region: 'Enugu',
      },
      {
        code: 'benin-electric',
        name: 'Benin Electric (BEDC)',
        region: 'Benin',
      },
    ];
  }

  // ==================== Validation ====================

  async verifyCustomer(
    billersCode: string,
    serviceId: string,
    additionalParams?: Record<string, unknown>,
  ): Promise<VerifyCustomerResponse> {
    const response = await this.makeRequest<VerifyCustomerResponse>(
      '/merchant-verify',
      'POST',
      {
        billersCode,
        serviceID: serviceId,
        ...additionalParams,
      },
    );

    return response.content;
  }

  async verifySmartcard(smartcard: string, provider: string) {
    const serviceId = provider.toLowerCase();
    return this.verifyCustomer(smartcard, serviceId);
  }

  async verifyMeterNumber(
    meterNumber: string,
    disco: string,
    meterType: 'prepaid' | 'postpaid',
  ) {
    // Per VTPass docs: serviceID should be just the disco name (e.g., "ikeja-electric")
    // and type should be passed as a separate parameter
    const serviceId = disco.toLowerCase();
    return this.verifyCustomer(meterNumber, serviceId, {
      type: meterType,
    });
  }

  // ==================== Service ID Mapping ====================

  private mapNetworkToServiceId(network: string): string {
    const mapping: Record<string, string> = {
      mtn: 'mtn',
      glo: 'glo',
      airtel: 'airtel',
      '9mobile': 'etisalat', // VTPass uses old brand name
    };
    return mapping[network.toLowerCase()] || network.toLowerCase();
  }

  // ==================== Purchases ====================

  async purchaseAirtime(data: {
    network: string;
    phone: string;
    amount: number;
    reference: string;
  }) {
    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID: this.mapNetworkToServiceId(data.network),
        amount: data.amount,
        phone: data.phone,
      },
    );

    // Determine status based on transaction status
    // When code is "000", check transactions.status:
    // - "delivered" → success
    // - "initiated" or "pending" → pending (should requery)
    // - Otherwise → failed
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
    };
  }

  async purchaseData(data: {
    network: string;
    phone: string;
    productCode: string;
    amount: number;
    reference: string;
    isSME?: boolean;
  }) {
    // Determine serviceID based on network and SME flag
    let serviceID: string;
    if (data.isSME && data.network.toLowerCase() === 'glo') {
      serviceID = 'glo-sme-data';
    } else {
      serviceID = `${this.mapNetworkToServiceId(data.network)}-data`;
    }

    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID,
        billersCode: data.phone,
        variation_code: data.productCode,
        amount: data.amount,
        phone: data.phone,
      },
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
    };
  }

  async payCableTV(data: {
    provider: string;
    smartcard: string;
    productCode?: string;
    subscriptionType: 'change' | 'renew';
    quantity?: number;
    amount: number;
    phone: string;
    reference: string;
  }) {
    // Build payload based on provider and subscription type
    const payload: Record<string, unknown> = {
      request_id: data.reference,
      serviceID: data.provider.toLowerCase(),
      billersCode: data.smartcard,
      phone: data.phone,
    };

    // For DSTV and GOTV: add subscription_type and optional quantity
    if (
      data.provider.toLowerCase() === 'dstv' ||
      data.provider.toLowerCase() === 'gotv'
    ) {
      payload.subscription_type = data.subscriptionType;

      if (data.subscriptionType === 'change') {
        // For "change": variation_code is required, amount is optional
        if (!data.productCode) {
          throw new Error(
            'Product code is required for subscription type "change"',
          );
        }
        payload.variation_code = data.productCode;
        if (data.amount) {
          payload.amount = data.amount;
        }
        if (data.quantity) {
          payload.quantity = data.quantity;
        }
      } else {
        // For "renew": amount is typically required (from verification), no variation_code
        payload.amount = data.amount;
      }
    } else {
      // For Startimes: no subscription_type, variation_code required
      payload.variation_code = data.productCode;
      if (data.amount) {
        payload.amount = data.amount;
      }
    }

    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      payload,
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
    };
  }

  async payShowmax(data: {
    phoneNumber: string;
    productCode: string;
    amount: number;
    reference: string;
  }) {
    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID: 'showmax',
        billersCode: data.phoneNumber, // Showmax uses phone number
        variation_code: data.productCode,
        amount: data.amount,
      },
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
      voucher: response.purchased_code, // Showmax returns voucher code
    };
  }

  async payElectricity(data: {
    disco: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
    amount: number;
    phone: string;
    reference: string;
  }) {
    // Per VTPass docs: serviceID should be just the disco name (e.g., "ikeja-electric")
    // variation_code should be the meter type ("prepaid" or "postpaid")
    const serviceId = data.disco.toLowerCase();

    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID: serviceId,
        billersCode: data.meterNumber,
        variation_code: data.meterType,
        amount: data.amount,
        phone: data.phone,
      },
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
      // Electricity-specific fields
      meterToken: response.purchased_code || response.token,
      units: response.units,
      tokenAmount: response.tokenAmount,
      tariff: response.tariff,
      customerName: response.customerName,
      customerAddress: response.customerAddress,
      meterNumber: response.meterNumber,
      // Postpaid-specific
      utilityName: response.utilityName,
      exchangeReference: response.exchangeReference,
      balance: response.balance,
    };
  }

  // ==================== Transaction Query ====================

  async queryTransaction(reference: string) {
    const response = await this.makeRequest<TransactionContent>(
      '/requery',
      'POST',
      {
        request_id: reference,
      },
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      amount: response.content.transactions.amount,
    };
  }

  // ==================== SME Data ====================

  async getSMEDataProducts(network: string): Promise<ServiceVariation[]> {
    // Currently only GLO supports SME data in VTPass
    if (network.toLowerCase() !== 'glo') {
      return [];
    }
    const serviceId = 'glo-sme-data';
    return this.getServiceVariations(serviceId);
  }

  // ==================== International Airtime/Data ====================

  async getInternationalCountries() {
    const response = await this.makeRequest<{
      countries: Array<{
        code: string;
        flag: string;
        name: string;
        currency: string;
        prefix: string;
      }>;
    }>('/get-international-airtime-countries');

    return response.content.countries;
  }

  async getInternationalProductTypes(countryCode: string) {
    const response = await this.makeRequest<
      Array<{
        product_type_id: number;
        name: string;
      }>
    >(`/get-international-airtime-product-types?code=${countryCode}`);

    return response.content;
  }

  async getInternationalOperators(countryCode: string, productTypeId: string) {
    const response = await this.makeRequest<
      Array<{
        operator_id: string;
        name: string;
        operator_image: string;
      }>
    >(
      `/get-international-airtime-operators?code=${countryCode}&product_type_id=${productTypeId}`,
    );

    return response.content;
  }

  async getInternationalVariations(
    operatorId: string,
    productTypeId: string,
  ): Promise<ServiceVariation[]> {
    const response = await this.makeRequest<{
      variations: ServiceVariation[];
    }>(
      `/service-variations?serviceID=foreign-airtime&operator_id=${operatorId}&product_type_id=${productTypeId}`,
    );

    return response.content.variations || [];
  }

  async purchaseInternationalAirtime(data: {
    billersCode: string;
    variationCode: string;
    operatorId: string;
    countryCode: string;
    productTypeId: string;
    email: string;
    phone: string;
    reference: string;
    amount?: number;
  }) {
    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID: 'foreign-airtime',
        billersCode: data.billersCode,
        variation_code: data.variationCode,
        operator_id: data.operatorId,
        country_code: data.countryCode,
        product_type_id: data.productTypeId,
        email: data.email,
        phone: data.phone,
        amount: data.amount,
      },
    );

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: data.reference,
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
    };
  }

  // ==================== Education Services ====================

  // Service ID mapping to handle VTPass typo
  private readonly EDUCATION_SERVICE_MAP: Record<string, string> = {
    jamb: 'jamb',
    'waec-registration': 'waec-registraion', // VTPass has typo - map to their actual ID
    waec: 'waec',
  };

  async getJAMBVariations(): Promise<ServiceVariation[]> {
    return this.getServiceVariations('jamb');
  }

  async getWAECRegistrationVariations(): Promise<ServiceVariation[]> {
    return this.getServiceVariations('waec-registration');
  }

  async getWAECResultVariations(): Promise<ServiceVariation[]> {
    return this.getServiceVariations('waec');
  }

  async verifyJAMBProfile(profileId: string, variationCode: string) {
    return this.verifyCustomer(profileId, 'jamb', {
      variation_code: variationCode,
    });
  }

  async purchaseJAMBPin(data: {
    profileId: string;
    variationCode: string;
    phone: string;
    reference: string;
  }) {
    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      {
        request_id: data.reference,
        serviceID: 'jamb',
        billersCode: data.profileId,
        variation_code: data.variationCode,
        phone: data.phone,
      },
    );

    // Parse PIN from exchangeRef field (format: "Pin : 3678251321392432")
    const exchangeRef =
      (response as any).exchangeReference ||
      (response as any).purchased_code ||
      '';
    const pinMatch = exchangeRef.match(/Pin\s*:\s*(\d+)/i);
    const extractedPin = pinMatch ? pinMatch[1] : exchangeRef;

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: extractedPin, // Extracted PIN
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
      fullResponse: response, // Store full response for providerResponse
    };
  }

  async purchaseWAECRegistration(data: {
    phone: string;
    variationCode: string;
    reference: string;
    quantity?: number;
  }) {
    const payload: Record<string, unknown> = {
      request_id: data.reference,
      serviceID: this.EDUCATION_SERVICE_MAP['waec-registration'], // Use mapped ID with typo
      billersCode: data.phone,
      variation_code: data.variationCode, // Use provided variation code
      phone: data.phone,
    };

    if (data.quantity && data.quantity > 1) {
      payload.quantity = data.quantity;
    }

    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      payload,
    );

    // Parse tokens from response (tokens array)
    const tokens = (response as any).tokens || [];
    const firstToken = tokens.length > 0 ? tokens[0] : null;

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: firstToken, // First token for quick access
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
      fullResponse: response, // Store full response with all tokens
    };
  }

  async purchaseWAECResult(data: {
    phone: string;
    variationCode: string;
    reference: string;
    quantity?: number;
  }) {
    const payload: Record<string, unknown> = {
      request_id: data.reference,
      serviceID: 'waec',
      billersCode: data.phone,
      variation_code: data.variationCode,
      phone: data.phone,
    };

    if (data.quantity && data.quantity > 1) {
      payload.quantity = data.quantity;
    }

    const response = await this.makeRequest<TransactionContent>(
      '/pay',
      'POST',
      payload,
    );

    // Parse cards from response (cards array with Serial and Pin)
    const cards = (response as any).cards || [];
    const serializedCards =
      cards.length > 0 ? JSON.stringify(cards) : undefined;

    // Determine status based on transaction status
    const transactionStatus = response.content.transactions.status;
    let status: 'success' | 'pending' | 'failed';
    if (transactionStatus === 'delivered') {
      status = 'success';
    } else if (
      transactionStatus === 'initiated' ||
      transactionStatus === 'pending'
    ) {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      status,
      transactionId: response.content.transactions.transactionId,
      token: serializedCards, // Serialized cards array
      productName: response.content.transactions.product_name,
      amount: response.content.transactions.amount,
      commission: response.content.transactions.commission,
      fullResponse: response, // Store full response with all cards
    };
  }

  // ==================== Wallet Balance ====================

  async getBalance(): Promise<{ balance: number }> {
    const url = `${this.config.baseUrl}/balance`;

    this.logger.log(`[VTPass] GET /balance`);

    try {
      // GET requests require api-key and public-key (not secret-key)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-key': this.config.apiKey,
          'public-key': this.config.publicKey,
          'Content-Type': 'application/json',
        },
      });

      const result = (await response.json()) as {
        code: string | number;
        contents?: { balance: number };
      };

      // VTPass balance endpoint returns code: 1 for success (not "000")
      if (result.code !== 1 && result.code !== '1') {
        this.logger.error(
          `[VTPass] Balance API error: ${JSON.stringify(result)}`,
        );
        throw new BadRequestException('Failed to retrieve VTPass balance');
      }

      return {
        balance: result.contents?.balance || 0,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`[VTPass] Balance request failed:`, error);
      throw new BadRequestException(
        'Failed to retrieve VTPass balance. Please try again.',
      );
    }
  }

  // ==================== Webhook Verification ====================

  verifyWebhook(signature: string, payload: unknown): boolean {
    if (!signature || !this.config.webhookSecret) {
      return false;
    }

    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}
