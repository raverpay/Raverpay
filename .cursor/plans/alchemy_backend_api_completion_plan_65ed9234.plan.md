---
name: Alchemy Backend API Completion Plan
overview: Complete all critical backend APIs for Alchemy EOA wallet mobile app integration. This includes seed phrase management, wallet import, native token support, and gas estimation - all essential features before mobile development can begin.
todos:
  - id: db-schema
    content: Add encryptedMnemonic field to AlchemyWallet model in Prisma schema
    status: completed
  - id: migration
    content: Create and run database migration for encryptedMnemonic field
    status: completed
  - id: mnemonic-encryption
    content: Add encryptMnemonic and decryptMnemonic methods to AlchemyKeyEncryptionService
    status: completed
  - id: seed-generation
    content: Modify generateEOAWallet to generate and store BIP-39 mnemonic
    status: completed
  - id: export-dto
    content: Create ExportSeedPhraseDto with PIN field
    status: completed
  - id: export-service
    content: Add exportSeedPhrase method to AlchemyWalletGenerationService
    status: completed
  - id: export-endpoint
    content: Add POST /alchemy/wallets/:walletId/export-seed endpoint with PIN verification
    status: completed
  - id: import-dto
    content: Create ImportWalletDto supporting seed phrase and private key methods
    status: completed
  - id: import-service
    content: Add importWallet method with seed phrase and private key validation
    status: completed
  - id: import-endpoint
    content: Add POST /alchemy/wallets/import endpoint
    status: completed
  - id: native-balance-service
    content: Add getNativeTokenBalance method to AlchemyTransactionService
    status: completed
  - id: native-balance-endpoint
    content: Add GET /alchemy/transactions/balance/native/:walletId endpoint
    status: completed
  - id: send-native-dto
    content: Create SendNativeTokenDto
    status: completed
  - id: send-native-service
    content: Add sendNativeToken method to AlchemyTransactionService
    status: completed
  - id: send-native-endpoint
    content: Add POST /alchemy/transactions/send-native endpoint
    status: completed
  - id: gas-price-service
    content: Add getGasPrice method to AlchemyTransactionService
    status: completed
  - id: gas-price-endpoint
    content: Add GET /alchemy/transactions/gas-price/:blockchain/:network endpoint
    status: completed
  - id: update-wallet-response
    content: Update getWallet to include hasSeedPhrase boolean flag
    status: completed
  - id: unit-tests
    content: Write unit tests for all new functionality
    status: pending
  - id: integration-tests
    content: Write integration tests for end-to-end flows
    status: pending
isProject: false
---

# Alchemy Backend API Completion Plan

## Overview

This plan implements all critical backend APIs required for the Alchemy mobile app integration. The focus is on EOA wallets only (Smart Accounts deferred). All features must be production-ready before mobile app development begins.

## Critical Features to Implement

1. **Seed Phrase Management** (BLOCKER)
   - Generate BIP-39 mnemonic during wallet creation
   - Store encrypted mnemonic in database
   - Export seed phrase endpoint with PIN verification

2. **Wallet Import** (BLOCKER)
   - Import via seed phrase (12-word mnemonic)
   - Import via private key
   - Validate and derive address

3. **Native Token Support** (HIGH PRIORITY)
   - Get native token balance (ETH/MATIC/ARB)
   - Send native tokens

4. **Gas Price Estimation** (MEDIUM PRIORITY)
   - Get current gas prices
   - Estimate gas for transactions

---

## Phase 1: Database Schema Changes

### Task 1.1: Add Encrypted Mnemonic Field

**File**: `apps/raverpay-api/prisma/schema.prisma`

Add new field to `AlchemyWallet` model:

```prisma
model AlchemyWallet {
  // ... existing fields
  encryptedMnemonic   String?                // AES-256-GCM encrypted BIP-39 mnemonic (12 words)
  // ... rest of fields
}
```

**Migration**: Create migration file to add column (nullable for existing wallets)

**Notes**:

- Field is nullable to support existing wallets without mnemonics
- Will be encrypted using same service as private keys (`AlchemyKeyEncryptionService`)

---

## Phase 2: Seed Phrase Generation

### Task 2.1: Install BIP-39 Library

**File**: `apps/raverpay-api/package.json`

