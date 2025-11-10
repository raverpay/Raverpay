# Phase 2: VTU Services Implementation

**MularPay - Virtual Top-Up & Bill Payment Services**

---

## 📋 Overview

Phase 2 implements VTU (Virtual Top-Up) services allowing users to:

- Purchase airtime for all Nigerian networks
- Buy data bundles
- Pay for cable TV subscriptions (DSTV, GOtv, Startimes)
- Pay electricity bills (IKEDC, EKEDC, AEDC, etc.)

---

## 🎯 Features to Implement

### 1. Airtime Purchase

- ✅ MTN, Glo, Airtel, 9Mobile
- ✅ Instant delivery
- ✅ Amount validation (₦50 - ₦50,000)
- ✅ Transaction fee: 2% (max ₦100)

### 2. Data Bundle Purchase

- ✅ All Nigerian networks
- ✅ Predefined data plans
- ✅ Product catalog management
- ✅ Automatic delivery

### 3. Cable TV Subscriptions

- ✅ DSTV (Compact, Premium, etc.)
- ✅ GOtv
- ✅ Startimes
- ✅ Smartcard number validation

### 4. Electricity Bills

- ✅ All DISCOs (IKEDC, EKEDC, AEDC, etc.)
- ✅ Prepaid meter recharge
- ✅ Postpaid bill payment
- ✅ Meter validation

---

## 💰 Transaction Fees

| Service Type | Fee           | Notes      |
| ------------ | ------------- | ---------- |
| Airtime      | 2% (max ₦100) | Instant    |
| Data Bundle  | 2% (max ₦100) | Instant    |
| Cable TV     | ₦50 flat      | 0-24 hours |
| Electricity  | ₦50 flat      | Instant    |

---

## 🏗️ Architecture

### Service Provider: VTPass

**Why VTPass?**

- ✅ Most comprehensive Nigerian VTU API
- ✅ Excellent uptime (99.9%)
- ✅ Competitive pricing
- ✅ Real-time transaction status
- ✅ Webhook support
- ✅ Test environment available

**Alternatives:** Shago, Recharge.ng, Buypower

### Flow Diagram

```
User → MularPay API → VTPass API → Network Provider
         ↓               ↓
      Wallet           Transaction
      Update           Status
```

---

## 📊 Database Schema

Already defined in `schema.prisma`:

```prisma
model VTUOrder {
  id            String   @id @default(uuid())
  reference     String   @unique

  userId        String
  user          User     @relation(fields: [userId], references: [id])

  serviceType   VTUServiceType
  provider      String   // MTN, GLO, AIRTEL, 9MOBILE, DSTV, etc.

  // Recipient details
  recipient     String   // Phone number or smartcard number

  // Product details
  productCode   String
  productName   String
  amount        Decimal  @db.Decimal(15, 2)

  // Status
  status        TransactionStatus @default(PENDING)

  // Provider response
  providerRef   String?
  providerToken String?
  providerResponse Json?

  // Transaction reference
  transactionId String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  completedAt   DateTime?

  @@index([userId])
  @@index([reference])
  @@index([status])
  @@map("vtu_orders")
}

enum VTUServiceType {
  AIRTIME
  DATA
  CABLE_TV
  ELECTRICITY
}
```

**Status:** Already migrated ✅

---

## 🛠️ Implementation Plan

### Step 1: VTPass Service Integration

**File:** `apps/mularpay-api/src/vtu/services/vtpass.service.ts`

**Methods:**

- `getAirtimeProducts()` - List available networks
- `getDataProducts(network: string)` - List data plans by network
- `getCableTVProducts(provider: string)` - List cable TV plans
- `getElectricityDISCOs()` - List electricity providers
- `verifySmartcard(smartcard: string, provider: string)` - Validate smartcard
- `verifyMeterNumber(meterNumber: string, disco: string)` - Validate meter
- `purchaseAirtime(data: AirtimePurchaseDto)` - Buy airtime
- `purchaseData(data: DataPurchaseDto)` - Buy data bundle
- `payCableTVBill(data: CableTVPaymentDto)` - Pay cable TV
- `payElectricityBill(data: ElectricityPaymentDto)` - Pay electricity
- `queryTransaction(reference: string)` - Check transaction status
- `verifyWebhook(signature: string, payload: any)` - Verify webhook

