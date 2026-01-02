# Task: Implement USDC Transaction Fees with Two-Transfer Model

## Overview
Implement a configurable transaction fee system where users pay a service fee (default 0.5%, min 0.0625 USDC) on top of their send amount. Fees are collected via a second transfer to a company wallet.

## Business Requirements

### Fee Structure
- **Default fee**: 0.5% of transaction amount
- **Minimum fee**: 0.0625 USDC (approximately ₦100 at ₦1,600/$)
- **Fee is added on top** of send amount
- **Fee collection**: Two separate Circle transfers

### Transaction Flow
```
User wants to send: 100 USDC
Calculated fee (0.5%): 0.5 USDC
Minimum fee check: max(0.5, 0.0625) = 0.5 USDC
Total deducted: 100.5 USDC

Transfer 1: User → Recipient (100 USDC)
Transfer 2: User → Company Wallet (0.5 USDC)
```

## Step 1: Analyze Current Codebase

Confirm the following exist in your codebase:
1. ✅ `CircleTransactionService` with `createTransfer` method
2. ✅ `Transaction` table with `fee` column
3. ✅ `SystemConfig` table for storing settings
4. ✅ `CircleSettingsPage` in admin dashboard
5. ✅ `send.tsx` screen in mobile app

## Step 2: Implementation Plan

### Backend Changes (NestJS)

#### A. Create FeeConfigurationService

**Location**: Create new service `src/circle/services/fee-configuration.service.ts`

**Purpose**: Manage fee configuration stored in SystemConfig table

**Methods to implement**:
- `getFeeConfig()` - Returns current fee settings
- `updateFeeConfig(config)` - Updates fee settings (admin only)
- `calculateFee(amount)` - Calculates fee for given amount
- `isEnabled()` - Checks if fees are enabled

**Configuration structure**:
```typescript
{
  enabled: true,
  percentage: 0.5,
  minFeeUsdc: 0.0625,
  collectionWallets: {
    'BASE-MAINNET': '0xYourWallet...',
    'OP-MAINNET': '0xYourWallet...',
    'ARB-MAINNET': '0xYourWallet...',
    'MATIC-POLYGON': '0xYourWallet...',
    // Same for testnet chains
  }
}
```

**Store in SystemConfig table**:
- Key: `CIRCLE_FEE_CONFIG`
- Value: JSON string of config object

**Fee calculation logic**:
```typescript
calculateFee(amount: number): number {
  if (!this.isEnabled()) return 0;
  
  const config = this.getFeeConfig();
  const calculatedFee = amount * (config.percentage / 100);
  const finalFee = Math.max(calculatedFee, config.minFeeUsdc);
  
  return Number(finalFee.toFixed(6)); // Round to 6 decimals for USDC
}
```

#### B. Update CircleTransactionService

**Inject**: `FeeConfigurationService`

**Modify `createTransfer` method**:

**Step-by-step logic**:

1. **Calculate fee**:
```typescript
const fee = await this.feeConfigService.calculateFee(amount);
const totalRequired = amount + fee;
```

2. **Validate user balance**:
```typescript
const balance = await this.getWalletBalance(walletId);
if (balance < totalRequired) {
  throw new Error(
    `Insufficient balance. Required: ${totalRequired} USDC, Available: ${balance} USDC`
  );
}
```

3. **Get collection wallet for chain**:
```typescript
const wallet = await this.getWallet(walletId);
const blockchain = wallet.blockchain;
const config = await this.feeConfigService.getFeeConfig();
const collectionWallet = config.collectionWallets[blockchain];

if (!collectionWallet) {
  throw new Error(`No fee collection wallet configured for ${blockchain}`);
}
```

4. **Execute main transfer (User → Recipient)**:
```typescript
let mainTransfer;
try {
  mainTransfer = await this.circleApi.createTransfer({
    walletId,
    destinationAddress,
    amount,
    feeLevel: 'MEDIUM'
  });
} catch (error) {
  // Main transfer failed - throw error, nothing executed
  throw new Error(`Transfer failed: ${error.message}`);
}
```

