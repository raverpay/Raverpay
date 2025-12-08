# SMS Service - Multi-Provider Support

The SMS service now supports multiple SMS providers with easy switching between them.

## Supported Providers

1. **Termii** (Current default)
2. **VTPass**

## Configuration

### Switching Between Providers

To switch between SMS providers, update the `SMS_PROVIDER` environment variable in your `.env` file:

```env
# Use Termii
SMS_PROVIDER=termii

# OR use VTPass
SMS_PROVIDER=vtpass
```

### Termii Configuration

```env
SMS_PROVIDER=termii
TERMII_API_KEY=your_termii_api_key_here
TERMII_SENDER_ID=MularPay
TERMII_BASE_URL=https://api.ng.termii.com
```

**Getting Termii Credentials:**
1. Sign up at [https://termii.com](https://termii.com)
2. Get your API key from the dashboard
3. Register your sender ID (e.g., "MularPay")
4. Add credentials to `.env`

**Note:** Termii uses the `dnd` channel for transactional messages (OTP, password reset) which bypasses DND restrictions.

### VTPass Configuration

```env
SMS_PROVIDER=vtpass
VTPASS_MESSAGING_PUBLIC_KEY=VT_PK_xxxxxxxxxxxxx
VTPASS_MESSAGING_SECRET_KEY=VT_SK_xxxxxxxxxxxxx
VTPASS_SMS_SENDER=MularPay
VTPASS_USE_DND_ROUTE=true
```

**Getting VTPass Credentials:**
1. Sign up at [https://vtpass.com](https://vtpass.com)
2. Get your messaging public and secret keys
3. Register your sender ID (awaiting approval for "MularPay")
4. Add credentials to `.env`

## Usage

The SMS service automatically uses the configured provider. No code changes needed!

```typescript
// In your service
constructor(private readonly smsService: SmsService) {}

// Send verification code
await this.smsService.sendVerificationCode(phone, code, firstName);

// Send password reset SMS
await this.smsService.sendPasswordResetSms(phone, code, firstName);

// Send transaction alert
await this.smsService.sendTransactionAlert(phone, firstName, {
  type: 'deposit',
  amount: '5000',
  reference: 'TXN_123456'
});

// Check balance
const balance = await this.smsService.checkBalance();

// Get current provider name
const provider = this.smsService.getProviderName(); // 'Termii' or 'VTPass'
```

## Features

- **Provider Abstraction**: All providers implement the same interface
- **Easy Switching**: Change provider with a single environment variable
- **Mock Mode**: Automatically logs SMS instead of sending when credentials are missing
- **Balance Checking**: Query remaining SMS balance
- **DND Support**: Both providers support DND routes for transactional messages
- **Automatic Phone Formatting**: Converts Nigerian phone numbers to international format (234...)

## Architecture

```
sms.service.ts (Main service)
    ↓
ISmsProvider (Interface)
    ↓
├── TermiiProvider (Termii implementation)
└── VTPassProvider (VTPass implementation)
```

## Adding a New Provider

1. Create a new provider class in `providers/` folder
2. Implement the `ISmsProvider` interface
3. Add provider configuration to `.env`
4. Update `sms.service.ts` constructor to initialize your provider

Example:

```typescript
export class NewProvider implements ISmsProvider {
  async sendVerificationCode(phone: string, code: string, firstName: string): Promise<boolean> {
    // Implementation
  }
  // ... implement other methods
}
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMS_PROVIDER` | No | `termii` | SMS provider to use (`termii` or `vtpass`) |
| `ENABLE_SMS_VERIFICATION` | No | `true` | Enable/disable SMS sending globally |
| `TERMII_API_KEY` | Yes (for Termii) | - | Termii API key |
| `TERMII_SENDER_ID` | No | `MularPay` | Termii sender ID |
| `TERMII_BASE_URL` | No | `https://api.ng.termii.com` | Termii API base URL |
| `VTPASS_MESSAGING_PUBLIC_KEY` | Yes (for VTPass) | - | VTPass public key |
| `VTPASS_MESSAGING_SECRET_KEY` | Yes (for VTPass) | - | VTPass secret key |
| `VTPASS_SMS_SENDER` | No | `MularPay` | VTPass sender ID |
| `VTPASS_USE_DND_ROUTE` | No | `false` | Use DND route for VTPass |

## Testing

When credentials are not configured or `ENABLE_SMS_VERIFICATION=false`, the service runs in mock mode and logs messages instead of sending them:

```
📱 [MOCK] [Termii] Verification code SMS to 08012345678: 123456
```

## Current Status

- ✅ Termii: Ready to use (set API key)
- ⏳ VTPass: Awaiting sender ID approval

**Recommendation:** Use Termii until VTPass sender ID is approved.