**Environment Variables:**

```env
VTPASS_API_KEY=your_api_key
VTPASS_SECRET_KEY=your_secret_key
VTPASS_PUBLIC_KEY=your_public_key
VTPASS_BASE_URL=https://sandbox.vtpass.com/api # or production
VTPASS_WEBHOOK_SECRET=your_webhook_secret
```

### Step 2: VTU Service (Business Logic)

**File:** `apps/mularpay-api/src/vtu/vtu.service.ts`

**Methods:**

1. **Product Catalog Management**
   - `getAirtimeProviders()` - List networks
   - `getDataPlans(network: string)` - Get data plans by network
   - `getCableTVPlans(provider: string)` - Get cable TV plans
   - `getElectricityProviders()` - Get DISCOs

2. **Validation**
   - `validatePhone(phone: string)` - Validate Nigerian phone number
   - `validateSmartcard(smartcard: string, provider: string)` - Verify smartcard
   - `validateMeterNumber(meterNumber: string, disco: string, type: 'prepaid' | 'postpaid')` - Verify meter
   - `checkWalletBalance(userId: string, amount: number)` - Check sufficient balance

3. **Purchase Processing**
   - `purchaseAirtime(userId: string, dto: AirtimePurchaseDto)` - Process airtime purchase
   - `purchaseDataBundle(userId: string, dto: DataPurchaseDto)` - Process data purchase
   - `payCableTVSubscription(userId: string, dto: CableTVPaymentDto)` - Process cable TV payment
   - `payElectricityBill(userId: string, dto: ElectricityPaymentDto)` - Process electricity payment

4. **Order Management**
   - `getOrders(userId: string, filters: OrderFiltersDto)` - Get user's VTU orders
   - `getOrderById(orderId: string, userId: string)` - Get order details
   - `getOrderByReference(reference: string, userId: string)` - Get order by reference
   - `retryFailedOrder(orderId: string, userId: string)` - Retry failed order

5. **Transaction Integration**
   - `createVTUTransaction(order: VTUOrder)` - Create wallet transaction
   - `updateTransactionStatus(orderId: string, status: TransactionStatus)` - Update status
   - `refundFailedOrder(orderId: string)` - Refund on failure

**Purchase Flow:**

```typescript
async purchaseAirtime(userId: string, dto: AirtimePurchaseDto) {
  // 1. Validate phone number
  await this.validatePhone(dto.phone);

  // 2. Calculate total (amount + fee)
  const fee = this.calculateFee(dto.amount, 'AIRTIME');
  const total = dto.amount + fee;

  // 3. Check wallet balance
  await this.checkWalletBalance(userId, total);

  // 4. Lock wallet (prevent concurrent transactions)
  const wallet = await this.walletService.lockForTransaction(userId);

  try {
    // 5. Generate unique reference
    const reference = `VTU_AIR_${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // 6. Create VTU order (PENDING)
    const order = await this.prisma.vTUOrder.create({
      data: {
        reference,
        userId,
        serviceType: 'AIRTIME',
        provider: dto.network,
        recipient: dto.phone,
        productCode: dto.network, // MTN, GLO, etc.
        productName: `${dto.network} Airtime`,
        amount: dto.amount,
        status: 'PENDING',
      },
    });

    // 7. Debit wallet (atomic)
    await this.prisma.$transaction([
      // Debit wallet
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: total },
          ledgerBalance: { decrement: total },
        },
      }),

      // Create transaction record
      this.prisma.transaction.create({
        data: {
          reference,
          userId,
          type: 'VTU_PURCHASE',
          amount: dto.amount,
          fee,
          totalAmount: total,
          status: 'COMPLETED',
          description: `${dto.network} Airtime - ${dto.phone}`,
          metadata: {
            serviceType: 'AIRTIME',
            provider: dto.network,
            recipient: dto.phone,
            orderId: order.id,
          },
        },
      }),
    ]);

    // 8. Call VTPass API
    const vtpassResult = await this.vtpassService.purchaseAirtime({
      network: dto.network,
      phone: dto.phone,
      amount: dto.amount,
      reference,
    });

    // 9. Update order with provider response
    await this.prisma.vTUOrder.update({
      where: { id: order.id },
      data: {
        status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
        providerRef: vtpassResult.transactionId,
        providerToken: vtpassResult.token,
        providerResponse: vtpassResult,
        completedAt: vtpassResult.status === 'success' ? new Date() : null,
      },
    });

    // 10. If failed, refund immediately
    if (vtpassResult.status !== 'success') {
      await this.refundFailedOrder(order.id);
    }

    return {
      reference,
      orderId: order.id,
      status: vtpassResult.status === 'success' ? 'COMPLETED' : 'FAILED',
      amount: dto.amount,
      fee,
      totalAmount: total,
      provider: dto.network,
      recipient: dto.phone,
    };

  } finally {
    // 11. Always unlock wallet
    await this.walletService.unlockForTransaction(userId);
  }
}
```

### Step 3: DTOs (Data Transfer Objects)

**File:** `apps/mularpay-api/src/vtu/dto/purchase-airtime.dto.ts`

```typescript
import { IsString, IsNumber, Min, Max, Matches } from 'class-validator';