Add dependency:

```json
{
  "dependencies": {
    "@scure/bip39": "^1.2.0"
  }
}
```

**Alternative**: Use `viem/accounts` which includes BIP-39 support (already installed)

### Task 2.2: Add Mnemonic Encryption Method

**File**: `apps/raverpay-api/src/alchemy/encryption/alchemy-key-encryption.service.ts`

Add method:

```typescript
encryptMnemonic(mnemonic: string, userId: string): string {
  // Reuse same encryption logic as encryptPrivateKey
  // Format: iv:tag:encrypted (base64)
}

decryptMnemonic(encryptedMnemonic: string, userId: string): string {
  // Reuse same decryption logic as decryptPrivateKey
}
```

**Implementation**: These methods can call `encryptPrivateKey`/`decryptPrivateKey` internally since format is identical.

### Task 2.3: Modify Wallet Generation Service

**File**: `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`

**Method**: `generateEOAWallet()`

**Changes**:

1. After generating private key (line 86), generate BIP-39 mnemonic:

   ```typescript
   import { generateMnemonic, english } from 'viem/accounts';
   const mnemonic = generateMnemonic(english);
   ```

2. Encrypt mnemonic:

   ```typescript
   const encryptedMnemonic = this.encryptionService.encryptMnemonic(mnemonic, userId);
   ```

3. Store in database (line 103-115):
   ```typescript
   data: {
     // ... existing fields
     encryptedMnemonic,
   }
   ```

**Validation**: Verify mnemonic can derive same private key:

```typescript
import { mnemonicToAccount } from 'viem/accounts';
const derivedAccount = mnemonicToAccount(mnemonic);
// Verify derivedAccount.address === address
```

---

## Phase 3: Seed Phrase Export Endpoint

### Task 3.1: Add Export DTO

**File**: `apps/raverpay-api/src/alchemy/controllers/dto/alchemy.dto.ts`

Add DTO:

```typescript
export class ExportSeedPhraseDto {
  @ApiProperty({
    description: 'Transaction PIN for verification',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  pin: string;
}
```

### Task 3.2: Add Service Method

**File**: `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`

Add method:

```typescript
async exportSeedPhrase(walletId: string, userId: string): Promise<string> {
  // 1. Verify wallet ownership (use existing getWallet method)
  const wallet = await this.getWallet(walletId, userId);

  // 2. Check wallet type (EOA only)
  if (wallet.accountType !== AlchemyAccountType.EOA) {
    throw new Error('Seed phrase export only available for EOA wallets');
  }

  // 3. Check if mnemonic exists
  if (!wallet.encryptedMnemonic) {
    throw new Error('Seed phrase not available for this wallet');
  }

  // 4. Decrypt mnemonic
  const mnemonic = this.encryptionService.decryptMnemonic(
    wallet.encryptedMnemonic,
    userId
  );

  // 5. Audit log (security event)
  this.logger.warn(`⚠️ SEED PHRASE EXPORT: User ${userId} exported seed phrase for wallet ${walletId}`);

  return mnemonic;
}
```

**Note**: PIN verification happens in controller (see Task 3.3)

### Task 3.3: Add Controller Endpoint

**File**: `apps/raverpay-api/src/alchemy/controllers/alchemy-wallet.controller.ts`

Add endpoint:

```typescript
@Post(':walletId/export-seed')
@ApiOperation({ summary: 'Export seed phrase (requires PIN verification)' })
@ApiResponse({ status: 200, description: 'Seed phrase exported successfully' })
@ApiResponse({ status: 403, description: 'PIN verification failed' })
async exportSeedPhrase(
  @Param('walletId') walletId: string,
  @Body() dto: ExportSeedPhraseDto,
  @Request() req: any,
) {
  const userId = req.user?.id;

  // 1. Verify PIN (use UsersService.verifyPin)
  await this.usersService.verifyPin(userId, dto.pin);

  // 2. Export seed phrase
  const mnemonic = await this.walletService.exportSeedPhrase(walletId, userId);

  return {
    success: true,
    data: {
      mnemonic, // 12-word phrase
      warning: 'Never share your seed phrase. Anyone with these words can access your wallet.',
    },
  };
}
```

**Dependencies**: Inject `UsersService` into controller

