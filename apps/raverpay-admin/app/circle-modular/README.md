# Circle Modular Wallets - WebView Integration

## Overview

This page provides a WebView interface for Circle Modular Wallets, allowing the mobile app to use passkey authentication and gasless transactions without needing native SDK integration.

## Environment Variables

Add these to your `.env.local` file:

```bash
# Circle API Configuration
NEXT_PUBLIC_CIRCLE_API_URL=https://api.circle.com/v1/w3s
NEXT_PUBLIC_CIRCLE_API_KEY=your_circle_api_key_here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Usage from Mobile App

### 1. Register Passkey

```typescript
// React Native
import { WebView } from 'react-native-webview';

const url = `https://your-admin-url.com/circle-modular?action=register&token=${userToken}&userId=${userId}&username=${username}`;

<WebView
  source={{ uri: url }}
  onMessage={(event) => {
    const { type, data } = JSON.parse(event.nativeEvent.data);
    
    if (type === 'passkey_registered') {
      console.log('Passkey registered:', data.credentialId);
      // Proceed to wallet creation or close WebView
    }
    
    if (type === 'wallet_created') {
      console.log('Wallet created:', data.address);
      // Save wallet info and close WebView
    }
    
    if (type === 'error') {
      console.error('Error:', data.message);
    }
  }}
/>
```

### 2. Login with Passkey

```typescript
const url = `https://your-admin-url.com/circle-modular?action=login&token=${userToken}&userId=${userId}`;

<WebView
  source={{ uri: url }}
  onMessage={(event) => {
    const { type, data } = JSON.parse(event.nativeEvent.data);
    
    if (type === 'passkey_login_success') {
      console.log('Login successful');
      // Close WebView
    }
  }}
/>
```

### 3. Send Transaction (Gasless)

```typescript
const url = `https://your-admin-url.com/circle-modular?action=send&token=${userToken}&userId=${userId}&to=${recipientAddress}&amount=${amount}`;

<WebView
  source={{ uri: url }}
  onMessage={(event) => {
    const { type, data } = JSON.parse(event.nativeEvent.data);
    
    if (type === 'transaction_success') {
      console.log('Transaction hash:', data.transactionHash);
      console.log('UserOp hash:', data.userOpHash);
      // Close WebView and show success
    }
  }}
/>
```

## URL Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `action` | Yes | Action to perform: `register`, `login`, or `send` |
| `token` | Yes | User's JWT token for API authentication |
| `userId` | Yes | User ID |
| `username` | No | Username for passkey registration (defaults to `user_{userId}`) |
| `blockchain` | No | Blockchain to use (defaults to `MATIC-AMOY`) |
| `to` | Yes (for send) | Recipient address |
| `amount` | Yes (for send) | Amount to send in USDC |

## Message Types

### From WebView to App

```typescript
// Passkey registered
{
  type: 'passkey_registered',
  data: {
    credentialId: string,
    publicKey: string
  }
}

// Wallet created
{
  type: 'wallet_created',
  data: {
    address: string,
    credentialId: string,
    publicKey: string
  }
}

// Login success
{
  type: 'passkey_login_success',
  data: {
    credentialId: string
  }
}

// Transaction success
{
  type: 'transaction_success',
  data: {
    userOpHash: string,
    transactionHash: string
  }
}

// Error
{
  type: 'error',
  data: {
    message: string
  }
}
```

## Flow Diagram

```
Mobile App
    ↓
Opens WebView with action=register
    ↓
User authenticates with Face ID/Touch ID
    ↓
Passkey created & saved to backend
    ↓
postMessage: passkey_registered
    ↓
Auto-proceed to wallet creation
    ↓
Smart wallet created on blockchain
    ↓
Wallet saved to backend
    ↓
postMessage: wallet_created
    ↓
Mobile app closes WebView
```

## Features

- ✅ **Passkey Authentication** - Uses WebAuthn for secure biometric auth
- ✅ **Gasless Transactions** - Gas fees paid in USDC via Circle Paymaster
- ✅ **Smart Accounts** - ERC-4337 compliant smart contract wallets
- ✅ **Cross-platform** - Works on iOS and Android WebViews
- ✅ **No Native SDK** - Pure web implementation

## Security Notes

1. **HTTPS Required** - WebAuthn requires secure context
2. **Token Validation** - Backend validates JWT tokens
3. **User Ownership** - Wallets are tied to user accounts
4. **Passkey Storage** - Credentials stored securely by OS

## Testing

### Local Development

1. Start the admin app:
   ```bash
   cd apps/raverpay-admin
   pnpm dev
   ```

2. Open in browser:
   ```
   http://localhost:3000/circle-modular?action=register&token=test&userId=123&username=testuser
   ```

3. Test with mobile WebView emulator or real device

### Production

Deploy admin app and update mobile app with production URL.

## Troubleshooting

### Passkey not working
- Ensure HTTPS is enabled
- Check browser/WebView supports WebAuthn
- Verify Circle API credentials

### Transaction failing
- Check wallet has USDC balance
- Verify paymaster is enabled for blockchain
- Check network connectivity

### WebView communication issues
- Ensure `ReactNativeWebView` is injected
- Check `postMessage` is working
- Verify message parsing in mobile app