export class PurchaseAirtimeDto {
  @IsString()
  @Matches(/^(MTN|GLO|AIRTEL|9MOBILE)$/, {
    message: 'Network must be MTN, GLO, AIRTEL, or 9MOBILE',
  })
  network: string;

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

  @IsNumber()
  @Min(50, { message: 'Minimum airtime is ₦50' })
  @Max(50000, { message: 'Maximum airtime is ₦50,000' })
  amount: number;
}
```

**File:** `apps/mularpay-api/src/vtu/dto/purchase-data.dto.ts`

```typescript
import { IsString, Matches } from 'class-validator';

export class PurchaseDataDto {
  @IsString()
  @Matches(/^(MTN|GLO|AIRTEL|9MOBILE)$/, {
    message: 'Network must be MTN, GLO, AIRTEL, or 9MOBILE',
  })
  network: string;

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

  @IsString()
  productCode: string; // e.g., "MTN-1GB-30DAYS"
}
```

**File:** `apps/mularpay-api/src/vtu/dto/pay-cable-tv.dto.ts`

```typescript
import { IsString, IsEnum, Matches } from 'class-validator';

enum CableTVProvider {
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
}

export class PayCableTVDto {
  @IsEnum(CableTVProvider)
  provider: CableTVProvider;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'Invalid smartcard number' })
  smartcardNumber: string;

  @IsString()
  productCode: string; // e.g., "DSTV-COMPACT"
}
```

**File:** `apps/mularpay-api/src/vtu/dto/pay-electricity.dto.ts`

```typescript
import { IsString, IsNumber, IsEnum, Min } from 'class-validator';

enum MeterType {
  PREPAID = 'PREPAID',
  POSTPAID = 'POSTPAID',
}

export class PayElectricityDto {
  @IsString()
  disco: string; // e.g., "IKEDC", "EKEDC"

  @IsString()
  meterNumber: string;

  @IsEnum(MeterType)
  meterType: MeterType;

  @IsNumber()
  @Min(1000, { message: 'Minimum electricity payment is ₦1,000' })
  amount: number;
}
```

**File:** `apps/mularpay-api/src/vtu/dto/verify-smartcard.dto.ts`

```typescript
import { IsString, Matches } from 'class-validator';

export class VerifySmartcardDto {
  @IsString()
  provider: string; // DSTV, GOTV, STARTIMES

  @IsString()
  @Matches(/^\d{10}$/, { message: 'Invalid smartcard number' })
  smartcardNumber: string;
}
```

**File:** `apps/mularpay-api/src/vtu/dto/verify-meter.dto.ts`

```typescript
import { IsString, IsEnum } from 'class-validator';

enum MeterType {
  PREPAID = 'PREPAID',
  POSTPAID = 'POSTPAID',
}