---

## Phase 4: Wallet Import

### Task 4.1: Add Import DTOs

**File**: `apps/raverpay-api/src/alchemy/controllers/dto/alchemy.dto.ts`

Add DTOs:

```typescript
export class ImportWalletDto {
  @ApiProperty({
    description: 'Import method',
    enum: ['SEED_PHRASE', 'PRIVATE_KEY'],
  })
  @IsEnum(['SEED_PHRASE', 'PRIVATE_KEY'])
  method: 'SEED_PHRASE' | 'PRIVATE_KEY';

  @ApiProperty({
    description: '12-word seed phrase (space-separated)',
    example: 'word1 word2 ... word12',
    required: false,
  })
  @IsString()
  @IsOptional()
  seedPhrase?: string;

  @ApiProperty({
    description: 'Private key (hex format)',
    example: '0x123abc...',
    required: false,
  })
  @IsString()
  @IsOptional()
  privateKey?: string;

  @ApiProperty({
    description: 'Blockchain',
    enum: ['POLYGON', 'ARBITRUM', 'BASE'],
  })
  @IsEnum(['POLYGON', 'ARBITRUM', 'BASE'])
  blockchain: string;

  @ApiProperty({
    description: 'Network',
    enum: ['mainnet', 'sepolia', 'amoy'],
  })
  @IsEnum(['mainnet', 'sepolia', 'amoy'])
  network: string;

  @ApiPropertyOptional({
    description: 'Wallet name',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### Task 4.2: Add Import Service Method

**File**: `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`

Add method:

```typescript
async importWallet(params: {
  userId: string;
  method: 'SEED_PHRASE' | 'PRIVATE_KEY';
  seedPhrase?: string;
  privateKey?: string;
  blockchain: string;
  network: string;
  name?: string;
}) {
  const { userId, method, seedPhrase, privateKey, blockchain, network, name } = params;

  // 1. Validate network
  if (!this.configService.isValidNetwork(blockchain, network)) {
    throw new Error(`Invalid network: ${blockchain}-${network}`);
  }

  // 2. Check for existing wallet
  const existingWallet = await this.prisma.alchemyWallet.findUnique({
    where: {
      userId_blockchain_network: { userId, blockchain, network },
    },
  });

  if (existingWallet) {
    throw new Error(`Wallet already exists on ${blockchain}-${network}`);
  }

  let derivedPrivateKey: string;
  let derivedMnemonic: string | undefined;
  let address: string;

  // 3. Derive private key and address based on method
  if (method === 'SEED_PHRASE') {
    if (!seedPhrase) {
      throw new Error('Seed phrase is required');
    }

    // Validate seed phrase format (12 words)
    const words = seedPhrase.trim().split(/\s+/);
    if (words.length !== 12) {
      throw new Error('Seed phrase must be 12 words');
    }

    // Validate using BIP-39 checksum
    import { mnemonicToAccount, validateMnemonic } from 'viem/accounts';
    if (!validateMnemonic(seedPhrase)) {
      throw new Error('Invalid seed phrase (checksum failed)');
    }

    const account = mnemonicToAccount(seedPhrase);
    address = account.address;
    derivedPrivateKey = account.privateKey;
    derivedMnemonic = seedPhrase; // Store original mnemonic
  } else {
    // PRIVATE_KEY method
    if (!privateKey) {
      throw new Error('Private key is required');
    }

    // Validate private key format
    if (!privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
      throw new Error('Invalid private key format');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    address = account.address;
    derivedPrivateKey = privateKey;
    // No mnemonic for private key imports
  }

  // 4. Check if address already exists (different user)
  const existingAddress = await this.prisma.alchemyWallet.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (existingAddress) {
    throw new Error('Wallet address already exists in system');
  }

  // 5. Encrypt private key and mnemonic
  const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(
    derivedPrivateKey,
    userId
  );

  const encryptedMnemonic = derivedMnemonic
    ? this.encryptionService.encryptMnemonic(derivedMnemonic, userId)
    : null;

  // 6. Create wallet
  const wallet = await this.prisma.alchemyWallet.create({
    data: {
      userId,
      address: address.toLowerCase(),
      encryptedPrivateKey,
      encryptedMnemonic,
      blockchain,
      network,
      accountType: AlchemyAccountType.EOA,
      state: AlchemyWalletState.ACTIVE,
      name: name || `Imported ${blockchain} ${network} Wallet`,
      isGasSponsored: false,
    },
  });

  this.logger.log(`Imported wallet ${wallet.id} for user ${userId}`);

  return {
    id: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    network: wallet.network,
    accountType: wallet.accountType,
    name: wallet.name,
    isGasSponsored: wallet.isGasSponsored,
    createdAt: wallet.createdAt,
  };
}
```

### Task 4.3: Add Import Controller Endpoint

**File**: `apps/raverpay-api/src/alchemy/controllers/alchemy-wallet.controller.ts`

Add endpoint:

```typescript
@Post('import')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Import existing wallet via seed phrase or private key' })
async importWallet(@Body() dto: ImportWalletDto, @Request() req: any) {
  const userId = req.user?.id;

  const wallet = await this.walletService.importWallet({
    userId,
    method: dto.method,
    seedPhrase: dto.seedPhrase,
    privateKey: dto.privateKey,
    blockchain: dto.blockchain,
    network: dto.network,
    name: dto.name,
  });

  return {
    success: true,
    data: wallet,
    message: 'Wallet imported successfully',
  };
}
```

---

## Phase 5: Native Token Support

### Task 5.1: Add Native Token Balance Endpoint

**File**: `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`

Add method:

```typescript
async getNativeTokenBalance(params: {
  userId: string;
  walletId: string;
}) {
  const { userId, walletId } = params;

  // 1. Get wallet and verify ownership
  const wallet = await this.walletService.getWallet(walletId, userId);

  // 2. Get network configuration
  const networkConfig = this.configService.getNetworkConfig(
    wallet.blockchain,
    wallet.network
  );

  // 3. Create public client
  const chain = this.getChainConfig(networkConfig.chainId);
  const publicClient = createPublicClient({
    chain,
    transport: http(networkConfig.rpcUrl),
  });

  // 4. Get native token balance
  const balance = await publicClient.getBalance({
    address: wallet.address as Address,
  });

  // 5. Format balance (native tokens use 18 decimals)
  const formattedBalance = formatUnits(balance, 18);

  return {
    walletId: wallet.id,
    address: wallet.address,
    tokenType: networkConfig.nativeToken, // ETH, MATIC, ARB
    balance: formattedBalance,
    balanceRaw: balance.toString(),
    blockchain: wallet.blockchain,
    network: wallet.network,
  };
}
```

**File**: `apps/raverpay-api/src/alchemy/controllers/alchemy-transaction.controller.ts`

Add endpoint:

```typescript
@Get('balance/native/:walletId')
@ApiOperation({ summary: 'Get native token balance (ETH/MATIC/ARB)' })
async getNativeBalance(
  @Param('walletId') walletId: string,
  @Request() req: any,
) {
  const userId = req.user?.id;
  const balance = await this.transactionService.getNativeTokenBalance({
    userId,
    walletId,
  });

  return {
    success: true,
    data: balance,
  };
}
```

### Task 5.2: Add Send Native Token Endpoint

**File**: `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`

Add method:

```typescript
async sendNativeToken(params: {
  userId: string;
  walletId: string;
  destinationAddress: string;
  amount: string; // Amount in native token units (e.g., "0.1" for 0.1 ETH)
}) {
  const { userId, walletId, destinationAddress, amount } = params;

  // 1. Get wallet and verify ownership
  const wallet = await this.walletService.getWallet(walletId, userId);

  // 2. Validate destination address
  if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid destination address format');
  }

  // 3. Get network configuration
  const networkConfig = this.configService.getNetworkConfig(
    wallet.blockchain,
    wallet.network
  );

  // 4. Get decrypted private key
  const privateKey = await this.walletService.getDecryptedPrivateKey(
    walletId,
    userId
  );

  // 5. Create transaction reference
  const reference = `ALY-NATIVE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // 6. Create database transaction record (PENDING state)
  const txRecord = await this.prisma.alchemyTransaction.create({
    data: {
      reference,
      userId,
      walletId,
      type: AlchemyTransactionType.SEND,
      state: AlchemyTransactionState.PENDING,
      sourceAddress: wallet.address,
      destinationAddress: destinationAddress.toLowerCase(),
      tokenAddress: null, // Native token has no contract address
      blockchain: wallet.blockchain,
      network: wallet.network,
      amount: parseUnits(amount, 18).toString(), // Native tokens use 18 decimals
      amountFormatted: `${amount} ${networkConfig.nativeToken}`,
    },
  });

  try {
    // 7. Create viem clients
    const chain = this.getChainConfig(networkConfig.chainId);
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    // 8. Prepare transaction
    const amountInWei = parseUnits(amount, 18);

    // 9. Send native token transaction
    const hash = await walletClient.sendTransaction({
      to: destinationAddress as Address,
      value: amountInWei,
    });

    // 10. Update transaction record with hash
    await this.prisma.alchemyTransaction.update({
      where: { id: txRecord.id },
      data: {
        transactionHash: hash,
        state: AlchemyTransactionState.SUBMITTED,
      },
    });

    // 11. Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 12. Update transaction record with confirmation
    const finalTx = await this.prisma.alchemyTransaction.update({
      where: { id: txRecord.id },
      data: {
        state:
          receipt.status === 'success'
            ? AlchemyTransactionState.COMPLETED
            : AlchemyTransactionState.FAILED,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        confirmations: 1,
        completedAt: receipt.status === 'success' ? new Date() : undefined,
        failedAt: receipt.status === 'success' ? undefined : new Date(),
        errorMessage:
          receipt.status === 'success' ? undefined : 'Transaction reverted',
      },
    });

    return {
      id: finalTx.id,
      reference: finalTx.reference,
      transactionHash: finalTx.transactionHash,
      state: finalTx.state,
      amount: finalTx.amountFormatted,
      destinationAddress: finalTx.destinationAddress,
      blockNumber: finalTx.blockNumber?.toString(),
      completedAt: finalTx.completedAt,
    };
  } catch (error) {
    // Update transaction as failed
    await this.prisma.alchemyTransaction.update({
      where: { id: txRecord.id },
      data: {
        state: AlchemyTransactionState.FAILED,
        errorMessage: error.message,
        failedAt: new Date(),
      },
    });

    throw new Error(`Transaction failed: ${error.message}`);
  }
}
```

**File**: `apps/raverpay-api/src/alchemy/controllers/dto/alchemy.dto.ts`

Add DTO:

```typescript
export class SendNativeTokenDto {
  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({ description: 'Destination address' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ description: 'Amount in native token units' })
  @IsString()
  @IsNotEmpty()
  amount: string;
}
```

**File**: `apps/raverpay-api/src/alchemy/controllers/alchemy-transaction.controller.ts`

Add endpoint:

```typescript
@Post('send-native')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Send native token (ETH/MATIC/ARB)' })
async sendNativeToken(@Body() dto: SendNativeTokenDto, @Request() req: any) {
  const userId = req.user?.id;

  const transaction = await this.transactionService.sendNativeToken({
    userId,
    walletId: dto.walletId,
    destinationAddress: dto.destinationAddress,
    amount: dto.amount,
  });

  return {
    success: true,
    data: transaction,
    message: 'Native token transaction submitted successfully',
  };
}
```

---

## Phase 6: Gas Price Estimation

### Task 6.1: Add Gas Price Service Method

**File**: `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`

Add method:

```typescript
async getGasPrice(params: {
  blockchain: string;
  network: string;
}) {
  const { blockchain, network } = params;

  // 1. Get network configuration
  const networkConfig = this.configService.getNetworkConfig(blockchain, network);

  // 2. Create public client
  const chain = this.getChainConfig(networkConfig.chainId);
  const publicClient = createPublicClient({
    chain,
    transport: http(networkConfig.rpcUrl),
  });

  // 3. Get gas price (or use fee data for EIP-1559)
  const feeData = await publicClient.estimateFeesPerGas();

  // 4. Format gas prices
  return {
    blockchain,
    network,
    gasPrice: feeData.gasPrice
      ? formatUnits(feeData.gasPrice, 'gwei')
      : null,
    maxFeePerGas: feeData.maxFeePerGas
      ? formatUnits(feeData.maxFeePerGas, 'gwei')
      : null,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      ? formatUnits(feeData.maxPriorityFeePerGas, 'gwei')
      : null,
    nativeToken: networkConfig.nativeToken,
  };
}
```

### Task 6.2: Add Gas Price Controller Endpoint

**File**: `apps/raverpay-api/src/alchemy/controllers/alchemy-transaction.controller.ts`

Add endpoint:

```typescript
@Get('gas-price/:blockchain/:network')
@ApiOperation({ summary: 'Get current gas prices for a network' })
async getGasPrice(
  @Param('blockchain') blockchain: string,
  @Param('network') network: string,
) {
  const gasPrice = await this.transactionService.getGasPrice({
    blockchain,
    network,
  });

  return {
    success: true,
    data: gasPrice,
  };
}
```

---

## Phase 7: Update Wallet Service Get Method

### Task 7.1: Include Encrypted Mnemonic in Wallet Response

**File**: `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`

**Method**: `getWallet()`

**Change**: When returning wallet, check if `encryptedMnemonic` exists but don't return it (security). Only return a boolean flag:

```typescript
return {
  // ... existing fields
  hasSeedPhrase: !!wallet.encryptedMnemonic, // Boolean flag only
};
```

**Note**: Actual mnemonic only returned via export endpoint with PIN verification.

---

## Phase 8: Testing & Validation

### Task 8.1: Unit Tests

Create tests for:

- Seed phrase generation and encryption
- Wallet import (seed phrase and private key)
- Native token balance fetching
- Native token sending
- Gas price estimation

### Task 8.2: Integration Tests

Test end-to-end flows:

- Create wallet → export seed phrase → import wallet
- Import wallet → verify address matches
- Send native token → verify balance updates

### Task 8.3: Security Tests

- Verify PIN is required for seed phrase export
- Verify encrypted mnemonic cannot be decrypted without correct userId
- Verify import validates seed phrase checksum

---

## Dependencies & Prerequisites

1. **Environment Variables**: Ensure `ALCHEMY_ENCRYPTION_MASTER_KEY` is set
2. **Database Migration**: Run Prisma migration for `encryptedMnemonic` field
3. **UsersService**: Ensure `verifyPin` method is accessible (already exists)

---

## Files to Modify

1. `apps/raverpay-api/prisma/schema.prisma` - Add encryptedMnemonic field
2. `apps/raverpay-api/src/alchemy/encryption/alchemy-key-encryption.service.ts` - Add mnemonic encryption methods
3. `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts` - Modify generation, add import/export methods
4. `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts` - Add native token and gas price methods
5. `apps/raverpay-api/src/alchemy/controllers/alchemy-wallet.controller.ts` - Add import/export endpoints
6. `apps/raverpay-api/src/alchemy/controllers/alchemy-transaction.controller.ts` - Add native token and gas price endpoints
7. `apps/raverpay-api/src/alchemy/controllers/dto/alchemy.dto.ts` - Add new DTOs

---

## Success Criteria

- [ ] All existing wallets continue to work (backward compatible)
- [ ] New wallets generate and store seed phrases
- [ ] Seed phrase can be exported with PIN verification
- [ ] Wallets can be imported via seed phrase or private key
- [ ] Native token balances can be fetched
- [ ] Native tokens can be sent
- [ ] Gas prices can be estimated
- [ ] All endpoints have proper error handling
- [ ] All sensitive operations require PIN verification
- [ ] Database migration runs successfully

---

## Estimated Time

- Phase 1 (Database): 30 minutes
- Phase 2 (Seed Phrase Generation): 2 hours
- Phase 3 (Export): 1 hour
- Phase 4 (Import): 3 hours
- Phase 5 (Native Tokens): 2 hours
- Phase 6 (Gas Price): 1 hour
- Phase 7 (Updates): 30 minutes
- Phase 8 (Testing): 3 hours

**Total**: ~13 hours

---

## Notes

- All encryption uses existing `AlchemyKeyEncryptionService` patterns
- PIN verification uses existing `UsersService.verifyPin` method
- Native token decimals are 18 (standard for ETH/MATIC/ARB)
- ERC20 tokens (USDC/USDT) use 6 decimals (already implemented)
- Import validates BIP-39 checksum before accepting seed phrase
- Export requires PIN verification for security