5. **Execute fee transfer (User → Company) with retry logic**:
```typescript
let feeCollected = false;
let feeTransfer = null;

try {
  feeTransfer = await this.circleApi.createTransfer({
    walletId,
    destinationAddress: collectionWallet,
    amount: fee,
    feeLevel: 'MEDIUM'
  });
  feeCollected = true;
} catch (feeError) {
  // Fee collection failed - log but don't fail main transaction
  this.logger.error('Fee collection failed', {
    walletId,
    mainTransferId: mainTransfer.id,
    fee,
    error: feeError.message
  });
  
  // Queue for retry
  await this.queueFeeRetry({
    walletId,
    collectionWallet,
    fee,
    mainTransferId: mainTransfer.id
  });
}
```

6. **Save transaction record**:
```typescript
await this.saveTransaction({
  walletId,
  recipientAddress: destinationAddress,
  amount,
  fee,
  feeCollected,
  totalAmount: totalRequired,
  mainTransferId: mainTransfer.id,
  feeTransferId: feeTransfer?.id,
  blockchain,
  status: 'completed'
});
```

#### C. Add Fee Retry Service

**Location**: Create `src/circle/services/fee-retry.service.ts`

**Purpose**: Retry failed fee collections in background

**Implementation**:
- Create `fee_retry_queue` table with columns:
  - `id`, `walletId`, `collectionWallet`, `fee`, `mainTransferId`, `retryCount`, `status`, `createdAt`
- Background job runs every 5 minutes
- Retry failed fees up to 3 times
- Mark as `failed` after 3 attempts and alert admin

**Retry logic**:
```typescript
async retryFailedFees() {
  const pendingRetries = await this.getPendingRetries();
  
  for (const retry of pendingRetries) {
    if (retry.retryCount >= 3) {
      await this.markAsFailed(retry.id);
      await this.notifyAdmin(retry);
      continue;
    }
    
    try {
      const transfer = await this.circleApi.createTransfer({
        walletId: retry.walletId,
        destinationAddress: retry.collectionWallet,
        amount: retry.fee,
        feeLevel: 'MEDIUM'
      });
      
      // Success - update transaction record
      await this.markFeeCollected(retry.mainTransferId, transfer.id);
      await this.deleteRetry(retry.id);
      
    } catch (error) {
      await this.incrementRetryCount(retry.id);
    }
  }
}
```

#### D. Add API Endpoints

**Location**: `src/circle/circle.controller.ts`

**New endpoints**:

1. `GET /circle/fees/config` (Public/Authenticated)
   - Returns current fee configuration
   - Used by mobile app to calculate fees

2. `PUT /circle/fees/config` (Admin only)
   - Updates fee configuration
   - Requires admin role/permission
   - Logs change in audit table

3. `GET /circle/fees/stats` (Admin only)
   - Returns fee collection statistics:
     - Total fees collected today/week/month
     - Failed fee collections count
     - Average fee per transaction

#### E. Update Transaction Schema

**Modify Transaction table**:
```typescript
{
  // Existing fields...
  fee: decimal,
  feeCollected: boolean,          // NEW
  totalAmount: decimal,            // NEW (amount + fee)
  feeTransferId: string,           // NEW
  mainTransferId: string,          // NEW (rename existing transferId)
}
```

### Mobile App Changes (React Native)

#### A. Update send.tsx Screen

**Add state variables**:
```typescript
const [feeConfig, setFeeConfig] = useState(null);
const [calculatedFee, setCalculatedFee] = useState(0);
const [totalAmount, setTotalAmount] = useState(0);
```

**Fetch fee config on mount**:
```typescript
useEffect(() => {
  async function loadFeeConfig() {
    const config = await api.get('/circle/fees/config');
    setFeeConfig(config);
  }
  loadFeeConfig();
}, []);
```