export class VerifyMeterDto {
  @IsString()
  disco: string;

  @IsString()
  meterNumber: string;

  @IsEnum(MeterType)
  meterType: MeterType;
}
```

**File:** `apps/mularpay-api/src/vtu/dto/get-orders.dto.ts`

```typescript
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { VTUServiceType, TransactionStatus } from '@prisma/client';

export class GetOrdersDto {
  @IsOptional()
  @IsEnum(VTUServiceType)
  serviceType?: VTUServiceType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  endDate?: string; // ISO date string

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
```

### Step 4: Controller (API Endpoints)

**File:** `apps/mularpay-api/src/vtu/vtu.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { VTUService } from './vtu.service';
import {
  PurchaseAirtimeDto,
  PurchaseDataDto,
  PayCableTVDto,
  PayElectricityDto,
  VerifySmartcardDto,
  VerifyMeterDto,
  GetOrdersDto,
} from './dto';

@Controller('vtu')
@UseGuards(JwtAuthGuard)
export class VTUController {
  constructor(private readonly vtuService: VTUService) {}

  // ==================== Product Catalog ====================

  @Get('airtime/providers')
  getAirtimeProviders() {
    return this.vtuService.getAirtimeProviders();
  }

  @Get('data/plans/:network')
  getDataPlans(@Param('network') network: string) {
    return this.vtuService.getDataPlans(network);
  }

  @Get('cable-tv/plans/:provider')
  getCableTVPlans(@Param('provider') provider: string) {
    return this.vtuService.getCableTVPlans(provider);
  }

  @Get('electricity/providers')
  getElectricityProviders() {
    return this.vtuService.getElectricityProviders();
  }

  // ==================== Validation ====================

  @Post('cable-tv/verify')
  verifySmartcard(@Body() dto: VerifySmartcardDto) {
    return this.vtuService.validateSmartcard(dto.smartcardNumber, dto.provider);
  }

  @Post('electricity/verify')
  verifyMeterNumber(@Body() dto: VerifyMeterDto) {
    return this.vtuService.validateMeterNumber(dto.meterNumber, dto.disco, dto.meterType);
  }

  // ==================== Purchases ====================

  @Post('airtime/purchase')
  purchaseAirtime(@GetUser('id') userId: string, @Body() dto: PurchaseAirtimeDto) {
    return this.vtuService.purchaseAirtime(userId, dto);
  }

  @Post('data/purchase')
  purchaseData(@GetUser('id') userId: string, @Body() dto: PurchaseDataDto) {
    return this.vtuService.purchaseDataBundle(userId, dto);
  }

  @Post('cable-tv/pay')
  payCableTVSubscription(@GetUser('id') userId: string, @Body() dto: PayCableTVDto) {
    return this.vtuService.payCableTVSubscription(userId, dto);
  }

  @Post('electricity/pay')
  payElectricityBill(@GetUser('id') userId: string, @Body() dto: PayElectricityDto) {
    return this.vtuService.payElectricityBill(userId, dto);
  }

  // ==================== Order Management ====================

  @Get('orders')
  getOrders(@GetUser('id') userId: string, @Query() filters: GetOrdersDto) {
    return this.vtuService.getOrders(userId, filters);
  }

  @Get('orders/:orderId')
  getOrderById(@GetUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.vtuService.getOrderById(orderId, userId);
  }

  @Get('orders/reference/:reference')
  getOrderByReference(@GetUser('id') userId: string, @Param('reference') reference: string) {
    return this.vtuService.getOrderByReference(reference, userId);
  }

  @Post('orders/:orderId/retry')
  retryFailedOrder(@GetUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.vtuService.retryFailedOrder(orderId, userId);
  }
}
```

### Step 5: Webhook Handler

**File:** `apps/mularpay-api/src/vtu/vtu-webhooks.controller.ts`

```typescript
import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { VTPassService } from './services/vtpass.service';
import { VTUService } from './vtu.service';

@Controller('vtu/webhooks')
export class VTUWebhooksController {
  constructor(
    private readonly vtpassService: VTPassService,
    private readonly vtuService: VTUService,
  ) {}

