import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VTPassService } from './services/vtpass.service';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import {
  PurchaseAirtimeDto,
  PurchaseDataDto,
  PayCableTVDto,
  PayShowmaxDto,
  PayElectricityDto,
  GetOrdersDto,
  PurchaseInternationalAirtimeDto,
} from './dto';
import { VTUServiceType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface VTPassPurchaseResult {
  status: string;
  transactionId: string;
  token?: string;
  productName?: string;
  amount?: number;
  commission?: number;
  // Electricity-specific fields
  meterToken?: string;
  units?: string;
  tokenAmount?: number;
  tariff?: string;
  customerName?: string;
  customerAddress?: string;
  meterNumber?: string;
  utilityName?: string;
  exchangeReference?: string;
  balance?: number;
  [key: string]: unknown;
}

@Injectable()
export class VTUService {
  private readonly logger = new Logger(VTUService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vtpassService: VTPassService,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  // ==================== Product Catalog ====================

  getAirtimeProviders() {
    return this.vtpassService.getAirtimeProducts();
  }

  async getDataPlans(network: string) {
    return this.vtpassService.getDataProducts(network);
  }

  async getSMEDataPlans(network: string) {
    return this.vtpassService.getSMEDataProducts(network);
  }

  async getCableTVPlans(provider: string) {
    return this.vtpassService.getCableTVProducts(provider);
  }

  getElectricityProviders() {
    return this.vtpassService.getElectricityDISCOs();
  }

  // ==================== International Airtime/Data Catalog ====================

  async getInternationalCountries() {
    return this.vtpassService.getInternationalCountries();
  }

  async getInternationalProductTypes(countryCode: string) {
    return this.vtpassService.getInternationalProductTypes(countryCode);
  }

  async getInternationalOperators(countryCode: string, productTypeId: string) {
    return this.vtpassService.getInternationalOperators(
      countryCode,
      productTypeId,
    );
  }

  async getInternationalVariations(operatorId: string, productTypeId: string) {
    return this.vtpassService.getInternationalVariations(
      operatorId,
      productTypeId,
    );
  }

  // ==================== Validation ====================

  validatePhone(phone: string): boolean {
    const regex = /^0[7-9][0-1]\d{8}$/;
    if (!regex.test(phone)) {
      throw new BadRequestException('Invalid Nigerian phone number');
    }
    return true;
  }

  async validateSmartcard(smartcard: string, provider: string) {
    try {
      const result = await this.vtpassService.verifySmartcard(
        smartcard,
        provider,
      );

      return {
        valid: true,
        customerName: result.Customer_Name,
        status: result.Status,
        dueDate: result.Due_Date,
      };
    } catch {
      throw new BadRequestException(
        'Invalid smartcard number or customer not found',
      );
    }
  }

  async validateMeterNumber(
    meterNumber: string,
    disco: string,
    meterType: 'prepaid' | 'postpaid',
  ) {
    try {
      const result = await this.vtpassService.verifyMeterNumber(
        meterNumber,
        disco,
        meterType,
      );

      // console.log({ result });
      return {
        valid: true,
        customerName: result.Customer_Name,
        address: result.Address,
        meterNumber: result.Meter_Number || meterNumber,
        customerType: result.Customer_Account_Type || result.Customer_Type,
        meterType: result.Meter_Type || meterType.toUpperCase(),
        minimumAmount:
          result.Min_Purchase_Amount || result.Minimum_Purchase_Amount,
        customerArrears: result.Customer_Arrears,
      };
    } catch {
      throw new BadRequestException(
        'Invalid meter number or customer not found',
      );
    }
  }

  async checkWalletBalance(userId: string, requiredAmount: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.isLocked) {
      throw new ConflictException(
        'Wallet is locked. Cannot perform transaction',
      );
    }

    const balance = Number(wallet.balance);
    if (balance < requiredAmount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${balance.toLocaleString()}, Required: ₦${requiredAmount.toLocaleString()}`,
      );
    }

    return wallet;
  }

  // ==================== Fee Calculation ====================

  calculateFee(amount: number, serviceType: VTUServiceType): number {
    switch (serviceType) {
      case 'AIRTIME':
      case 'DATA':
        // 2% with max of ₦100
        return Math.min(amount * 0.02, 100);

      case 'CABLE_TV':
      case 'ELECTRICITY':
        // Flat ₦50
        return 50;

      default:
        return 0;
    }
  }

  // ==================== Generate Reference ====================

  // generateReference(serviceType: VTUServiceType): string {
  //   const prefix = {
  //     AIRTIME: 'VTU_AIR',
  //     DATA: 'VTU_DATA',
  //     CABLE_TV: 'VTU_CABLE',
  //     ELECTRICITY: 'VTU_ELEC',
  //   }[serviceType];

  //   return `${prefix}_${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  // }

  generateReference(serviceType: VTUServiceType): string {
    const prefix = {
      AIRTIME: 'VTU_AIR',
      DATA: 'VTU_DATA',
      CABLE_TV: 'VTU_CABLE',
      ELECTRICITY: 'VTU_ELEC',
    }[serviceType];

    // Force Africa/Lagos timezone (+1 hour)
    const now = new Date();
    const lagosOffsetMs = 60 * 60 * 1000;
    const lagosTime = new Date(now.getTime() + lagosOffsetMs);

    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = lagosTime.getFullYear();
    const month = pad(lagosTime.getMonth() + 1);
    const day = pad(lagosTime.getDate());
    const hour = pad(lagosTime.getHours());
    const minute = pad(lagosTime.getMinutes());

    const datePart = `${year}${month}${day}${hour}${minute}`;

    const randomPart = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    return `${datePart}${prefix}${randomPart}`;
  }

  // ==================== Check Duplicate ====================

  async checkDuplicateOrder(
    userId: string,
    serviceType: VTUServiceType,
    recipient: string,
    amount: number,
  ) {
    const existingOrder = await this.prisma.vTUOrder.findFirst({
      where: {
        userId,
        serviceType,
        recipient,
        amount: new Decimal(amount),
        status: { in: ['PENDING', 'COMPLETED'] },
        createdAt: { gte: new Date(Date.now() - 60000) }, // Last 1 minute
      },
    });

    if (existingOrder) {
      throw new ConflictException(
        'Duplicate order detected. Please wait before retrying.',
      );
    }
  }

  // ==================== Lock/Unlock Wallet ====================

  async lockWalletForTransaction(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.isLocked) {
      throw new ConflictException(
        'Another transaction is in progress. Please wait.',
      );
    }

    await this.prisma.wallet.update({
      where: { userId },
      data: { isLocked: true },
    });

    return wallet;
  }

  async unlockWalletForTransaction(userId: string) {
    await this.prisma.wallet.update({
      where: { userId },
      data: { isLocked: false },
    });
  }

  // ==================== Airtime Purchase ====================

  async purchaseAirtime(userId: string, dto: PurchaseAirtimeDto) {
    this.logger.log(
      `[Airtime] Purchase request: ${dto.network} - ${dto.phone} - ₦${dto.amount}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Validate phone
    this.validatePhone(dto.phone);

    // 3. Calculate total
    const fee = this.calculateFee(dto.amount, 'AIRTIME');
    const total = dto.amount + fee;

    // 4. Check balance
    await this.checkWalletBalance(userId, total);

    // 5. Check duplicate
    await this.checkDuplicateOrder(userId, 'AIRTIME', dto.phone, dto.amount);

    // 6. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 7. Generate reference
      const reference = this.generateReference('AIRTIME');

      // 8. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'AIRTIME',
          provider: dto.network.toUpperCase(),
          recipient: dto.phone,
          productCode: dto.network.toLowerCase(),
          productName: `${dto.network.toUpperCase()} Airtime`,
          amount: new Decimal(dto.amount),
          status: 'PENDING',
        },
      });

      // 9. Get wallet balance before transaction
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = wallet!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 9. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_AIRTIME',
            amount: new Decimal(dto.amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `${dto.network.toUpperCase()} Airtime - ${dto.phone}`,
            metadata: {
              serviceType: 'AIRTIME',
              provider: dto.network.toUpperCase(),
              recipient: dto.phone,
              orderId: order.id,
            },
          },
        }),
      ]);

      // 9. Call VTPass API
      let vtpassResult: VTPassPurchaseResult;
      try {
        vtpassResult = await this.vtpassService.purchaseAirtime({
          network: dto.network,
          phone: dto.phone,
          amount: dto.amount,
          reference,
        });
      } catch (error) {
        this.logger.error('[Airtime] VTPass API failed:', error);
        // Update order as failed
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        // Refund immediately
        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process airtime purchase. Your wallet has been refunded.',
        );
      }

      // 10. Prepare response data FIRST (before async operations)
      const response = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount: dto.amount,
        fee,
        totalAmount: total,
        provider: dto.network.toUpperCase(),
        recipient: dto.phone,
        message:
          vtpassResult.status === 'success'
            ? 'Airtime purchased successfully'
            : 'Airtime purchase failed. Wallet refunded.',
      };

      // 11. Update order asynchronously (fire-and-forget)
      this.prisma.vTUOrder
        .update({
          where: { id: order.id },
          data: {
            status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
            providerRef: vtpassResult.transactionId,
            providerToken: vtpassResult.token,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
            completedAt:
              vtpassResult.status === 'success' ? new Date() : undefined,
          },
        })
        .catch((error) =>
          this.logger.error('Failed to update order status', error),
        );

      // 12. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 13. Auto-save recipient asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.upsertSavedRecipient(
          userId,
          'AIRTIME',
          dto.network.toUpperCase(),
          dto.phone,
        ).catch((error) =>
          this.logger.warn('Failed to save recipient (non-critical)', error),
        );
      }

      // 14. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 15. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'airtime_purchase_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'Airtime Purchase Successful',
            message: `₦${dto.amount.toLocaleString()} ${dto.network.toUpperCase()} airtime sent to ${dto.phone}`,
            data: {
              amount: dto.amount,
              provider: dto.network.toUpperCase(),
              recipient: dto.phone,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send airtime purchase notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return response;
    } finally {
      // 14. Always unlock wallet
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== Data Purchase ====================

  async purchaseDataBundle(userId: string, dto: PurchaseDataDto) {
    const serviceLabel = dto.isSME ? 'SME Data' : 'Data';
    this.logger.log(
      `[${serviceLabel}] Purchase request: ${dto.network} - ${dto.phone} - ${dto.productCode}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Validate phone
    this.validatePhone(dto.phone);

    // 2. Get product details from VTPass (SME or regular)
    const dataPlans = dto.isSME
      ? await this.getSMEDataPlans(dto.network)
      : await this.getDataPlans(dto.network);
    const product = dataPlans.find((p) => p.variation_code === dto.productCode);

    if (!product) {
      throw new BadRequestException('Invalid product code');
    }

    const amount = Number(product.variation_amount);

    // 3. Calculate total
    const fee = this.calculateFee(amount, 'DATA');
    const total = amount + fee;

    // 4. Check balance
    await this.checkWalletBalance(userId, total);

    // 5. Check duplicate
    await this.checkDuplicateOrder(userId, 'DATA', dto.phone, amount);

    // 6. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 7. Generate reference
      const reference = this.generateReference('DATA');

      // 8. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'DATA',
          provider: dto.network.toUpperCase(),
          recipient: dto.phone,
          productCode: dto.productCode,
          productName: product.name,
          amount: new Decimal(amount),
          status: 'PENDING',
        },
      });

      // 9. Get wallet balance before transaction
      const walletData = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = walletData!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 10. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_DATA',
            amount: new Decimal(amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `${dto.network.toUpperCase()} Data - ${product.name}`,
            metadata: {
              serviceType: 'DATA',
              provider: dto.network.toUpperCase(),
              recipient: dto.phone,
              productCode: dto.productCode,
              productName: product.name,
              orderId: order.id,
            },
          },
        }),
      ]);

      // 11. Call VTPass API
      let vtpassResult: VTPassPurchaseResult;
      try {
        vtpassResult = await this.vtpassService.purchaseData({
          network: dto.network,
          phone: dto.phone,
          productCode: dto.productCode,
          amount,
          reference,
          isSME: dto.isSME,
        });
      } catch (error) {
        this.logger.error('[Data] VTPass API failed:', error);
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process data purchase. Your wallet has been refunded.',
        );
      }

      // 11. Prepare response data FIRST (before async operations)
      const response = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount,
        fee,
        totalAmount: total,
        provider: dto.network.toUpperCase(),
        recipient: dto.phone,
        productName: product.name,
        message:
          vtpassResult.status === 'success'
            ? 'Data bundle purchased successfully'
            : 'Data purchase failed. Wallet refunded.',
      };

      // 12. Update order asynchronously (fire-and-forget)
      this.prisma.vTUOrder
        .update({
          where: { id: order.id },
          data: {
            status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
            providerRef: vtpassResult.transactionId,
            providerToken: vtpassResult.token,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
            completedAt:
              vtpassResult.status === 'success' ? new Date() : undefined,
          },
        })
        .catch((error) =>
          this.logger.error('Failed to update order status', error),
        );

      // 13. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 14. Auto-save recipient asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.upsertSavedRecipient(
          userId,
          'DATA',
          dto.network.toUpperCase(),
          dto.phone,
        ).catch((error) =>
          this.logger.warn('Failed to save recipient (non-critical)', error),
        );
      }

      // 15. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 16. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'data_purchase_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'Data Purchase Successful',
            message: `${product.name} sent to ${dto.phone}`,
            data: {
              amount,
              provider: dto.network.toUpperCase(),
              recipient: dto.phone,
              productName: product.name,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send data purchase notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return response;
    } finally {
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== Cable TV Payment ====================

  async payCableTVSubscription(userId: string, dto: PayCableTVDto) {
    const subscriptionLabel =
      String(dto.subscriptionType) === 'renew'
        ? 'Renewal'
        : 'New/Change Subscription';
    this.logger.log(
      `[Cable TV] ${subscriptionLabel}: ${dto.provider} - ${dto.smartcardNumber}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Determine amount based on subscription type
    let amount: number;
    let productName: string;

    if (String(dto.subscriptionType) === 'change') {
      // For "change": Get product details from variation code
      if (!dto.productCode) {
        throw new BadRequestException(
          'Product code is required for subscription type "change"',
        );
      }

      const plans = await this.getCableTVPlans(dto.provider);
      const product = plans.find((p) => p.variation_code === dto.productCode);

      if (!product) {
        throw new BadRequestException('Invalid product code');
      }

      amount = Number(product.variation_amount);
      productName = product.name;
    } else {
      // For "renew": Amount should come from verification (ideally)
      // For now, we'll use productCode if provided, otherwise fail
      if (!dto.productCode) {
        throw new BadRequestException(
          'Product code is required. Please verify smartcard first to get renewal amount.',
        );
      }

      const plans = await this.getCableTVPlans(dto.provider);
      const product = plans.find((p) => p.variation_code === dto.productCode);

      if (!product) {
        throw new BadRequestException('Invalid product code');
      }

      amount = Number(product.variation_amount);
      productName = product.name;
    }

    // 2. Calculate total
    const fee = this.calculateFee(amount, 'CABLE_TV');
    const total = amount + fee;

    // 3. Check balance
    await this.checkWalletBalance(userId, total);

    // 4. Check duplicate
    await this.checkDuplicateOrder(
      userId,
      'CABLE_TV',
      dto.smartcardNumber,
      amount,
    );

    // 5. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 6. Generate reference
      const reference = this.generateReference('CABLE_TV');

      // 7. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'CABLE_TV',
          provider: dto.provider.toUpperCase(),
          recipient: dto.smartcardNumber,
          productCode: dto.productCode,
          productName,
          amount: new Decimal(amount),
          status: 'PENDING',
        },
      });

      // 8. Get wallet balance before transaction
      const walletCable = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = walletCable!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 9. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_CABLE',
            amount: new Decimal(amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `${dto.provider.toUpperCase()} - ${productName}`,
            metadata: {
              serviceType: 'CABLE_TV',
              provider: dto.provider.toUpperCase(),
              recipient: dto.smartcardNumber,
              productCode: dto.productCode,
              productName,
              subscriptionType: dto.subscriptionType,
              quantity: dto.quantity,
              orderId: order.id,
            },
          },
        }),
      ]);

      // 10. Call VTPass API
      let vtpassResult: VTPassPurchaseResult;
      try {
        vtpassResult = await this.vtpassService.payCableTV({
          provider: dto.provider,
          smartcard: dto.smartcardNumber,
          productCode: dto.productCode,
          subscriptionType: dto.subscriptionType,
          quantity: dto.quantity,
          amount,
          phone: dto.phone,
          reference,
        });
      } catch (error) {
        this.logger.error('[Cable TV] VTPass API failed:', error);
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process cable TV payment. Your wallet has been refunded.',
        );
      }

      // 10. Update order
      await this.prisma.vTUOrder.update({
        where: { id: order.id },
        data: {
          status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
          providerRef: vtpassResult.transactionId,
          providerToken: vtpassResult.token,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
          completedAt:
            vtpassResult.status === 'success' ? new Date() : undefined,
        },
      });

      // 11. Prepare response data FIRST (before async operations)
      const response = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount,
        fee,
        totalAmount: total,
        provider: dto.provider.toUpperCase(),
        recipient: dto.smartcardNumber,
        productName,
        message:
          vtpassResult.status === 'success'
            ? 'Cable TV subscription successful'
            : 'Cable TV payment failed. Wallet refunded.',
      };

      // 12. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 13. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 14. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'cable_tv_payment_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'Cable TV Payment Successful',
            message: `${dto.provider.toUpperCase()} subscription (${productName}) for ${dto.smartcardNumber}`,
            data: {
              amount,
              provider: dto.provider.toUpperCase(),
              recipient: dto.smartcardNumber,
              productName,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send cable TV payment notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return response;
    } finally {
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== Showmax ====================

  async getShowmaxPlans() {
    return this.vtpassService.getServiceVariations('showmax');
  }

  // ==================== Showmax Payment ====================

  async payShowmaxSubscription(userId: string, dto: PayShowmaxDto) {
    this.logger.log(
      `[Showmax] Payment request: ${dto.phoneNumber} - ${dto.productCode}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Get product details
    const plans = await this.vtpassService.getServiceVariations('showmax');
    const product = plans.find((p) => p.variation_code === dto.productCode);

    if (!product) {
      throw new BadRequestException('Invalid product code');
    }

    const amount = Number(product.variation_amount);

    // 2. Calculate total (Showmax has convenience fee)
    const fee = this.calculateFee(amount, 'CABLE_TV');
    const total = amount + fee;

    // 3. Check balance
    await this.checkWalletBalance(userId, total);

    // 4. Check duplicate
    await this.checkDuplicateOrder(userId, 'CABLE_TV', dto.phoneNumber, amount);

    // 5. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 6. Generate reference
      const reference = this.generateReference('CABLE_TV');

      // 7. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'CABLE_TV',
          provider: 'SHOWMAX',
          recipient: dto.phoneNumber,
          productCode: dto.productCode,
          productName: product.name,
          amount: new Decimal(amount),
          status: 'PENDING',
        },
      });

      // 8. Get wallet balance before transaction
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = wallet!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 9. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_CABLE',
            amount: new Decimal(amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `Showmax - ${product.name}`,
            metadata: {
              serviceType: 'CABLE_TV',
              provider: 'SHOWMAX',
              recipient: dto.phoneNumber,
              productCode: dto.productCode,
              productName: product.name,
              orderId: order.id,
            },
          },
        }),
      ]);

      // 10. Call VTPass API
      let vtpassResult: VTPassPurchaseResult & { voucher?: string };
      try {
        vtpassResult = await this.vtpassService.payShowmax({
          phoneNumber: dto.phoneNumber,
          productCode: dto.productCode,
          amount,
          reference,
        });
      } catch (error) {
        this.logger.error('[Showmax] VTPass API failed:', error);
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process Showmax subscription. Your wallet has been refunded.',
        );
      }

      // 11. Update order
      await this.prisma.vTUOrder.update({
        where: { id: order.id },
        data: {
          status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
          providerRef: vtpassResult.transactionId,
          providerToken: vtpassResult.voucher, // Showmax returns voucher code
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
          completedAt:
            vtpassResult.status === 'success' ? new Date() : undefined,
        },
      });

      // 12. Prepare response data FIRST (before async operations)
      const responseShowmax = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount,
        fee,
        totalAmount: total,
        provider: 'SHOWMAX',
        recipient: dto.phoneNumber,
        productName: product.name,
        voucher: vtpassResult.voucher,
        message:
          vtpassResult.status === 'success'
            ? 'Showmax subscription successful'
            : 'Showmax payment failed. Wallet refunded.',
      };

      // 13. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 14. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 15. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'showmax_payment_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'Showmax Subscription Successful',
            message: `Showmax subscription (${product.name}) activated for ${dto.phoneNumber}`,
            data: {
              amount,
              provider: 'SHOWMAX',
              recipient: dto.phoneNumber,
              productName: product.name,
              voucher: vtpassResult.voucher,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send Showmax payment notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return responseShowmax;
    } finally {
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== Electricity Payment ====================

  async payElectricityBill(userId: string, dto: PayElectricityDto) {
    this.logger.log(
      `[Electricity] Payment request: ${dto.disco} - ${dto.meterNumber} - ₦${dto.amount}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Calculate total
    const fee = this.calculateFee(dto.amount, 'ELECTRICITY');
    const total = dto.amount + fee;

    // 2. Check balance
    await this.checkWalletBalance(userId, total);

    // 3. Check duplicate
    await this.checkDuplicateOrder(
      userId,
      'ELECTRICITY',
      dto.meterNumber,
      dto.amount,
    );

    // 4. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 5. Generate reference
      const reference = this.generateReference('ELECTRICITY');

      // 6. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'ELECTRICITY',
          provider: dto.disco.toUpperCase(),
          recipient: dto.meterNumber,
          productCode: dto.meterType,
          productName: `${dto.disco.toUpperCase()} - ${dto.meterType.toUpperCase()}`,
          amount: new Decimal(dto.amount),
          status: 'PENDING',
        },
      });

      // 7. Get wallet balance before transaction
      const walletElec = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = walletElec!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 8. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_ELECTRICITY',
            amount: new Decimal(dto.amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `${dto.disco.toUpperCase()} Electricity - ${dto.meterNumber}`,
            metadata: {
              serviceType: 'ELECTRICITY',
              provider: dto.disco.toUpperCase(),
              recipient: dto.meterNumber,
              meterType: dto.meterType,
              orderId: order.id,
              // NOTE: meterToken will be updated after VTPass API call
              meterToken: null,
              customerName: null,
              units: null,
            },
          },
        }),
      ]);

      // 9. Call VTPass API
      let vtpassResult: VTPassPurchaseResult;
      try {
        vtpassResult = await this.vtpassService.payElectricity({
          disco: dto.disco,
          meterNumber: dto.meterNumber,
          meterType: dto.meterType,
          amount: dto.amount,
          phone: dto.phone,
          reference,
        });
      } catch (error) {
        this.logger.error('[Electricity] VTPass API failed:', error);
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process electricity payment. Your wallet has been refunded.',
        );
      }

      // 9. Update order
      await this.prisma.vTUOrder.update({
        where: { id: order.id },
        data: {
          status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
          providerRef: vtpassResult.transactionId,
          providerToken: vtpassResult.token || vtpassResult.meterToken,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
          completedAt:
            vtpassResult.status === 'success' ? new Date() : undefined,
        },
      });

      // 10. Update transaction metadata with electricity token
      if (vtpassResult.status === 'success' && vtpassResult.meterToken) {
        await this.prisma.transaction.update({
          where: { reference },
          data: {
            metadata: {
              serviceType: 'ELECTRICITY',
              provider: dto.disco.toUpperCase(),
              recipient: dto.meterNumber,
              meterType: dto.meterType,
              orderId: order.id,
              meterToken: vtpassResult.meterToken,
              customerName: vtpassResult.customerName,
              units: vtpassResult.units,
              tokenAmount: vtpassResult.tokenAmount,
              tariff: vtpassResult.tariff,
              customerAddress: vtpassResult.customerAddress,
            },
          },
        });
      }

      // 11. Prepare response data FIRST (before async operations)
      const responseElec = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount: dto.amount,
        fee,
        totalAmount: total,
        provider: dto.disco.toUpperCase(),
        recipient: dto.meterNumber,
        // Electricity-specific fields
        meterToken: vtpassResult.meterToken,
        units: vtpassResult.units,
        tokenAmount: vtpassResult.tokenAmount,
        tariff: vtpassResult.tariff,
        customerName: vtpassResult.customerName,
        customerAddress: vtpassResult.customerAddress,
        meterNumber: vtpassResult.meterNumber,
        // Postpaid-specific
        utilityName: vtpassResult.utilityName,
        exchangeReference: vtpassResult.exchangeReference,
        balance: vtpassResult.balance,
        message:
          vtpassResult.status === 'success'
            ? 'Electricity payment successful'
            : 'Electricity payment failed. Wallet refunded.',
      };

      // 12. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 13. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 14. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'electricity_payment_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'Electricity Payment Successful',
            message: `₦${dto.amount.toLocaleString()} ${dto.disco.toUpperCase()} electricity for ${dto.meterNumber}${vtpassResult.units ? ` - ${vtpassResult.units}` : ''}`,
            data: {
              amount: dto.amount,
              provider: dto.disco.toUpperCase(),
              recipient: dto.meterNumber,
              meterToken: vtpassResult.meterToken,
              units: vtpassResult.units,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send electricity payment notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return responseElec;
    } finally {
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== International Airtime Purchase ====================

  async purchaseInternationalAirtime(
    userId: string,
    dto: PurchaseInternationalAirtimeDto,
  ) {
    this.logger.log(
      `[International] Purchase request: ${dto.countryCode} - ${dto.billersCode} - ${dto.variationCode}`,
    );

    // 1. Verify PIN
    await this.usersService.verifyPin(userId, dto.pin);

    // 2. Get user details for email if not provided
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Get product details to determine amount
    const variations = await this.getInternationalVariations(
      dto.operatorId,
      dto.productTypeId,
    );
    const product = variations.find(
      (p) => p.variation_code === dto.variationCode,
    );

    if (!product) {
      throw new BadRequestException('Invalid product code');
    }

    // Note: International airtime amounts may vary, use a fixed fee structure
    const amount = Number(product.variation_amount) || 0;
    const fee = 50; // Flat fee for international services
    const total = amount + fee;

    // 3. Check balance
    await this.checkWalletBalance(userId, total);

    // 4. Check duplicate
    await this.checkDuplicateOrder(userId, 'AIRTIME', dto.billersCode, amount);

    // 5. Lock wallet
    await this.lockWalletForTransaction(userId);

    try {
      // 6. Generate reference
      const reference = this.generateReference('AIRTIME');

      // 7. Create order
      const order = await this.prisma.vTUOrder.create({
        data: {
          reference,
          userId,
          serviceType: 'AIRTIME',
          provider: `INTL_${dto.countryCode}`,
          recipient: dto.billersCode,
          productCode: dto.variationCode,
          productName: product.name,
          amount: new Decimal(amount),
          status: 'PENDING',
        },
      });

      // 8. Get wallet balance before transaction
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      const balanceBefore = wallet!.balance;
      const balanceAfter = new Decimal(balanceBefore).minus(new Decimal(total));

      // 9. Debit wallet and create transaction
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: new Decimal(total) },
            ledgerBalance: { decrement: new Decimal(total) },
          },
        }),
        this.prisma.transaction.create({
          data: {
            reference,
            userId,
            type: 'VTU_AIRTIME',
            amount: new Decimal(amount),
            fee: new Decimal(fee),
            totalAmount: new Decimal(total),
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            description: `International Airtime - ${dto.countryCode} - ${dto.billersCode}`,
            metadata: {
              serviceType: 'INTERNATIONAL_AIRTIME',
              countryCode: dto.countryCode,
              operatorId: dto.operatorId,
              productTypeId: dto.productTypeId,
              recipient: dto.billersCode,
              orderId: order.id,
            },
          },
        }),
      ]);

      // 10. Call VTPass API
      let vtpassResult: VTPassPurchaseResult;
      try {
        vtpassResult = await this.vtpassService.purchaseInternationalAirtime({
          billersCode: dto.billersCode,
          variationCode: dto.variationCode,
          operatorId: dto.operatorId,
          countryCode: dto.countryCode,
          productTypeId: dto.productTypeId,
          email: dto.email || user.email,
          phone: dto.phone,
          reference,
          amount,
        });
      } catch (error) {
        this.logger.error('[International] VTPass API failed:', error);
        await this.prisma.vTUOrder.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            providerResponse: { error: 'VTPass API error' },
          },
        });

        await this.refundFailedOrder(order.id);

        throw new BadRequestException(
          'Failed to process international airtime purchase. Your wallet has been refunded.',
        );
      }

      // 11. Update order
      await this.prisma.vTUOrder.update({
        where: { id: order.id },
        data: {
          status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
          providerRef: vtpassResult.transactionId,
          providerToken: vtpassResult.token,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          providerResponse: JSON.parse(JSON.stringify(vtpassResult)),
          completedAt:
            vtpassResult.status === 'success' ? new Date() : undefined,
        },
      });

      // 12. Prepare response data FIRST (before async operations)
      const responseIntl = {
        reference,
        orderId: order.id,
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        amount,
        fee,
        totalAmount: total,
        provider: `INTL_${dto.countryCode}`,
        recipient: dto.billersCode,
        message:
          vtpassResult.status === 'success'
            ? 'International airtime purchased successfully'
            : 'International airtime purchase failed. Wallet refunded.',
      };

      // 13. If failed, refund asynchronously
      if (vtpassResult.status !== 'success') {
        this.refundFailedOrder(order.id).catch((error) =>
          this.logger.error('Failed to refund order', error),
        );
      }

      // 14. Invalidate wallet and transaction caches (fire-and-forget)
      this.walletService
        .invalidateWalletCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate wallet cache (non-critical)',
            error.message,
          ),
        );
      this.walletService
        .invalidateTransactionCache(userId)
        .catch((error) =>
          this.logger.warn(
            'Failed to invalidate transaction cache (non-critical)',
            error.message,
          ),
        );

      // 15. Send notification asynchronously (fire-and-forget)
      if (vtpassResult.status === 'success') {
        this.notificationDispatcher
          .sendNotification({
            userId,
            eventType: 'international_airtime_success',
            category: 'TRANSACTION',
            channels: ['PUSH', 'IN_APP', 'EMAIL'],
            title: 'International Airtime Purchase Successful',
            message: `International airtime sent to ${dto.billersCode} (${dto.countryCode})`,
            data: {
              amount,
              countryCode: dto.countryCode,
              recipient: dto.billersCode,
              reference,
            },
          })
          .catch((error) => {
            this.logger.error(
              'Failed to send international airtime notification',
              error,
            );
          });
      }

      // RETURN IMMEDIATELY - don't wait for async operations above
      return responseIntl;
    } finally {
      await this.unlockWalletForTransaction(userId);
    }
  }

  // ==================== Refund Failed Order ====================

  async refundFailedOrder(orderId: string) {
    this.logger.log(`[Refund] Processing refund for order: ${orderId}`);

    const order = await this.prisma.vTUOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get the original transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference: order.reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Get wallet balance before refund
    const walletBeforeRefund = await this.prisma.wallet.findUnique({
      where: { userId: order.userId },
    });
    const balanceBefore = walletBeforeRefund!.balance;
    const balanceAfter = new Decimal(balanceBefore).plus(
      transaction.totalAmount,
    );

    // Refund to wallet
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId: order.userId },
        data: {
          balance: { increment: transaction.totalAmount },
          ledgerBalance: { increment: transaction.totalAmount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          reference: `REFUND_${order.reference}`,
          userId: order.userId,
          type: 'REFUND',
          amount: transaction.totalAmount,
          fee: new Decimal(0),
          totalAmount: transaction.totalAmount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description: `Refund for failed ${order.serviceType} order`,
          metadata: {
            originalReference: order.reference,
            orderId: order.id,
          },
        },
      }),
    ]);

    this.logger.log(`[Refund] Refund successful for order: ${orderId}`);
  }

  // ==================== Order Management ====================

  async getOrders(userId: string, filters: GetOrdersDto) {
    const {
      serviceType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const where: {
      userId: string;
      serviceType?: VTUServiceType;
      status?: TransactionStatus;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId,
    };

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.vTUOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vTUOrder.count({ where }),
    ]);

    // Calculate summary
    const allOrders = await this.prisma.vTUOrder.findMany({
      where: { userId },
    });

    const summary = {
      totalSpent: allOrders
        .filter((o) => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + Number(o.amount), 0)
        .toFixed(2),
      completedOrders: allOrders.filter((o) => o.status === 'COMPLETED').length,
      pendingOrders: allOrders.filter((o) => o.status === 'PENDING').length,
      failedOrders: allOrders.filter((o) => o.status === 'FAILED').length,
    };

    return {
      data: orders.map((order) => ({
        id: order.id,
        reference: order.reference,
        serviceType: order.serviceType,
        provider: order.provider,
        recipient: order.recipient,
        productCode: order.productCode,
        productName: order.productName,
        amount: order.amount.toString(),
        status: order.status,
        providerRef: order.providerRef,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.vTUOrder.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      reference: order.reference,
      serviceType: order.serviceType,
      provider: order.provider,
      recipient: order.recipient,
      productCode: order.productCode,
      productName: order.productName,
      amount: order.amount.toString(),
      status: order.status,
      providerRef: order.providerRef,
      providerToken: order.providerToken,
      providerResponse: order.providerResponse,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString(),
    };
  }

  async getOrderByReference(reference: string, userId: string) {
    const order = await this.prisma.vTUOrder.findFirst({
      where: { reference, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.getOrderById(order.id, userId);
  }

  async retryFailedOrder(orderId: string, userId: string) {
    const order = await this.prisma.vTUOrder.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'FAILED') {
      throw new BadRequestException('Only failed orders can be retried');
    }

    throw new BadRequestException(
      'Retry functionality is not yet implemented. Please create a new order instead.',
    );
  }

  // ==================== Update Transaction Status (from Webhook) ====================

  async updateTransactionStatus(reference: string, status: TransactionStatus) {
    const order = await this.prisma.vTUOrder.findUnique({
      where: { reference },
    });

    if (!order) {
      this.logger.warn(`[Webhook] Order not found: ${reference}`);
      return;
    }

    await this.prisma.vTUOrder.update({
      where: { reference },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    this.logger.log(
      `[Webhook] Order status updated: ${reference} -> ${status}`,
    );
  }

  // ==================== Saved Recipients Management ====================

  /**
   * Auto-save or update recipient after successful VTU transaction
   * Called internally after each successful purchase
   */
  async upsertSavedRecipient(
    userId: string,
    serviceType: VTUServiceType,
    provider: string,
    recipient: string,
    recipientName?: string,
  ) {
    try {
      await this.prisma.savedRecipient.upsert({
        where: {
          userId_serviceType_recipient: {
            userId,
            serviceType,
            recipient,
          },
        },
        update: {
          provider,
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
          ...(recipientName && { recipientName }),
        },
        create: {
          userId,
          serviceType,
          provider,
          recipient,
          recipientName,
          lastUsedAt: new Date(),
          usageCount: 1,
        },
      });

      this.logger.log(
        `[SavedRecipient] Upserted: ${serviceType} - ${recipient}`,
      );
    } catch (error) {
      // Don't fail the transaction if saving recipient fails
      this.logger.error(`[SavedRecipient] Failed to save recipient:`, error);
    }
  }

  /**
   * Get saved recipients for a user, optionally filtered by service type
   * Returns most recently used recipients first
   */
  async getSavedRecipients(userId: string, serviceType?: VTUServiceType) {
    const where = serviceType ? { userId, serviceType } : { userId };

    const recipients = await this.prisma.savedRecipient.findMany({
      where,
      orderBy: { lastUsedAt: 'desc' },
      take: 10, // Limit to 10 most recent
    });

    return recipients.map((recipient) => ({
      id: recipient.id,
      serviceType: recipient.serviceType,
      provider: recipient.provider,
      recipient: recipient.recipient,
      recipientName: recipient.recipientName,
      lastUsedAt: recipient.lastUsedAt.toISOString(),
      usageCount: recipient.usageCount,
    }));
  }

  /**
   * Update recipient name
   */
  async updateSavedRecipient(
    recipientId: string,
    userId: string,
    recipientName: string,
  ) {
    const recipient = await this.prisma.savedRecipient.findFirst({
      where: { id: recipientId, userId },
    });

    if (!recipient) {
      throw new NotFoundException('Saved recipient not found');
    }

    return this.prisma.savedRecipient.update({
      where: { id: recipientId },
      data: { recipientName },
    });
  }

  /**
   * Delete a saved recipient
   */
  async deleteSavedRecipient(recipientId: string, userId: string) {
    const recipient = await this.prisma.savedRecipient.findFirst({
      where: { id: recipientId, userId },
    });

    if (!recipient) {
      throw new NotFoundException('Saved recipient not found');
    }

    await this.prisma.savedRecipient.delete({
      where: { id: recipientId },
    });

    return { message: 'Saved recipient deleted successfully' };
  }
}