**Calculate fee as user types**:
```typescript
useEffect(() => {
  if (!amount || !feeConfig) return;
  
  const amountNum = parseFloat(amount);
  const calculatedFee = amountNum * (feeConfig.percentage / 100);
  const finalFee = Math.max(calculatedFee, feeConfig.minFeeUsdc);
  
  setCalculatedFee(finalFee);
  setTotalAmount(amountNum + finalFee);
}, [amount, feeConfig]);
```

**Update balance validation**:
```typescript
const hasInsufficientBalance = parseFloat(balance) < totalAmount;

// Error message
{hasInsufficientBalance && (
  <ErrorText>
    Insufficient balance. Need {totalAmount.toFixed(6)} USDC, 
    Available: {balance} USDC
  </ErrorText>
)}
```

**UI Updates - Review Screen**:

Add to your transaction review/confirmation modal or screen:

```typescript
<TransactionReview>
  <Row>
    <Label>To:</Label>
    <Value>{recipientAddress}</Value>
  </Row>
  
  <Divider />
  
  <Row>
    <Label>Amount:</Label>
    <Value>{amount} USDC</Value>
    <SubValue>≈ ₦{(amount * 1600).toLocaleString()}</SubValue>
  </Row>
  
  {/* NEW: Service Fee */}
  <Row>
    <Label>Service Fee:</Label>
    <Value>{calculatedFee.toFixed(6)} USDC</Value>
    <SubValue>≈ ₦{(calculatedFee * 1600).toLocaleString()}</SubValue>
  </Row>
  
  <Row>
    <Label>Network Fee:</Label>
    <Value>Free ✓</Value>
  </Row>
  
  <Divider />
  
  {/* NEW: Total */}
  <Row bold>
    <Label>Total:</Label>
    <Value>{totalAmount.toFixed(6)} USDC</Value>
    <SubValue>≈ ₦{(totalAmount * 1600).toLocaleString()}</SubValue>
  </Row>
  
  <ConfirmButton onPress={handleSend}>
    Confirm Send
  </ConfirmButton>
</TransactionReview>
```

**Success Screen Update**:
```typescript
<SuccessScreen>
  <Icon>✓</Icon>
  <Title>Sent Successfully</Title>
  
  <DetailRow>
    <Label>Sent:</Label>
    <Value>{amount} USDC</Value>
  </DetailRow>
  
  {/* NEW: Show fee paid */}
  <DetailRow>
    <Label>Fee Paid:</Label>
    <Value>{calculatedFee.toFixed(6)} USDC</Value>
  </DetailRow>
  
  <DetailRow>
    <Label>Total Deducted:</Label>
    <Value>{totalAmount.toFixed(6)} USDC</Value>
  </DetailRow>
  
  <Button onPress={navigateToHome}>Done</Button>
</SuccessScreen>
```

#### B. Update Transaction History

**In transaction list items**, show fee if present:
```typescript
<TransactionItem>
  <Amount>{transaction.amount} USDC</Amount>
  {transaction.fee > 0 && (
    <FeeLabel>+ {transaction.fee} fee</FeeLabel>
  )}
  <Recipient>{transaction.recipientAddress}</Recipient>
</TransactionItem>
```

**In transaction details screen**, show breakdown:
```typescript
<TransactionDetails>
  <Row>
    <Label>Amount Sent:</Label>
    <Value>{transaction.amount} USDC</Value>
  </Row>
  
  <Row>
    <Label>Service Fee:</Label>
    <Value>{transaction.fee} USDC</Value>
  </Row>
  
  <Row>
    <Label>Total:</Label>
    <Value>{transaction.totalAmount} USDC</Value>
  </Row>
  
  <Row>
    <Label>Network:</Label>
    <Value>{transaction.blockchain}</Value>
  </Row>
  
  <Row>
    <Label>Status:</Label>
    <Value>{transaction.feeCollected ? '✓ Complete' : '⚠ Processing'}</Value>
  </Row>
</TransactionDetails>
```