  @Post('vtpass')
  async handleVTPassWebhook(
    @Headers('x-vtpass-signature') signature: string,
    @Body() payload: any,
  ) {
    console.log('[VTUWebhooksController] Webhook received:', payload.event);

    // Verify webhook signature
    const isValid = this.vtpassService.verifyWebhook(signature, payload);
    if (!isValid) {
      console.error('[VTUWebhooksController] Invalid webhook signature');
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
        console.log('[VTUWebhooksController] Unhandled event:', payload.event);
    }

    return { status: 'success' };
  }

  private async handleTransactionSuccess(data: any) {
    console.log('[VTUWebhooksController] Transaction success:', data.reference);

    await this.vtuService.updateTransactionStatus(data.reference, 'COMPLETED');
  }

  private async handleTransactionFailed(data: any) {
    console.log('[VTUWebhooksController] Transaction failed:', data.reference);

    // Update status and refund user
    await this.vtuService.updateTransactionStatus(data.reference, 'FAILED');

    await this.vtuService.refundFailedOrder(data.reference);
  }

  private async handleTransactionPending(data: any) {
    console.log('[VTUWebhooksController] Transaction pending:', data.reference);

    await this.vtuService.updateTransactionStatus(data.reference, 'PENDING');
  }
}
```

### Step 6: Module Definition

**File:** `apps/mularpay-api/src/vtu/vtu.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VTUController } from './vtu.controller';
import { VTUWebhooksController } from './vtu-webhooks.controller';
import { VTUService } from './vtu.service';
import { VTPassService } from './services/vtpass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ConfigModule, PrismaModule, WalletModule],
  controllers: [VTUController, VTUWebhooksController],
  providers: [VTUService, VTPassService],
  exports: [VTUService],
})
export class VTUModule {}
```

### Step 7: Update AppModule

**File:** `apps/mularpay-api/src/app.module.ts`

```typescript
import { VTUModule } from './vtu/vtu.module';

@Module({
  imports: [
    // ... existing modules
    VTUModule, // Add this
  ],
})
export class AppModule {}
```

---

## 🔐 Security Considerations

### 1. Transaction Locking

```typescript
// Prevent concurrent VTU purchases
async lockForTransaction(userId: string) {
  const wallet = await this.prisma.wallet.findUnique({
    where: { userId },
  });

  if (wallet.isLocked) {
    throw new ConflictException('Another transaction is in progress');
  }

  await this.prisma.wallet.update({
    where: { userId },
    data: { isLocked: true },
  });

  return wallet;
}

async unlockForTransaction(userId: string) {
  await this.prisma.wallet.update({
    where: { userId },
    data: { isLocked: false },
  });
}
```

### 2. Idempotency

```typescript
// Check if order already exists with same parameters
const existingOrder = await this.prisma.vTUOrder.findFirst({
  where: {
    userId,
    serviceType: 'AIRTIME',
    recipient: dto.phone,
    amount: dto.amount,
    status: { in: ['PENDING', 'COMPLETED'] },
    createdAt: { gte: new Date(Date.now() - 60000) }, // Last 1 minute
  },
});

