# 🧪 Alchemy API Testing - With Real Users

**Server**: https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api  
**Date**: January 26, 2026  
**Status**: Phase 11 Testing Successfully Completed ✅

---

## 👥 **Test Users & Wallets**

### User 1 (Sender):

- **Email**: test.user1@raverpay.com
- **Alchemy Wallet (Amoy)**: `0x763636994788e0088ba2796c7e53b41280ae5ea0`
- **Initial State**: 20 USDC, 0 POL (Gas)
- **Action**: Funded with 0.1 POL from faucet for gas.

### Joseph (Recipient):

- **Email**: codeswithjoseph@gmail.com
- **Alchemy Wallet (Amoy)**: `0x9a3d9cf1370b38f2e59fb8ea4fc625ed156e6126`

---

## 🧪 **Test Results**

### ✅ Test 1: Webhook Health Check

**Result**: PASS

- Endpoint verified and responsive.

### ✅ Test 2: User Registration & Login

**Result**: PASS

- Verified for Test User 1 and codeswithjoseph.

### ✅ Test 3: Alchemy Wallet Generation (EOA)

**Result**: PASS

- Successfully generated EOA wallets for both users on Polygon Amoy.

### ✅ Test 4: Circle Multi-Asset Support (Fixed)

**Result**: PASS

- **Issue**: Circle-controlled wallets for some users were non-custodial (LOCKED state), preventing API-only gas funding.
- **Fix**: Updated the Mobile App and API to support native token selection (POL) and user-controlled PIN signing.
- **Verification**: User can now send POL gas directly from the mobile app to their Alchemy wallets.

### ✅ Test 5: Alchemy-to-Alchemy USDC Transfer (Live)

**Action**: Send 2.0 USDC from Test User 1 to Joseph.

```bash
curl -s -X POST 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api/alchemy/transactions/send' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "walletId": "3e529bf1-acd6-418c-abd5-132fc4001e44",
    "destinationAddress": "0x9a3d9cf1370b38f2e59fb8ea4fc625ed156e6126",
    "amount": "2.0",
    "tokenType": "USDC"
  }'
```

**Result**: ✅ **PASS**

- **Transaction Hash**: `0x906aa5814497a6fb6d4117657e704b0e03205571dd73848a9a334b936b683ca5`
- **Confirmation**: Joseph's wallet balance updated to **2.0 USDC**.

---

## 📈 **Key Feature Updates During Testing**

1.  **Smart Balance Tracking**: Mobile app now displays both USDC and Native Token (Gas) balances for all Circle wallets.
2.  **Multi-Token Sending**: The Send screen now includes an asset selector, allowing users to choose between sending USDC or Native Gas tokens.
3.  **Automatic Token Mapping**: API now automatically maps token names (USDC/POL) to their correct IDs based on the blockchain.
4.  **User-Controlled Signing**: Backend was updated to allow non-custodial (User-Controlled) transfers via challenge/PIN flow.

---

## 🏁 **Conclusion**

Phase 11 real-world testing is complete. The system can successfully:

1.  Generate secure Alchemy wallets.
2.  Fund those wallets with gas (via the new multi-asset Send feature).
3.  Perform EOA-to-EOA transfers of USDC on the Polygon Amoy network.

**Ready for Phase 12: Smart Contract Account (SCA) Gasless Transfers.**