### Admin Dashboard Changes (Next.js)

#### A. Add Fee Configuration Tab

**Location**: Update `CircleSettingsPage` or create new `FeeSettingsPage`

**UI Layout**:
```typescript
<FeeSettingsPage>
  <Section title="Fee Configuration">
    
    <FormGroup>
      <Label>Fee Percentage</Label>
      <Input 
        type="number" 
        value={percentage} 
        onChange={setPercentage}
        suffix="%"
        min="0"
        max="100"
        step="0.1"
      />
      <HelpText>Default: 0.5%</HelpText>
    </FormGroup>
    
    <FormGroup>
      <Label>Minimum Fee</Label>
      <Input 
        type="number" 
        value={minFee} 
        onChange={setMinFee}
        suffix="USDC"
        min="0"
        step="0.01"
      />
      <HelpText>Approximately ₦100 at current rates</HelpText>
    </FormGroup>
    
    <FormGroup>
      <Label>Fee Collection Status</Label>
      <Toggle 
        checked={enabled} 
        onChange={setEnabled}
      />
      <HelpText>
        {enabled ? 'Fees are being collected' : 'Fees are disabled'}
      </HelpText>
    </FormGroup>
    
    <Divider />
    
    <FormGroup>
      <Label>Collection Wallet Addresses</Label>
      {Object.keys(collectionWallets).map(chain => (
        <ChainWalletInput key={chain}>
          <ChainLabel>{chain}</ChainLabel>
          <Input 
            value={collectionWallets[chain]}
            onChange={(val) => updateWallet(chain, val)}
            placeholder="0x..."
          />
        </ChainWalletInput>
      ))}
      <HelpText>
        You can use the same wallet address for all EVM chains
      </HelpText>
    </FormGroup>
    
    <SaveButton onClick={handleSave}>
      Save Configuration
    </SaveButton>
  </Section>
  
  <Section title="Fee Statistics">
    <StatCard>
      <StatLabel>Today</StatLabel>
      <StatValue>{stats.today} USDC</StatValue>
      <StatSubtext>≈ ₦{stats.todayNaira}</StatSubtext>
    </StatCard>
    
    <StatCard>
      <StatLabel>This Week</StatLabel>
      <StatValue>{stats.week} USDC</StatValue>
      <StatSubtext>≈ ₦{stats.weekNaira}</StatSubtext>
    </StatCard>
    
    <StatCard>
      <StatLabel>This Month</StatLabel>
      <StatValue>{stats.month} USDC</StatValue>
      <StatSubtext>≈ ₦{stats.monthNaira}</StatSubtext>
    </StatCard>
    
    <StatCard warning={stats.failed > 0}>
      <StatLabel>Failed Collections</StatLabel>
      <StatValue>{stats.failed}</StatValue>
      {stats.failed > 0 && (
        <Link href="/admin/fees/failed">View Details</Link>
      )}
    </StatCard>
  </Section>
  
  <Section title="Recent Changes">
    <AuditLog entries={auditLog} />
  </Section>
</FeeSettingsPage>
```

#### B. Add Failed Fee Collections Page

**Location**: Create `pages/admin/fees/failed.tsx`

**Purpose**: Show and retry failed fee collections

**UI**: Table showing:
- Transaction ID
- User
- Amount
- Fee
- Retry count
- Last error
- Action buttons (Retry, Mark as Written Off)

## Step 3: Implementation Checklist

### Phase 1: Backend - Fee Configuration (Day 1)
- [ ] Create `FeeConfigurationService`
- [ ] Add fee config to `SystemConfig` table
- [ ] Implement `calculateFee` method with minimum fee logic
- [ ] Add `GET /circle/fees/config` endpoint
- [ ] Add `PUT /circle/fees/config` endpoint (admin only)
- [ ] Write unit tests for fee calculation
- [ ] Seed initial config: 0.5%, min 0.0625 USDC

