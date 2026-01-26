# Alchemy Migration Analysis: Circle USDC API → Alchemy Infrastructure

## Executive Summary

This document analyzes migrating from Circle USDC API to Alchemy infrastructure for RaverPay, comparing architectures, security implications, and implementation approaches for all required features.

**Date:** January 25, 2026  
**Status:** Analysis Complete - **DO NOT IMPLEMENT YET**

---

## Table of Contents

1. [Current Circle Architecture](#current-circle-architecture)
2. [Alchemy Architecture Overview](#alchemy-architecture-overview)
3. [Feature-by-Feature Comparison](#feature-by-feature-comparison)
4. [Security Analysis](#security-analysis)
5. [Migration Challenges](#migration-challenges)
6. [Risk Assessment](#risk-assessment)
7. [Recommendations](#recommendations)

---

## Current Circle Architecture

### How Circle Works Today

**Circle's Developer-Controlled Wallet Model:**

- Circle manages wallets on your behalf using **Multi-Party Computation (MPC)**
- You control wallets via **Entity Secret** (32-byte private key) encrypted with Circle's RSA public key
- Circle handles key management, signing, and transaction execution
- Wallets are created via Circle API and stored in Circle's infrastructure
- You only store wallet addresses and metadata in your database

**Key Components:**

1. **Entity Secret Service**: Encrypts entity secret with Circle's public key for each API request
2. **Circle API Client**: REST API wrapper for Circle endpoints
3. **Wallet Service**: Creates/manages wallets via Circle API
4. **Transaction Service**: Executes USDC transfers via Circle API
5. **Webhook Service**: Receives transaction state updates from Circle

**Current Flow:**

```
User Request → Your API → Circle API (with encrypted entity secret) → Blockchain
```

---

## Alchemy Architecture Overview

### How Alchemy Works

**Alchemy's Account Abstraction Model:**

- Alchemy provides **infrastructure** (RPC, Gas Manager, Bundler) but **NOT custody**
- You must generate and store private keys yourself
- You use Alchemy SDK to create smart contract wallets (Account Abstraction)
- You sign transactions locally and send UserOperations to Alchemy's Bundler
- Alchemy sponsors gas via Gas Manager API (you pay monthly)

**Key Components:**

1. **Account Kit SDK**: High-level SDK for smart wallets
2. **Gas Manager API**: Sponsors gas fees for user transactions
3. **Bundler API**: Submits UserOperations to blockchain
4. **RPC Nodes**: Blockchain data access
5. **Transfers API**: Transaction history tracking

**Alchemy Flow:**

```
User Request → Your API → Generate/Sign Transaction Locally → Alchemy Bundler → Blockchain
```

---

## Feature-by-Feature Comparison

### 1. ✅ Generate User Wallets Securely

#### Circle (Current)

- **Approach**: Circle generates wallets via API
- **Key Storage**: Circle manages keys via MPC
- **Your Responsibility**: Store wallet address only
- **Security**: Circle handles all key management

#### Alchemy (Proposed)

- **Approach**: You generate wallets locally using Account Kit SDK
- **Key Storage**: **YOU MUST STORE PRIVATE KEYS** (encrypted)
- **Your Responsibility**:
  - Generate private keys
  - Encrypt with AES-256-GCM
  - Store encrypted keys in database
  - Manage key rotation
- **Security**: **CRITICAL RISK** - You become responsible for key security

**Implementation Difference:**

```typescript
// Circle (Current)
const wallet = await circleApi.createWallet({ userId, blockchain });

// Alchemy (Proposed)
const privateKey = generatePrivateKey(); // YOU generate this
const encryptedKey = encryptWithAES256GCM(privateKey, encryptionKey);
await db.save({ userId, address, encryptedPrivateKey }); // YOU store this
const wallet = await alchemyAccountKit.createWallet({ signer: privateKey });
```

**⚠️ RISK**: Private key management becomes your responsibility. If keys are compromised, funds are lost.

---

### 2. ✅ Support USDC Transfers on Polygon

#### Circle (Current)

- **Approach**: Circle API handles USDC transfers
- **Token Address**: Circle knows USDC addresses per chain
- **Execution**: Circle signs and broadcasts transactions
- **Error Handling**: Circle provides transaction status updates

#### Alchemy (Proposed)

- **Approach**: You construct ERC-20 transfer transactions
- **Token Address**: You must maintain USDC contract addresses
- **Execution**: You sign locally, send to Alchemy Bundler
- **Error Handling**: You monitor transaction status via RPC

**Implementation:**

```typescript
// Circle (Current)
await circleApi.transfer({
  walletId: circleWalletId,
  destinationAddress,
  amount,
  tokenAddress: circleConfig.getUsdcTokenAddress(blockchain),
});

// Alchemy (Proposed)
const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
const tx = await usdcContract.transfer(destinationAddress, amount);
const userOp = await accountKit.sendUserOperation({ calls: [tx] });
await bundler.sendUserOperation(userOp);
```

**✅ FEASIBLE**: Standard ERC-20 transfer, well-supported by Alchemy

---

### 3. ✅ Support USDT Transfers on Polygon

#### Circle (Current)

- **Status**: Circle supports USDC natively, USDT may require custom implementation
- **Approach**: Similar to USDC if supported

#### Alchemy (Proposed)

- **Status**: Same as USDC - standard ERC-20 transfer
- **Approach**: Use USDT contract address, same transfer flow

**✅ FEASIBLE**: Same implementation as USDC

---

### 4. ✅ Support USDC/USDT on Arbitrum

#### Circle (Current)

- **Status**: Circle supports multiple chains including Arbitrum
- **Approach**: Same API, different blockchain parameter

#### Alchemy (Proposed)

- **Status**: Alchemy supports Arbitrum via RPC
- **Approach**: Use Arbitrum RPC endpoint, same contract addresses

**✅ FEASIBLE**: Alchemy supports Arbitrum natively

---

### 5. ⚠️ Automatic Gas Management (Fund User Wallets)

#### Circle (Current)

- **Approach**: Circle sponsors gas fees (included in platform costs)
- **User Experience**: Users don't need MATIC/ETH
- **Cost Model**: Circle bills you monthly for gas sponsorship

#### Alchemy (Proposed)

- **Approach**: Alchemy Gas Manager sponsors gas
- **User Experience**: Users don't need MATIC/ETH (if Gas Manager enabled)
- **Cost Model**: Alchemy bills you monthly for sponsored gas
- **Alternative**: You fund user wallets with native tokens manually

**Implementation:**

```typescript
// Alchemy Gas Manager
const policyId = await gasManager.createPolicy({
  spendingLimit: { amount: '100', unit: 'USD' },
  allowedAddresses: [userWalletAddress],
});

const userOp = await accountKit.sendUserOperation({
  calls: [transferCall],
  gasManagerConfig: { policyId }, // Gas sponsored
});
```

**⚠️ CONSIDERATION**:

- Gas Manager requires policy setup per user or global policy
- You must monitor gas costs and set spending limits
- If Gas Manager fails, transactions fail (unless you fund wallets)

**RISK**: If Gas Manager policy expires or fails, users cannot transact unless you manually fund wallets.

---

### 6. ✅ Transaction History Tracking

#### Circle (Current)

- **Approach**: Circle API provides transaction history
- **Webhooks**: Real-time transaction state updates
- **Database**: You sync Circle transaction data to your DB

#### Alchemy (Proposed)

- **Approach**: Alchemy Transfers API + RPC queries
- **Webhooks**: Alchemy supports webhooks for transaction events
- **Database**: You track transactions via RPC or Transfers API

**Implementation:**

```typescript
// Alchemy Transfers API
const transfers = await alchemy.transfers.getTransfers({
  fromAddress: walletAddress,
  category: ['external', 'erc20'],
});

// Or via RPC
const txHistory = await alchemy.core.getAssetTransfers({
  fromAddress: walletAddress,
  category: ['erc20'],
});
```

**✅ FEASIBLE**: Alchemy provides comprehensive transaction history APIs

---

### 7. ✅ Balance Checks

#### Circle (Current)

- **Approach**: Circle API provides balance endpoint
- **Caching**: You can cache balances, refresh via API

#### Alchemy (Proposed)

- **Approach**: RPC calls to token contracts or Alchemy Data APIs
- **Caching**: You can cache balances, refresh via RPC

**Implementation:**

```typescript
// Alchemy
const balance = await alchemy.core.getTokenBalances(walletAddress, [USDC_ADDRESS]);
```

**✅ FEASIBLE**: Standard balance checking, well-supported

---

### 8. ⚠️ Internal vs External Transfer Detection

#### Circle (Current)

- **Approach**: You check if destination address exists in your database
- **Optimization**: Internal transfers could skip blockchain (but Circle doesn't support this)

#### Alchemy (Proposed)

- **Approach**: Same - check database for internal addresses
- **Optimization**:
  - **Internal**: Update balances in DB, skip blockchain (save gas)
  - **External**: Send blockchain transaction

**Implementation:**

```typescript
// Check if recipient is internal user
const recipientWallet = await db.findWalletByAddress(destinationAddress);
if (recipientWallet) {
  // Internal transfer - update DB balances, skip blockchain
  await updateBalancesInDB(senderId, recipientId, amount);
} else {
  // External transfer - send blockchain transaction
  await sendBlockchainTransaction(senderWallet, destinationAddress, amount);
}
```

**✅ FEASIBLE**: This is actually easier with Alchemy since you control the flow

**⚠️ RISK**: If you skip blockchain for internal transfers, you must ensure:

- Atomic DB transactions
- Proper reconciliation
- Audit trail
- Recovery mechanisms if DB fails

---

## Security Analysis

### 🔴 CRITICAL SECURITY RISKS

#### 1. Private Key Storage Responsibility

**Circle (Current):**

- ✅ Circle manages private keys via MPC
- ✅ You never see or store private keys
- ✅ Circle handles key rotation and security
- ✅ If Circle is compromised, MPC protects funds

**Alchemy (Proposed):**

- ❌ **YOU must generate private keys**
- ❌ **YOU must encrypt and store private keys**
- ❌ **YOU must manage key rotation**
- ❌ **If your database is compromised, funds are at risk**

**Risk Level: 🔴 CRITICAL**

**Mitigation Required:**

1. **AES-256-GCM Encryption**: ✅ You already have this (MfaEncryptionUtil pattern)
2. **Key Derivation**: Use PBKDF2 with 100k+ iterations ✅ You have this
3. **Environment Variables**: Store encryption keys in env vars ✅ Standard practice
4. **Key Rotation**: Implement periodic key rotation (NOT currently implemented)
5. **HSM Integration**: Consider Hardware Security Module for production (NOT implemented)
6. **Access Controls**: Limit who can decrypt keys (NOT implemented)
7. **Audit Logging**: Log all key access (NOT implemented)

**⚠️ RISKY APPROACHES TO AVOID:**

- ❌ Storing private keys in plain text
- ❌ Using weak encryption (AES-128, weak IVs)
- ❌ Storing encryption keys in code or config files
- ❌ Allowing multiple services to decrypt keys
- ❌ No key rotation strategy
- ❌ No backup/recovery mechanism for keys

---

#### 2. Transaction Signing Security

**Circle (Current):**

- ✅ Circle signs transactions in secure environment
- ✅ Entity secret encrypted per request
- ✅ No signing keys in your application

**Alchemy (Proposed):**

- ⚠️ You sign transactions in your application
- ⚠️ Private keys must be decrypted in memory during signing
- ⚠️ Memory dumps could expose keys

**Risk Level: 🟠 HIGH**

**Mitigation Required:**

1. **In-Memory Key Handling**: Decrypt keys only when needed, clear from memory immediately
2. **Secure Signing**: Use secure signing libraries (ethers.js, viem)
3. **Memory Protection**: Consider memory encryption (advanced)
4. **Transaction Validation**: Validate all transaction parameters before signing
5. **Rate Limiting**: ✅ You already have this
6. **2FA for Large Transactions**: ✅ You have MFA infrastructure

---

#### 3. Gas Manager Policy Security

**Circle (Current):**

- ✅ Circle manages gas sponsorship internally
- ✅ No policy configuration needed

**Alchemy (Proposed):**

- ⚠️ You configure Gas Manager policies
- ⚠️ Policies define spending limits and eligibility
- ⚠️ Misconfigured policies could allow abuse

**Risk Level: 🟡 MEDIUM**

**Mitigation Required:**

1. **Policy Limits**: Set strict spending limits per user
2. **Policy Expiry**: Set reasonable expiry times
3. **Monitoring**: Monitor gas costs and policy usage
4. **Rate Limiting**: ✅ You already have this
5. **Anomaly Detection**: Alert on unusual gas spending patterns

---

### ✅ Security Features You Already Have

1. **AES-256-GCM Encryption**: ✅ Implemented in `MfaEncryptionUtil`
2. **PBKDF2 Key Derivation**: ✅ Implemented (100k iterations)
3. **Environment Variables**: ✅ Using ConfigService
4. **Rate Limiting**: ✅ Comprehensive implementation
5. **MFA/2FA**: ✅ TOTP-based MFA implemented
6. **Audit Logging**: ✅ AuditService implemented
7. **Transaction Validation**: ✅ Amount validation, balance checks

---

## Migration Challenges

### 1. 🔴 Private Key Management

**Challenge**: You must implement secure private key generation, encryption, storage, and rotation.

**Current State**: You don't have private key management infrastructure.

**Required Work:**

- Private key generation service
- Encryption service (can reuse MfaEncryptionUtil pattern)
- Database schema for encrypted keys
- Key rotation mechanism
- Backup/recovery procedures
- HSM integration (for production)

**Estimated Effort**: 2-3 weeks

---

### 2. 🟠 Transaction Signing Infrastructure

**Challenge**: You must implement transaction construction and signing.

**Current State**: Circle handles all signing.

**Required Work:**

- Integrate ethers.js or viem
- Implement ERC-20 transfer encoding
- UserOperation construction (Account Abstraction)
- Transaction signing with decrypted keys
- Error handling and retry logic

**Estimated Effort**: 1-2 weeks

---

### 3. 🟡 Gas Manager Integration

**Challenge**: Configure and manage Gas Manager policies.

**Current State**: Circle handles gas automatically.

**Required Work:**

- Gas Manager API integration
- Policy creation and management
- Policy monitoring and alerts
- Fallback to manual funding if Gas Manager fails

**Estimated Effort**: 1 week

---

### 4. 🟡 Webhook Handling

**Challenge**: Migrate from Circle webhooks to Alchemy webhooks.

**Current State**: Circle webhook service implemented.

**Required Work:**

- Alchemy webhook endpoint
- Transaction status updates
- Error handling
- Webhook signature verification

**Estimated Effort**: 1 week

---

### 5. 🟢 Database Schema Changes

**Challenge**: Store encrypted private keys and Alchemy-specific data.

**Required Changes:**

```prisma
model AlchemyWallet {
  id                String   @id @default(uuid())
  userId            String
  address           String   @unique
  encryptedPrivateKey String  // AES-256-GCM encrypted
  blockchain        String   // POLYGON, ARBITRUM
  network           String   // mainnet, testnet
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  user              User     @relation(fields: [userId], references: [id])
  transactions      AlchemyTransaction[]

  @@index([userId])
  @@index([address])
  @@index([blockchain])
}
```

**Estimated Effort**: 2-3 days

---

## Risk Assessment

### 🔴 HIGH RISK: Private Key Compromise

**Scenario**: Database breach exposes encrypted private keys.

**Impact**:

- Attacker could decrypt keys if encryption key is also compromised
- Funds could be stolen from all affected wallets

**Probability**: Medium (depends on security practices)

**Mitigation**:

- Use HSM for encryption keys
- Implement key rotation
- Limit key access to minimal services
- Monitor for unauthorized access

---

### 🟠 MEDIUM RISK: Gas Manager Policy Abuse

**Scenario**: Misconfigured Gas Manager policy allows unlimited gas spending.

**Impact**:

- Unexpected gas costs
- Potential financial loss

**Probability**: Low (with proper configuration)

**Mitigation**:

- Set strict spending limits
- Monitor gas costs
- Implement alerts

---

### 🟡 LOW RISK: Transaction Failures

**Scenario**: Alchemy Bundler or RPC nodes experience downtime.

**Impact**:

- Transactions fail
- User experience degradation

**Probability**: Low (Alchemy has high uptime)

**Mitigation**:

- Implement retry logic
- Monitor Alchemy status
- Consider backup RPC providers

---

## Recommendations

### ✅ DO: Implement These Security Measures

1. **Private Key Encryption**
   - ✅ Use AES-256-GCM (you already have this pattern)
   - ✅ Use PBKDF2 for key derivation (you already have this)
   - ✅ Store encryption keys in environment variables
   - ✅ Implement key rotation (every 90 days)

2. **Access Controls**
   - ✅ Limit key decryption to transaction service only
   - ✅ Implement audit logging for all key access
   - ✅ Require 2FA for admin key operations

3. **Transaction Security**
   - ✅ Validate all transaction parameters
   - ✅ Implement transaction limits per user
   - ✅ Require 2FA for large transactions (>$1000)
   - ✅ Rate limit transaction endpoints

4. **Monitoring**
   - ✅ Monitor gas costs
   - ✅ Alert on unusual transaction patterns
   - ✅ Track key access logs
   - ✅ Monitor Alchemy service status

---

### ❌ DON'T: Avoid These Risky Approaches

1. **❌ Plain Text Storage**: Never store private keys unencrypted
2. **❌ Weak Encryption**: Don't use AES-128 or weak IVs
3. **❌ Key in Code**: Never hardcode encryption keys
4. **❌ Shared Keys**: Don't reuse encryption keys across environments
5. **❌ No Rotation**: Don't skip key rotation
6. **❌ No Backups**: Always backup encrypted keys securely
7. **❌ Broad Access**: Don't allow multiple services to decrypt keys

---

### 🎯 Migration Strategy

**Phase 1: Foundation (Weeks 1-2)**

1. Implement private key generation service
2. Implement encryption service (reuse MfaEncryptionUtil pattern)
3. Create database schema for Alchemy wallets
4. Set up Alchemy Account Kit SDK
5. Implement basic wallet creation

**Phase 2: Transactions (Weeks 3-4)**

1. Implement ERC-20 transfer signing
2. Integrate Gas Manager API
3. Implement transaction submission to Bundler
4. Add transaction status tracking

**Phase 3: Integration (Weeks 5-6)**

1. Migrate existing Circle wallets (if needed)
2. Implement webhook handling
3. Add balance checking
4. Implement transaction history

**Phase 4: Security & Testing (Weeks 7-8)**

1. Security audit
2. Penetration testing
3. Load testing
4. Key rotation implementation

**Phase 5: Production (Week 9+)**

1. Gradual rollout
2. Monitor metrics
3. Rollback plan ready

---

## Cost Comparison

### Circle (Current)

- **Wallet Creation**: Included
- **Transaction Fees**: Circle bills monthly for gas sponsorship
- **API Calls**: Included
- **Key Management**: Included

### Alchemy (Proposed)

- **Wallet Creation**: Free (you handle it)
- **Transaction Fees**: Gas Manager bills monthly for sponsored gas
- **API Calls**: RPC calls included in plan, Transfers API may have limits
- **Key Management**: **Your cost** (infrastructure, HSM, etc.)

**Note**: Alchemy may be cheaper for high-volume, but you take on operational overhead.

---

## Conclusion

### ✅ Alchemy Migration is FEASIBLE but HIGH RISK

**Pros:**

- More control over wallet infrastructure
- Potentially lower costs at scale
- Better internal transfer optimization
- Standard blockchain tooling (ethers.js, viem)

**Cons:**

- **CRITICAL**: You become responsible for private key security
- Significant development effort (8-9 weeks)
- Operational overhead (key management, monitoring)
- Higher security risk if not implemented correctly

### 🎯 Recommendation

**Before migrating, ensure:**

1. ✅ Private key encryption infrastructure is production-ready
2. ✅ Key rotation mechanism is implemented
3. ✅ HSM integration for production (recommended)
4. ✅ Comprehensive security audit
5. ✅ Disaster recovery plan for key loss
6. ✅ 2FA for all sensitive operations
7. ✅ Rate limiting and transaction limits

**Consider staying with Circle if:**

- You don't have security expertise for key management
- You want to focus on product features, not infrastructure
- The cost difference doesn't justify the risk
- You don't have resources for 8-9 week migration

**Consider migrating to Alchemy if:**

- You need more control over wallet infrastructure
- You have strong security engineering team
- You can invest in HSM and security tooling
- The cost savings justify the migration effort

---

## Next Steps

1. **Review this analysis** with security team
2. **Assess your security capabilities** for key management
3. **Get Alchemy pricing** for your expected volume
4. **Create detailed migration plan** if proceeding
5. **Implement security infrastructure** before migration
6. **Start with testnet** migration first

**DO NOT START IMPLEMENTATION** until security infrastructure is ready.
