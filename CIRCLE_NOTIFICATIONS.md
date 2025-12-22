# Circle Notifications Implementation Guide

## Overview

This document provides a comprehensive guide to all Circle-related notifications implemented in the Raverpay system.

## Implemented Notifications

### 1. Wallet Management

#### ✅ Circle Wallet Created (`circle_wallet_created`)

**Triggers:** When a user successfully creates a new Circle USDC wallet
**Channels:** EMAIL, PUSH, IN_APP
**Category:** ACCOUNT

**Data Fields:**

```typescript
{
  walletAddress: string;
  blockchain: string;
  accountType: 'SCA' | 'EOA';
  walletName?: string;
  timestamp: string;
}
```

**Usage Example:**

```typescript
await notificationDispatcher.sendNotification({
  userId: 'user-id',
  eventType: 'circle_wallet_created',
  category: 'ACCOUNT',
  channels: ['EMAIL', 'PUSH', 'IN_APP'],
  title: `${blockchain} USDC Wallet Created`,
  message: `Your Circle USDC wallet on ${blockchain} has been successfully created!`,
  data: {
    walletAddress: wallet.address,
    blockchain: wallet.blockchain,
    accountType: wallet.accountType,
    walletName: wallet.name,
    timestamp: new Date().toLocaleString('en-NG'),
  },
});
```

---

### 2. USDC Transactions

#### ✅ USDC Received (`circle_usdc_received`)

**Triggers:** When USDC is deposited into user's Circle wallet
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ USDC Sent (`circle_usdc_sent`)

**Triggers:** When user sends USDC from their Circle wallet
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ Transaction Confirmed (`circle_transaction_confirmed`)

**Triggers:** When a pending transaction receives blockchain confirmation
**Channels:** PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ Transaction Failed (`circle_transaction_failed`)

**Triggers:** When a Circle transaction fails
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

---

### 3. CCTP (Cross-Chain Transfer Protocol)

#### ✅ CCTP Transfer Initiated (`cctp_transfer_initiated`)

**Triggers:** When user starts a cross-chain USDC transfer
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ CCTP Burn Complete (`cctp_burn_complete`)

**Triggers:** When USDC is successfully burned on source chain
**Channels:** PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ CCTP Transfer Complete (`cctp_transfer_complete`)

**Triggers:** When USDC is successfully minted on destination chain
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

#### ✅ CCTP Transfer Failed (`cctp_transfer_failed`)

**Triggers:** When cross-chain transfer fails at any stage
**Channels:** EMAIL, PUSH, IN_APP
**Category:** TRANSACTION

---

### 4. Security & Account Alerts

#### ✅ Large Transaction Alert (`circle_large_transaction`)

**Triggers:** When transaction exceeds threshold (e.g., $1000)
**Channels:** EMAIL, PUSH, IN_APP
**Category:** SECURITY

#### ✅ Suspicious Activity (`circle_suspicious_activity`)

**Triggers:** Unusual transaction patterns detected
**Channels:** EMAIL, PUSH, IN_APP
**Category:** SECURITY

#### ✅ Wallet Frozen (`circle_wallet_frozen`)

**Triggers:** When wallet is frozen (admin action or security)
**Channels:** EMAIL, PUSH, IN_APP
**Category:** SECURITY

#### ✅ Wallet Unfrozen (`circle_wallet_unfrozen`)

**Triggers:** When wallet is unlocked
**Channels:** EMAIL, PUSH, IN_APP
**Category:** SECURITY

#### ✅ Low Balance Warning (`circle_low_balance`)

**Triggers:** When wallet balance falls below threshold
**Channels:** PUSH, IN_APP
**Category:** ACCOUNT

---

## Email Templates

All notifications use professionally designed HTML email templates with:

- Responsive design
- Brand colors (#5b55f6 primary)
- Transaction details
- Blockchain explorer links
- Security tips where relevant
- Clear call-to-action buttons

### Template Files

1. `circle-wallet-created.template.ts` - Wallet creation
2. `circle-usdc-transaction.template.ts` - USDC send/receive
3. `cctp-transfer.template.ts` - Cross-chain transfers
4. `circle-security-alert.template.ts` - Security alerts

---

## Event Type Summary

| Event Type                     | Category    | Channels            | Priority |
| ------------------------------ | ----------- | ------------------- | -------- |
| `circle_wallet_created`        | ACCOUNT     | EMAIL, PUSH, IN_APP | Medium   |
| `circle_usdc_received`         | TRANSACTION | EMAIL, PUSH, IN_APP | High     |
| `circle_usdc_sent`             | TRANSACTION | EMAIL, PUSH, IN_APP | High     |
| `circle_transaction_confirmed` | TRANSACTION | PUSH, IN_APP        | Medium   |
| `circle_transaction_failed`    | TRANSACTION | EMAIL, PUSH, IN_APP | High     |
| `cctp_transfer_initiated`      | TRANSACTION | EMAIL, PUSH, IN_APP | Medium   |
| `cctp_burn_complete`           | TRANSACTION | PUSH, IN_APP        | Low      |
| `cctp_transfer_complete`       | TRANSACTION | EMAIL, PUSH, IN_APP | High     |
| `cctp_transfer_failed`         | TRANSACTION | EMAIL, PUSH, IN_APP | High     |
| `circle_large_transaction`     | SECURITY    | EMAIL, PUSH, IN_APP | High     |
| `circle_suspicious_activity`   | SECURITY    | EMAIL, PUSH, IN_APP | Critical |
| `circle_wallet_frozen`         | SECURITY    | EMAIL, PUSH, IN_APP | Critical |
| `circle_wallet_unfrozen`       | SECURITY    | EMAIL, PUSH, IN_APP | Medium   |
| `circle_low_balance`           | ACCOUNT     | PUSH, IN_APP        | Low      |