### Phase 2: Backend - Transaction Updates (Day 2-3)
- [ ] Add `feeCollected`, `totalAmount`, `feeTransferId` columns to Transaction table
- [ ] Update `CircleTransactionService.createTransfer`:
  - [ ] Calculate fee
  - [ ] Validate balance (amount + fee)
  - [ ] Execute main transfer
  - [ ] Execute fee transfer with try-catch
  - [ ] Save transaction with fee details
- [ ] Create `FeeRetryService`
- [ ] Create `fee_retry_queue` table
- [ ] Implement background job for fee retries
- [ ] Add admin notification for failed retries
- [ ] Write integration tests

### Phase 3: Mobile App - UI Updates (Day 4)
- [ ] Update `send.tsx`:
  - [ ] Fetch fee config on mount
  - [ ] Calculate fee as user types
  - [ ] Update total amount calculation
  - [ ] Update balance validation
- [ ] Update transaction review screen:
  - [ ] Add "Service Fee" row
  - [ ] Add "Total" row with fee included
  - [ ] Show both USDC and Naira
- [ ] Update success screen to show fee paid
- [ ] Update transaction history to show fees
- [ ] Update transaction details with fee breakdown
- [ ] Test complete flow

### Phase 4: Admin Dashboard (Day 5)
- [ ] Create/update fee settings page:
  - [ ] Fee percentage input
  - [ ] Minimum fee input
  - [ ] Enable/disable toggle
  - [ ] Collection wallet inputs (per chain)
  - [ ] Save functionality
- [ ] Add fee statistics dashboard
- [ ] Add audit logging for config changes
- [ ] Create failed fees page
- [ ] Test admin workflows

### Phase 5: Testing & Validation (Day 6-7)
- [ ] Unit tests for all fee calculations
- [ ] Integration tests for two-transfer flow
- [ ] Test fee retry logic
- [ ] Test across all 4 chains
- [ ] Test edge cases:
  - [ ] Amount below minimum fee
  - [ ] Very large amounts
  - [ ] Insufficient balance scenarios
  - [ ] Fee disabled scenarios
  - [ ] Main transfer success, fee transfer failure
- [ ] Test admin configuration changes
- [ ] Test mobile UI on different devices
- [ ] Load testing (if high volume expected)

### Phase 6: Deployment Preparation
- [ ] Set up collection wallets on all 4 mainnet chains
- [ ] Configure initial fee settings in production
- [ ] Set up monitoring/alerts for:
  - [ ] Failed fee collections
  - [ ] Fee retry queue size
  - [ ] Daily fee collection totals
- [ ] Prepare user communication about fees
- [ ] Update terms of service / FAQ if needed
- [ ] Create rollback plan

## Success Criteria

✅ Users see clear fee breakdown before sending  
✅ Fee calculated correctly (percentage + minimum)  
✅ Balance validation includes fee  
✅ Two transfers execute: main + fee collection  
✅ Failed fee collections are retried automatically  
✅ Admin can configure fees from dashboard  
✅ Transaction history shows fee details  
✅ Works on all 4 supported chains  
✅ Fee collection rate > 95% (after retries)  

## Important Notes

**Wallet Setup**:
- You can use the **same wallet address** for Base, Optimism, Arbitrum, and Polygon (all EVM compatible)
- Example: `0xYourCompanyWallet123...` works on all 4 chains
- Just ensure you can access it on each network

**Fee Retry Strategy**:
- Retry 3 times over 15 minutes (5min intervals)
- After 3 failures, mark as failed and alert admin
- Keep retry queue small (<100 items)

**Monitoring**:
- Track fee collection success rate
- Alert if rate drops below 95%
- Alert if retry queue grows >50 items

**Future Enhancements**:
- Different fees per chain
- Volume-based discounts
- Promotional free transaction periods
- Referral bonuses