If implementing virtual account numbers (Mosaic Code):

1. GENERATE VIRTUAL ACCOUNT:
   - Integrate with payment provider (Paystack, Flutterwave, or Providus Bank)
   - Generate unique account number for each user on registration
   - Format: XXX-XXXX-XXXX (for display) or 10-digit number
   - Store in users table:

```sql
     ALTER TABLE users
     ADD COLUMN virtual_account_number VARCHAR(20),
     ADD COLUMN virtual_account_bank VARCHAR(100),
     ADD COLUMN virtual_account_name VARCHAR(255);
```

2. WEBHOOK HANDLING:
   - Listen for incoming deposits to virtual account
   - Automatically credit user wallet
   - Send push notification
   - Update transaction history

3. API ENDPOINT:

```typescript
   GET /api/wallet/virtual-account
   Response: {
     accountNumber: "7055745341",
     accountName: "INGANTA PAY - JOHN KINGSLEY",
     bankName: "Providus Bank",
     formatted: "705 - 5745 - 3411"
   }
```

4. DISPLAY LOGIC:
   - Show in header of home screen
   - Add to wallet details page
   - Include in "Fund Wallet" instructions
   - Add to share/export wallet info

5. SECURITY:
   - Encrypt account numbers in database
   - Rate limit account number retrieval
   - Log all access to account numbers
   - Never show full number in logs
