# Alchemy Production Migration Plan - Part 2

## Continuation: Webhooks, Admin Dashboard, Mobile, Testing & Deployment

---

## Webhook Integration (Week 4)

### Webhook Handler Service

Create `apps/raverpay-api/src/alchemy/webhooks/alchemy-webhook.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlchemyWebhookService {
  private readonly logger = new Logger(AlchemyWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationDispatcherService,
    private configService: ConfigService,
  ) {}

  /**
   * Verify webhook signature from Alchemy
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const signingSecret = this.configService.get('ALCHEMY_WEBHOOK_SIGNING_SECRET');

    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Handle Address Activity webhook
   */
  async handleAddressActivity(payload: any) {
    this.logger.log(
      `Received Address Activity webhook for ${payload.event.activity.length} activities`,
    );

    for (const activity of payload.event.activity) {
      await this.processActivity(activity);
    }
  }

  /**
   * Process a single activity (transaction)
   */
  private async processActivity(activity: any) {
    const { fromAddress, toAddress, value, asset, hash, blockNum, category } = activity;

    // Find wallet by address
    const wallet = await this.prisma.alchemyWallet.findFirst({
      where: {
        OR: [{ address: fromAddress.toLowerCase() }, { address: toAddress.toLowerCase() }],
      },
      include: { user: true },
    });

    if (!wallet) {
      this.logger.warn(`No wallet found for activity: ${hash}`);
      return;
    }

    // Determine transaction type
    const isOutgoing = fromAddress.toLowerCase() === wallet.address.toLowerCase();
    const type = isOutgoing ? 'SEND' : 'RECEIVE';

    // Check if transaction already exists
    const existing = await this.prisma.alchemyTransaction.findUnique({
      where: { transactionHash: hash },
    });

    if (existing) {
      // Update transaction status
      await this.prisma.alchemyTransaction.update({
        where: { id: existing.id },
        data: {
          state: 'CONFIRMED',
          blockNumber: BigInt(parseInt(blockNum, 16)),
          confirmations: 1,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Updated existing transaction ${existing.id} to CONFIRMED`);
    } else {
      // Create new transaction (incoming transaction not initiated by us)
      const reference = `ALCHEMY-WEBHOOK-${Date.now()}-${hash.slice(0, 8)}`;

      const transaction = await this.prisma.alchemyTransaction.create({
        data: {
          reference,
          userId: wallet.userId,
          walletId: wallet.id,
          type,
          state: 'CONFIRMED',
          sourceAddress: fromAddress,
          destinationAddress: toAddress,
          tokenAddress: asset,
          blockchain: wallet.blockchain,
          network: wallet.network,
          amount: value,
          transactionHash: hash,
          blockNumber: BigInt(parseInt(blockNum, 16)),
          confirmations: 1,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Created new ${type} transaction ${transaction.id} from webhook`);
    }

    // Send notification to user
    await this.sendTransactionNotification(wallet.userId, type, value, hash);
  }

  /**
   * Send notification to user about transaction
   */
  private async sendTransactionNotification(
    userId: string,
    type: 'SEND' | 'RECEIVE',
    amount: string,
    txHash: string,
  ) {
    const message = type === 'RECEIVE' ? `You received ${amount} USDC` : `You sent ${amount} USDC`;

    await this.notificationService.dispatchNotification({
      userId,
      eventType: type === 'RECEIVE' ? 'USDC_RECEIVED' : 'USDC_SENT',
      channels: ['PUSH', 'IN_APP', 'EMAIL'],
      title: type === 'RECEIVE' ? 'USDC Received' : 'USDC Sent',
      message,
      data: {
        txHash,
        amount,
        type,
      },
    });
  }
}
```

### Webhook Controller

Create `apps/raverpay-api/src/alchemy/webhooks/alchemy-webhook.controller.ts`:

```typescript
import { Controller, Post, Body, Headers, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AlchemyWebhookService } from './alchemy-webhook.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Webhooks - Alchemy')
@Controller('webhooks/alchemy')
export class AlchemyWebhookController {
  private readonly logger = new Logger(AlchemyWebhookController.name);

  constructor(private webhookService: AlchemyWebhookService) {}

  @Post('address-activity')
  @ApiOperation({ summary: 'Receive Alchemy Address Activity webhooks' })
  async handleAddressActivity(
    @Body() payload: any,
    @Headers('x-alchemy-signature') signature: string,
  ) {
    this.logger.log('Received Address Activity webhook');

    // Verify signature
    const payloadString = JSON.stringify(payload);
    const isValid = this.webhookService.verifyWebhookSignature(payloadString, signature);

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Process webhook
    try {
      await this.webhookService.handleAddressActivity(payload);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw new HttpException('Error processing webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('mined-transactions')
  @ApiOperation({ summary: 'Receive Alchemy Mined Transaction webhooks' })
  async handleMinedTransaction(
    @Body() payload: any,
    @Headers('x-alchemy-signature') signature: string,
  ) {
    this.logger.log('Received Mined Transaction webhook');

    // Verify signature
    const payloadString = JSON.stringify(payload);
    const isValid = this.webhookService.verifyWebhookSignature(payloadString, signature);

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Process webhook (similar to address activity)
    try {
      await this.webhookService.handleAddressActivity(payload);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw new HttpException('Error processing webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

---

## Admin Dashboard Integration (Week 5)

### Required Admin Features

1. **Alchemy Wallet Management**
   - View all Alchemy wallets
   - See wallet balances
   - View transaction history
   - Manually trigger key rotation
2. **Gas Spending Monitoring**
   - Daily/monthly gas spending by user
   - Gas policy usage
   - Alerts for high spending
3. **Transaction Monitoring**
   - Real-time transaction feed
   - Failed transaction alerts
   - Pending transaction status

### Admin API Endpoints

Create `apps/raverpay-api/src/admin/alchemy/admin-alchemy.controller.ts`:

```typescript
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin - Alchemy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/alchemy')
export class AdminAlchemyController {
  constructor(private prisma: PrismaService) {}

  @Get('wallets')
  @ApiOperation({ summary: 'Get all Alchemy wallets' })
  async getAllWallets(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('blockchain') blockchain?: string,
  ) {
    const skip = (page - 1) * limit;

    const wallets = await this.prisma.alchemyWallet.findMany({
      where: blockchain ? { blockchain } : {},
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.alchemyWallet.count({
      where: blockchain ? { blockchain } : {},
    });

    return {
      wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('wallets/:id')
  @ApiOperation({ summary: 'Get wallet details' })
  async getWalletDetails(@Param('id') id: string) {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        alchemyTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return wallet;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all Alchemy transactions' })
  async getAllTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('state') state?: string,
  ) {
    const skip = (page - 1) * limit;

    const transactions = await this.prisma.alchemyTransaction.findMany({
      where: state ? { state: state as any } : {},
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        wallet: {
          select: {
            id: true,
            address: true,
            blockchain: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.alchemyTransaction.count({
      where: state ? { state: state as any } : {},
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('gas-spending')
  @ApiOperation({ summary: 'Get gas spending analytics' })
  async getGasSpending(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const spending = await this.prisma.alchemyGasSpending.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate total spending
    const totalGasUsd = spending.reduce((sum, record) => sum + parseFloat(record.totalGasUsd), 0);

    const totalTransactions = spending.reduce((sum, record) => sum + record.transactionCount, 0);

    return {
      spending,
      summary: {
        totalGasUsd,
        totalTransactions,
        averageGasPerTransaction: totalTransactions > 0 ? totalGasUsd / totalTransactions : 0,
      },
    };
  }
}
```

### Admin Dashboard UI Components

Create in `apps/raverpay-admin/`:

1. **Alchemy Wallets Page** (`app/alchemy/wallets/page.tsx`)
2. **Alchemy Transactions Page** (`app/alchemy/transactions/page.tsx`)
3. **Gas Spending Dashboard** (`app/alchemy/gas-spending/page.tsx`)
4. **Alchemy Settings** (`app/alchemy/settings/page.tsx`)

---

## Mobile App Integration (Week 6)

### Mobile SDK Setup

The mobile app won't directly use Alchemy SDK. All interactions go through your API.

### Required Mobile Features

1. **Wallet Creation**
   - Button to create Alchemy wallet
   - Show wallet address
   - Display balance

2. **Send/Receive USDC**
   - Send USDC form
   - Receive QR code
   - Transaction history

3. **Transaction History**
   - List all transactions
   - Transaction details

### Mobile API Integration

Create service in `apps/raverpay-mobile/services/alchemy.service.ts`:

```typescript
import axios from 'axios';
import { API_BASE_URL } from '../config';

export class AlchemyService {
  private apiUrl = `${API_BASE_URL}/alchemy`;

  /**
   * Create Alchemy wallet for user
   */
  async createWallet(params: { blockchain: string; network: string }) {
    const response = await axios.post(`${this.apiUrl}/wallets`, params);
    return response.data;
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string) {
    const response = await axios.get(`${this.apiUrl}/wallets/${walletId}`);
    return response.data;
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string, tokenAddress: string) {
    const response = await axios.get(`${this.apiUrl}/wallets/${walletId}/balance`, {
      params: { tokenAddress },
    });
    return response.data;
  }

  /**
   * Send USDC
   */
  async sendUSDC(params: {
    walletId: string;
    destinationAddress: string;
    amount: string;
    tokenAddress: string;
  }) {
    const response = await axios.post(`${this.apiUrl}/transactions/send`, params);
    return response.data;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(walletId: string) {
    const response = await axios.get(`${this.apiUrl}/transactions`, { params: { walletId } });
    return response.data;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string) {
    const response = await axios.get(`${this.apiUrl}/transactions/${transactionId}`);
    return response.data;
  }
}
```

---

## Security Implementation

### Critical Security Checklist

#### 1. Private Key Security

**Environment Variables**:

```bash
# NEVER commit these to git
ALCHEMY_ENCRYPTION_MASTER_KEY=<generate strong 64-char hex key>
ALCHEMY_BACKUP_ENCRYPTION_KEY=<for key rotation>
```

**Generate Master Key**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Key Rotation Strategy**:

- Rotate master key every 90 days
- Keep old key for 30 days (to decrypt old data)
- Re-encrypt all wallets with new key
- Document rotation in security log

#### 2. Access Controls

```typescript
// Only transaction service can decrypt keys
@Injectable()
export class AlchemyTransactionService {
  // This is OK - service needs to sign transactions
  private async getDecryptedPrivateKey(...) {
    // Audit log before decryption
    await this.auditService.log({
      action: 'DECRYPT_ALCHEMY_KEY',
      resource: 'AlchemyWallet',
      resourceId: walletId,
      severity: 'HIGH',
    });

    return this.encryptionService.decryptPrivateKey(...);
  }
}

// NEVER expose decrypted key in API response
@Get('wallets/:id/private-key') // ❌ NEVER DO THIS
async getPrivateKey() {
  throw new ForbiddenException('Private keys cannot be exposed');
}
```

#### 3. Rate Limiting

```typescript
// Apply strict rate limits to transaction endpoints
@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    limit: 10, // 10 transactions
    ttl: 60000, // per minute
  },
})
@Post('transactions/send')
async sendTransaction() {
  // ...
}
```

#### 4. 2FA for Large Transactions

```typescript
@Post('transactions/send')
async sendTransaction(
  @Body() dto: SendTransactionDto,
  @CurrentUser() user: User,
) {
  // Require 2FA for transactions > $1000
  const amountUsd = await this.getAmountInUsd(dto.amount);

  if (amountUsd > 1000 && !dto.mfaCode) {
    throw new BadRequestException('2FA required for large transactions');
  }

  if (dto.mfaCode) {
    const isValid = await this.mfaService.verifyCode(user.id, dto.mfaCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }
  }

  // Proceed with transaction
}
```

#### 5. Transaction Validation

```typescript
async sendTransaction(dto: SendTransactionDto) {
  // 1. Validate address format
  if (!ethers.isAddress(dto.destinationAddress)) {
    throw new BadRequestException('Invalid destination address');
  }

  // 2. Check balance
  const balance = await this.getBalance(...);
  if (BigInt(balance) < BigInt(dto.amount)) {
    throw new BadRequestException('Insufficient balance');
  }

  // 3. Check daily limit
  const dailySpent = await this.getDailySpent(user.id);
  if (dailySpent + amountUsd > user.dailyLimit) {
    throw new BadRequestException('Daily limit exceeded');
  }

  // 4. Check for suspicious patterns
  const isSuspicious = await this.checkSuspiciousActivity(user.id, dto);
  if (isSuspicious) {
    await this.alertSecurityTeam(user.id, dto);
    throw new BadRequestException('Transaction blocked for security review');
  }

  // Proceed
}
```

---

## Testing Strategy

### Phase 1: Unit Tests (Week 7)

```typescript
// Test encryption/decryption
describe('AlchemyKeyEncryptionService', () => {
  it('should encrypt and decrypt private key', () => {
    const privateKey = '0x1234567890abcdef...';
    const userId = 'user-123';

    const encrypted = service.encryptPrivateKey(privateKey, userId);
    const decrypted = service.decryptPrivateKey(encrypted, userId);

    expect(decrypted).toBe(privateKey);
  });

  it('should fail decryption with wrong userId', () => {
    const encrypted = service.encryptPrivateKey('0x123...', 'user-1');
    expect(() => {
      service.decryptPrivateKey(encrypted, 'user-2');
    }).toThrow();
  });
});

// Test wallet generation
describe('AlchemyWalletGenerationService', () => {
  it('should generate valid EOA wallet', async () => {
    const wallet = await service.generateEOAWallet('user-123', 'POLYGON', 'mainnet');

    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.blockchain).toBe('POLYGON');
  });
});

// Test transaction service
describe('AlchemyTransactionService', () => {
  it('should send USDC transaction', async () => {
    const result = await service.sendToken({
      userId: 'user-123',
      walletId: 'wallet-456',
      destinationAddress: '0xRecipient...',
      amount: '1000000', // 1 USDC
      tokenAddress: USDC_ADDRESS,
      blockchain: 'POLYGON',
      network: 'mainnet',
    });

    expect(result.transactionHash).toBeDefined();
    expect(result.status).toBe('SUBMITTED');
  });
});
```

### Phase 2: Integration Tests (Week 7-8)

Test on **Base Sepolia testnet**:

1. **Wallet Creation Flow**
   - Create wallet via API
   - Verify wallet in database
   - Verify wallet on blockchain (using block explorer)

2. **Transaction Flow**
   - Fund wallet with testnet USDC
   - Send USDC to another address
   - Verify transaction on blockchain
   - Check database transaction record
   - Verify webhook received

3. **Gas Sponsorship**
   - Create Gas Manager policy on testnet
   - Send transaction with gas sponsorship
   - Verify gas was sponsored (no native token balance needed)

4. **Webhook Processing**
   - Send test webhook from Alchemy
   - Verify signature validation
   - Verify transaction update in database
   - Verify notification sent to user

### Phase 3: Security Audit (Week 8)

**External Security Audit Checklist**:

- [ ] Private key encryption reviewed
- [ ] Key storage and access controls reviewed
- [ ] Transaction signing process reviewed
- [ ] API endpoint security reviewed
- [ ] Rate limiting configuration reviewed
- [ ] 2FA implementation reviewed
- [ ] Audit logging reviewed
- [ ] Penetration testing completed

**Tools to Use**:

- Slither (Solidity static analysis) - if using custom smart contracts
- MythX (Smart contract security)
- Manual code review by security expert

---

## Deployment Strategy

### Phase 1: Testnet Deployment (Week 9)

**Objective**: Deploy to staging environment with testnet

```bash
# Environment: Staging
ALCHEMY_PROD_POLYGON_RPC=<Base Sepolia RPC>
ALCHEMY_PROD_API_KEY=<Dev API Key>
ALCHEMY_PROD_GAS_POLICY_ID=<Dev Gas Policy>
```

**Testing Checklist**:

- [ ] Create 10 test wallets
- [ ] Send 50 test transactions
- [ ] Verify all webhooks processed
- [ ] Check gas sponsorship working
- [ ] Verify notifications sent
- [ ] Check admin dashboard displays correctly
- [ ] Test mobile app flows

### Phase 2: Mainnet Soft Launch (Week 10)

**Objective**: Launch to 1% of users on mainnet

**Strategy**:

- Select 50-100 beta users
- Offer incentive for early adoption
- Monitor closely for 1 week

**Feature Flag**:

```typescript
// In user service
async canUseAlchemy(userId: string): Promise<boolean> {
  // Check if user is in beta group
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  // 1% rollout: user ID hash mod 100 < 1
  const hashValue = parseInt(createHash('md5').update(userId).digest('hex').slice(0, 8), 16);
  const rolloutPercentage = 1;

  return (hashValue % 100) < rolloutPercentage;
}
```

**Monitoring**:

- Alert on any transaction failures
- Monitor gas spending
- Track user feedback
- Compare costs with Circle

### Phase 3: Gradual Rollout (Week 11-13)

**Week 11**: 10% of users  
**Week 12**: 50% of users  
**Week 13**: 100% of users

**Rollback Plan**:

- Keep Circle integration active
- If issues detected, reduce rollout percentage
- Document issues and fixes

---

## Monitoring & Alerts

### Metrics to Track

1. **Transaction Metrics**
   - Transaction success rate
   - Average confirmation time
   - Failed transaction reasons
   - Internal vs external transaction ratio

2. **Gas Metrics**
   - Daily gas spending (USD)
   - Gas per transaction
   - Gas policy rejections
   - Cost comparison with Circle

3. **Security Metrics**
   - Failed 2FA attempts
   - Suspicious transaction blocks
   - Key decryption frequency
   - Unauthorized access attempts

4. **System Metrics**
   - Webhook processing time
   - API response times
   - RPC endpoint uptime
   - Database query performance

### Alert Configuration

```typescript
// In monitoring service
async checkAlchemyHealth() {
  // Alert 1: High transaction failure rate
  const failureRate = await this.getTransactionFailureRate('1h');
  if (failureRate > 0.05) { // > 5%
    await this.alertSecurityTeam('High Alchemy transaction failure rate');
  }

  // Alert 2: Gas spending spike
  const dailyGas = await this.getDailyGasSpending();
  if (dailyGas > DAILY_GAS_THRESHOLD) {
    await this.alertFinanceTeam('Alchemy gas spending threshold exceeded');
  }

  // Alert 3: Webhook delays
  const webhookDelay = await this.getAverageWebhookDelay('1h');
  if (webhookDelay > 60000) { // > 1 minute
    await this.alertDevTeam('Alchemy webhook processing delayed');
  }
}
```

---

## Cost Management

### Estimated Monthly Costs

**Alchemy Pricing** (as of 2026):

- RPC calls: Included in free tier up to 300M compute units/month
- Gas Manager: Pay-as-you-go (actual gas cost + small markup)
- Account Kit: Free
- Transfers API: Included

**Example Monthly Cost** (10,000 active users):

- RPC calls: $0 (under free tier)
- Gas sponsorship: ~$0.01 per transaction × 50,000 transactions = $500
- **Total**: ~$500/month

**Comparison with Circle**:

- Circle: ~$1,500/month for same volume
- **Savings**: ~$1,000/month (67% cheaper)

### Cost Optimization Strategies

1. **Internal Transfers**
   - Skip blockchain for internal transfers
   - Save 100% gas on internal transfers
2. **Batch Transactions**
   - Batch multiple transfers into one transaction
   - Save gas fees
3. **Gas Price Optimization**
   - Monitor gas prices
   - Process non-urgent transactions during low gas periods
4. **Gas Policy Tuning**
   - Set appropriate spending limits
   - Reject spam/abuse transactions
5. **Network Selection**
   - Use cheapest network (Base or Polygon)
   - Avoid Ethereum mainnet unless necessary

---

## Risk Mitigation

### Risk Matrix

| Risk                       | Probability | Impact   | Mitigation                                           |
| -------------------------- | ----------- | -------- | ---------------------------------------------------- |
| Private key breach         | Low         | Critical | Strong encryption, HSM, audit logs                   |
| Transaction failures       | Medium      | High     | Retry logic, monitoring, Circle fallback             |
| Gas cost spike             | Medium      | Medium   | Spending limits, alerts, policy tuning               |
| Alchemy downtime           | Low         | High     | Retry logic, multiple RPC providers, Circle fallback |
| Regulatory issues          | Low         | High     | Legal review, compliance documentation               |
| User error (wrong address) | High        | Low      | Address validation, confirmation prompts             |

### Disaster Recovery Plan

**Scenario 1: Alchemy Service Outage**

1. Detect via health checks
2. Switch to Circle for new transactions
3. Queue Alchemy transactions for retry
4. Notify users of temporary slowdown
5. Resume when Alchemy recovers

**Scenario 2: Private Key Compromise Detected**

1. Immediately disable affected wallets
2. Transfer funds to new secure wallets
3. Notify affected users
4. Conduct security audit
5. Implement additional security measures

**Scenario 3: Gas Cost Spike**

1. Auto-disable gas sponsorship if daily limit exceeded
2. Require users to fund gas manually
3. Alert finance team
4. Review and adjust gas policies
5. Communicate with users about temporary changes

---

## Production Checklist

### Pre-Launch (Complete before mainnet)

- [ ] All environment variables configured
- [ ] Alchemy apps created (dev, staging, prod)
- [ ] Gas Manager policies configured
- [ ] Webhooks registered
- [ ] Database migrations run
- [ ] Private key encryption tested
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing (testnet)
- [ ] Security audit completed
- [ ] Legal/compliance review completed
- [ ] Documentation completed
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented
- [ ] Team trained on new system

### Launch Day

- [ ] Deploy to production
- [ ] Verify RPC endpoints working
- [ ] Test wallet creation (manually create 1 wallet)
- [ ] Test transaction (send 1 USDC)
- [ ] Verify webhook received
- [ ] Check monitoring dashboards
- [ ] Monitor for first hour
- [ ] Enable feature flag for 1% users

### Post-Launch (First Week)

- [ ] Daily health checks
- [ ] Review all alerts
- [ ] Check gas spending trends
- [ ] Review user feedback
- [ ] Document any issues
- [ ] Gradual rollout increase

---

## Summary: Key Decisions Required

Before starting implementation, decide on:

1. **Account Type**: EOA or Smart Contract (AA)?
   - Recommendation: **Smart Contract** for better UX (gas sponsorship)

2. **Networks**: Which blockchains to support?
   - Recommendation: **Polygon, Arbitrum, Base** (low fees)

3. **Rollout Strategy**: Big bang or gradual?
   - Recommendation: **Gradual** (1% → 10% → 50% → 100%)

4. **Circle Integration**: Replace or complement?
   - Recommendation: **Complement** (keep both, let users choose)

5. **Security**: Internal or external audit?
   - Recommendation: **External security audit** (mandatory for production)

6. **HSM**: Use Hardware Security Module?
   - Recommendation: **Yes for production** (extra security layer)

---

## Next Steps

1. **Review this plan** with your team
2. **Get security review** of the approach
3. **Estimate budget** for implementation
4. **Prioritize features** (which can be MVP?)
5. **Assign team members** to each phase
6. **Set timeline** with milestones
7. **Get stakeholder approval**
8. **Start with Phase 1** (Infrastructure & Security)

**DO NOT START CODING** until:

- [ ] Security infrastructure is designed
- [ ] Legal/compliance approves
- [ ] Team is trained on Web3 concepts
- [ ] Budget is approved

---

## Contact & Resources

**Alchemy Documentation**:

- Account Kit: https://accountkit.alchemy.com/
- Gas Manager: https://docs.alchemy.com/reference/gas-manager-api
- Webhooks: https://docs.alchemy.com/docs/alchemy-notify
- Transfers API: https://docs.alchemy.com/reference/transfers-api

**Security Resources**:

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Web3 Security: https://consensys.github.io/smart-contract-best-practices/

**Support**:

- Alchemy Discord: https://www.alchemy.com/discord
- Alchemy Support: support@alchemy.com

---

**Document Version**: 1.0  
**Last Updated**: January 25, 2026  
**Next Review**: After security audit completion