if (existingOrder) {
  throw new ConflictException('Duplicate order detected');
}
```

### 3. Webhook Verification

```typescript
verifyWebhook(signature: string, payload: any): boolean {
  const hash = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

### 4. Phone Number Validation

```typescript
validatePhone(phone: string): boolean {
  // Nigerian phone number format: 080xxxxxxxx, 081xxxxxxxx, 070xxxxxxxx, 090xxxxxxxx, 091xxxxxxxx
  const regex = /^0[7-9][0-1]\d{8}$/;
  return regex.test(phone);
}
```

---

## 📡 VTPass API Integration

### Authentication

VTPass uses **API Key** authentication:

```typescript
const headers = {
  'api-key': process.env.VTPASS_API_KEY,
  'secret-key': process.env.VTPASS_SECRET_KEY,
  'Content-Type': 'application/json',
};
```

### Endpoints

#### 1. Get Service Variations (Products)

```http
GET https://sandbox.vtpass.com/api/service-variations?serviceID=mtn-data
```

**Response:**

```json
{
  "response_description": "000",
  "content": {
    "varations": [
      {
        "variation_code": "mtn-10mb-100",
        "name": "10MB",
        "variation_amount": "100",
        "fixedPrice": "Yes"
      },
      {
        "variation_code": "mtn-1gb-1000",
        "name": "1GB - 30 Days",
        "variation_amount": "1000",
        "fixedPrice": "Yes"
      }
    ]
  }
}
```

#### 2. Verify Customer (Smartcard/Meter)

```http
POST https://sandbox.vtpass.com/api/merchant-verify
Content-Type: application/json

{
  "billersCode": "1234567890",
  "serviceID": "dstv"
}
```

**Response:**

```json
{
  "code": "000",
  "content": {
    "Customer_Name": "JOHN DOE",
    "Status": "ACTIVE",
    "Due_Date": "2024-12-31",
    "Customer_Number": "1234567890",
    "Customer_Type": "PREPAID"
  }
}
```

#### 3. Purchase Airtime

```http
POST https://sandbox.vtpass.com/api/pay
Content-Type: application/json

{
  "request_id": "VTU_AIR_1762703...",
  "serviceID": "mtn",
  "amount": 500,
  "phone": "08012345678"
}
```

**Response:**

```json
{
  "code": "000",
  "content": {
    "transactions": {
      "status": "delivered",
      "product_name": "MTN Airtime VTU",
      "unique_element": "08012345678",
      "unit_price": 500,
      "quantity": 1,
      "service_verification": null,
      "channel": "api",
      "commission": 10,
      "total_amount": 500,
      "discount": null,
      "type": "Airtime Recharge",
      "email": null,
      "phone": "08012345678",
      "name": null,
      "convinience_fee": 0,
      "amount": 500,
      "platform": "api",
      "method": "api",
      "transactionId": "20241109123456789"
    }
  },
  "response_description": "000",
  "requestId": "VTU_AIR_1762703...",
  "amount": "500.00",
  "transaction_date": {
    "date": "2024-11-09 12:34:56"
  },
  "purchased_code": ""
}
```

#### 4. Purchase Data Bundle

```http
POST https://sandbox.vtpass.com/api/pay
Content-Type: application/json

{
  "request_id": "VTU_DATA_1762703...",
  "serviceID": "mtn-data",
  "billersCode": "08012345678",
  "variation_code": "mtn-1gb-1000",
  "amount": 1000,
  "phone": "08012345678"
}
```

#### 5. Pay Cable TV

```http
POST https://sandbox.vtpass.com/api/pay
Content-Type: application/json

{
  "request_id": "VTU_CABLE_1762703...",
  "serviceID": "dstv",
  "billersCode": "1234567890",
  "variation_code": "dstv-compact",
  "amount": 10500,
  "phone": "08012345678",
  "subscription_type": "renew"
}
```

#### 6. Query Transaction Status

```http
POST https://sandbox.vtpass.com/api/requery
Content-Type: application/json

{
  "request_id": "VTU_AIR_1762703..."
}
```

---

## 🧪 Testing

### Test Environment

**VTPass Sandbox:**

- Base URL: `https://sandbox.vtpass.com/api`
- Test API Key: Provided by VTPass
- Test Secret Key: Provided by VTPass

**Test Numbers/Cards:**

- Phone: `08011111111`
- Smartcard: `1234567890`
- Meter: `1234567890`

### Test Scenarios

#### 1. Airtime Purchase (Success)

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 500
  }'
```

**Expected:**

```json
{
  "reference": "VTU_AIR_1762703...",
  "orderId": "...",
  "status": "COMPLETED",
  "amount": 500,
  "fee": 10,
  "totalAmount": 510,
  "provider": "MTN",
  "recipient": "08012345678"
}
```

#### 2. Data Purchase (Success)

```bash
# First, get data plans
curl -X GET http://localhost:3001/api/vtu/data/plans/MTN \
  -H "Authorization: Bearer $TOKEN"

# Then purchase
curl -X POST http://localhost:3001/api/vtu/data/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "productCode": "mtn-1gb-1000"
  }'
```

#### 3. Cable TV (Verify then Pay)

```bash
# Verify smartcard
curl -X POST http://localhost:3001/api/vtu/cable-tv/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1234567890"
  }'

# Get plans
curl -X GET http://localhost:3001/api/vtu/cable-tv/plans/DSTV \
  -H "Authorization: Bearer $TOKEN"

# Pay subscription
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1234567890",
    "productCode": "dstv-compact"
  }'
```

#### 4. Electricity (Verify then Pay)

```bash
# Verify meter
curl -X POST http://localhost:3001/api/vtu/electricity/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "IKEDC",
    "meterNumber": "1234567890",
    "meterType": "PREPAID"
  }'

# Pay electricity
curl -X POST http://localhost:3001/api/vtu/electricity/pay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "IKEDC",
    "meterNumber": "1234567890",
    "meterType": "PREPAID",
    "amount": 5000
  }'
```

#### 5. Get Orders

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?serviceType=AIRTIME&status=COMPLETED" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Response Types

### Success Response

```typescript
interface VTUPurchaseResponse {
  reference: string;
  orderId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  fee: number;
  totalAmount: number;
  provider: string;
  recipient: string;
  productName?: string;
  message?: string;
}
```

### Order Response

```typescript
interface VTUOrderResponse {
  id: string;
  reference: string;
  serviceType: 'AIRTIME' | 'DATA' | 'CABLE_TV' | 'ELECTRICITY';
  provider: string;
  recipient: string;
  productCode: string;
  productName: string;
  amount: string;
  status: TransactionStatus;
  providerRef?: string;
  createdAt: string;
  completedAt?: string;
}
```

### Orders List Response

```typescript
interface VTUOrdersResponse {
  data: VTUOrderResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalSpent: string;
    completedOrders: number;
    pendingOrders: number;
    failedOrders: number;
  };
}
```

---

## 🚨 Error Handling

### Common Errors

```typescript
// Insufficient balance
{
  "statusCode": 400,
  "message": "Insufficient wallet balance. Available: ₦500, Required: ₦1,000",
  "error": "Bad Request"
}

// Invalid phone number
{
  "statusCode": 400,
  "message": "Invalid Nigerian phone number",
  "error": "Bad Request"
}

// Wallet locked (concurrent transaction)
{
  "statusCode": 409,
  "message": "Another transaction is in progress",
  "error": "Conflict"
}

// VTPass API error
{
  "statusCode": 502,
  "message": "Service provider temporarily unavailable. Please try again.",
  "error": "Bad Gateway"
}

// Invalid smartcard
{
  "statusCode": 400,
  "message": "Invalid smartcard number or customer not found",
  "error": "Bad Request"
}
```

### Retry Logic

```typescript
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

  // Check if already refunded
  if (order.refunded) {
    throw new BadRequestException('Order already refunded, cannot retry');
  }

  // Retry the purchase
  // ... (same logic as original purchase)
}
```

---

## 📈 Performance Considerations

### 1. Caching Product Catalogs

```typescript
@Injectable()
export class VTUService {
  private readonly CACHE_TTL = 3600; // 1 hour

  async getDataPlans(network: string) {
    const cacheKey = `data-plans:${network}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from VTPass
    const plans = await this.vtpassService.getDataProducts(network);

    // Cache for 1 hour
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(plans));

    return plans;
  }
}
```

### 2. Async Webhook Processing

```typescript
// Don't block webhook response
@Post('vtpass')
async handleVTPassWebhook(@Body() payload: any) {
  // Verify signature first
  const isValid = this.vtpassService.verifyWebhook(signature, payload);
  if (!isValid) {
    throw new BadRequestException('Invalid signature');
  }

  // Return immediately
  setImmediate(() => this.processWebhook(payload));

  return { status: 'success' };
}

private async processWebhook(payload: any) {
  // Process in background
  try {
    await this.handleTransactionUpdate(payload);
  } catch (error) {
    console.error('[VTU] Webhook processing error:', error);
  }
}
```

### 3. Rate Limiting

```typescript
@Controller('vtu')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
export class VTUController {
  // ...
}
```

---

## 🎯 Success Metrics

### Key Performance Indicators (KPIs)

- **Transaction Success Rate:** > 95%
- **Average Processing Time:** < 10 seconds
- **Failed Transaction Refund Time:** < 1 minute
- **API Uptime:** > 99.5%

### Monitoring

```typescript
// Log transaction metrics
console.log('[VTU] Purchase metrics:', {
  userId,
  serviceType: 'AIRTIME',
  provider: 'MTN',
  amount: 500,
  fee: 10,
  status: 'COMPLETED',
  processingTime: 5234, // ms
  timestamp: new Date(),
});
```

---

## 🚀 Deployment Checklist

### Environment Variables

```env
# VTPass (Production)
VTPASS_API_KEY=your_production_api_key
VTPASS_SECRET_KEY=your_production_secret_key
VTPASS_PUBLIC_KEY=your_production_public_key
VTPASS_BASE_URL=https://vtpass.com/api
VTPASS_WEBHOOK_SECRET=your_webhook_secret

# VTPass (Sandbox)
VTPASS_API_KEY=your_sandbox_api_key
VTPASS_SECRET_KEY=your_sandbox_secret_key
VTPASS_PUBLIC_KEY=your_sandbox_public_key
VTPASS_BASE_URL=https://sandbox.vtpass.com/api
VTPASS_WEBHOOK_SECRET=your_webhook_secret
```

### Pre-launch Tasks

- [ ] VTPass account created (production)
- [ ] API keys obtained and tested
- [ ] Webhook URL configured in VTPass dashboard
- [ ] Test all services in sandbox
- [ ] Test webhook delivery
- [ ] Load test with 100+ concurrent requests
- [ ] Set up monitoring and alerts
- [ ] Document API for frontend team
- [ ] Create user guide for VTU services

---

## 📚 API Documentation

### Endpoints Summary

| Method | Endpoint                               | Description            | Auth |
| ------ | -------------------------------------- | ---------------------- | ---- |
| GET    | `/api/vtu/airtime/providers`           | List networks          | ✅   |
| GET    | `/api/vtu/data/plans/:network`         | Get data plans         | ✅   |
| GET    | `/api/vtu/cable-tv/plans/:provider`    | Get cable TV plans     | ✅   |
| GET    | `/api/vtu/electricity/providers`       | Get DISCOs             | ✅   |
| POST   | `/api/vtu/cable-tv/verify`             | Verify smartcard       | ✅   |
| POST   | `/api/vtu/electricity/verify`          | Verify meter           | ✅   |
| POST   | `/api/vtu/airtime/purchase`            | Buy airtime            | ✅   |
| POST   | `/api/vtu/data/purchase`               | Buy data               | ✅   |
| POST   | `/api/vtu/cable-tv/pay`                | Pay cable TV           | ✅   |
| POST   | `/api/vtu/electricity/pay`             | Pay electricity        | ✅   |
| GET    | `/api/vtu/orders`                      | Get user orders        | ✅   |
| GET    | `/api/vtu/orders/:orderId`             | Get order details      | ✅   |
| GET    | `/api/vtu/orders/reference/:reference` | Get order by reference | ✅   |
| POST   | `/api/vtu/orders/:orderId/retry`       | Retry failed order     | ✅   |
| POST   | `/api/vtu/webhooks/vtpass`             | VTPass webhook         | ❌   |

---

## 🔄 Next Steps After Phase 2

### Phase 2.2: Gift Card Trading

- Buy gift cards (Amazon, iTunes, Steam, etc.)
- Sell gift cards to platform
- Automated card code delivery
- Rate management system

### Phase 2.3: Crypto Trading (Future)

- Buy/Sell Bitcoin, Ethereum, USDT
- Real-time rates
- Escrow system
- KYC Tier 3 required

---

**Implementation Date:** November 10, 2025  
**Status:** Ready to Implement 🚀  
**Estimated Duration:** 4-5 days  
**Priority:** HIGH (Core VTU feature)

---

**Built with ❤️ for Nigeria 🇳🇬**
