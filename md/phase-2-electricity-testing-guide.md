# Phase 2: Electricity Payment - Testing Guide

**Complete guide for testing electricity endpoints with CURL**

---

## 📋 Setup

### Environment Variables

Set these before testing:

```bash
# For localhost testing
export URL="http://localhost:3001/api"
export ACCESSTOKEN="your-jwt-token-here"

# For production testing
export URL="https://raverpay-api-production.up.railway.app/api"
export ACCESSTOKEN="your-production-jwt-token"
```

### VTPass Sandbox Test Data

**Prepaid Meter:** `1111111111111`
**Postpaid Meter:** `1010101010101`
**Test Phone:** `08011111111`

---

## ⚡ Test 1: Get Electricity Providers (DISCOs)

### Localhost

```bash
curl -X GET "http://localhost:3001/api/vtu/electricity/providers" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

### Production

```bash
curl -X GET "{{URL}}/vtu/electricity/providers" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

### Expected Response

```json
[
  {
    "code": "ikeja-electric",
    "name": "Ikeja Electric (IKEDC)",
    "region": "Lagos"
  },
  {
    "code": "eko-electric",
    "name": "Eko Electric (EKEDC)",
    "region": "Lagos"
  },
  {
    "code": "abuja-electric",
    "name": "Abuja Electric (AEDC)",
    "region": "Abuja"
  },
  {
    "code": "kano-electric",
    "name": "Kano Electric (KEDCO)",
    "region": "Kano"
  },
  {
    "code": "portharcourt-electric",
    "name": "Port Harcourt Electric (PHED)",
    "region": "Port Harcourt"
  },
  {
    "code": "jos-electric",
    "name": "Jos Electric (JED)",
    "region": "Jos"
  },
  {
    "code": "ibadan-electric",
    "name": "Ibadan Electric (IBEDC)",
    "region": "Ibadan"
  },
  {
    "code": "enugu-electric",
    "name": "Enugu Electric (EEDC)",
    "region": "Enugu"
  },
  {
    "code": "benin-electric",
    "name": "Benin Electric (BEDC)",
    "region": "Benin"
  }
]
```

---

## ⚡ Test 2: Verify Prepaid Meter Number

### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

### Expected Response

```json
{
  "valid": true,
  "customerName": "TESTMETER1",
  "address": "ABULE EGBA BU ABULE",
  "meterNumber": "68100017372",
  "customerType": "PRIME",
  "meterType": "PREPAID",
  "minimumAmount": "",
  "customerArrears": ""
}
```

---

## ⚡ Test 3: Verify Postpaid Meter Number

### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1010101010101",
    "meterType": "postpaid"
  }' | python3 -m json.tool
```

### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1010101010101",
    "meterType": "postpaid"
  }' | python3 -m json.tool
```

### Expected Response

```json
{
  "valid": true,
  "customerName": "NP NGEMA",
  "address": "6 ABIODUN ODESEYE Shomolu BU",
  "meterNumber": "1010101010101",
  "customerType": "NMD",
  "meterType": "POSTPAID",
  "minimumAmount": "",
  "customerArrears": "0"
}
```

---

## ⚡ Test 4: Pay Prepaid Electricity Bill (IKEDC)

### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 2000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 2000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Expected Response

```json
{
  "reference": "VTU_ELEC_1731234567890ABC",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 2000,
  "fee": 50,
  "totalAmount": 2050,
  "provider": "IKEJA-ELECTRIC",
  "recipient": "1111111111111",
  "meterToken": "Token : 26362054405982757802",
  "units": "79.9 kWh",
  "tokenAmount": 1860.47,
  "tariff": "R2 SINGLE PHASE RESIDENTIAL",
  "customerName": "N/A",
  "customerAddress": "N/A",
  "meterNumber": "N/A",
  "message": "Electricity payment successful"
}
```

**⚠️ IMPORTANT:** Display the `meterToken` prominently to the user! This is the token they'll load on their meter.

---

## ⚡ Test 5: Pay Postpaid Electricity Bill (IKEDC)

### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1010101010101",
    "meterType": "postpaid",
    "amount": 2000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1010101010101",
    "meterType": "postpaid",
    "amount": 2000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Expected Response

```json
{
  "reference": "VTU_ELEC_1731234567890XYZ",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 2000,
  "fee": 50,
  "totalAmount": 2050,
  "provider": "IKEJA-ELECTRIC",
  "recipient": "1010101010101",
  "meterToken": "",
  "customerName": "NP NGEMA",
  "customerAddress": "6 ABIODUN ODESEYE Shomolu BU",
  "utilityName": "Eskom",
  "exchangeReference": "0971120581015673",
  "balance": null,
  "message": "Electricity payment successful"
}
```

**⚠️ NOTE:** Postpaid meters do NOT generate tokens. No `meterToken` will be present.

---

## ⚡ Test 6: Pay with Different DISCOs

### Test 6a: Eko Electric (EKEDC) - Prepaid

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "eko-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 3000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "eko-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 3000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Test 6b: Abuja Electric (AEDC) - Prepaid

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "abuja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 5000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "abuja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 5000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

---

## 🧪 Test 7: Error Scenarios

### Test 7a: Invalid Meter Number (Too Short)

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "12345",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "12345",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": ["Meter number must be 10-13 digits"],
  "error": "Bad Request"
}
```

### Test 7b: Invalid Meter Number (Non-numeric)

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "ABC123456789",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "ABC123456789",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": ["Meter number must be 10-13 digits"],
  "error": "Bad Request"
}
```

### Test 7c: Meter Not Found

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "9999999999999",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/verify" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "9999999999999",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": "Invalid meter number or customer not found",
  "error": "Bad Request"
}
```

### Test 7d: Amount Below Minimum

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 500,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 500,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": ["Minimum electricity payment is ₦1,000"],
  "error": "Bad Request"
}
```

### Test 7e: Insufficient Wallet Balance

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 1000000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 1000000,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance. Available: ₦5,000, Required: ₦1,000,050",
  "error": "Bad Request"
}
```

### Test 7f: Invalid Phone Number

#### Localhost

```bash
curl -X POST "http://localhost:3001/api/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 2000,
    "phone": "12345"
  }' | python3 -m json.tool
```

#### Production

```bash
curl -X POST "{{URL}}/vtu/electricity/pay" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "1111111111111",
    "meterType": "prepaid",
    "amount": 2000,
    "phone": "12345"
  }' | python3 -m json.tool
```

#### Expected Error

```json
{
  "statusCode": 400,
  "message": ["Invalid Nigerian phone number"],
  "error": "Bad Request"
}
```

---

## 📊 Test 8: Check Order Details

### Get Order by Reference

#### Localhost

```bash
# First, save the reference from a previous payment
export ELEC_REF="VTU_ELEC_1731234567890ABC"

curl -X GET "http://localhost:3001/api/vtu/orders/reference/$ELEC_REF" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

#### Production

```bash
curl -X GET "{{URL}}/vtu/orders/reference/$ELEC_REF" \
  -H "Authorization: Bearer {{ACCESSTOKEN}}" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

### Expected Response

```json
{
  "id": "order-uuid",
  "reference": "VTU_ELEC_1731234567890ABC",
  "serviceType": "ELECTRICITY",
  "provider": "IKEJA-ELECTRIC",
  "recipient": "1111111111111",
  "productCode": "prepaid",
  "productName": "IKEJA-ELECTRIC - PREPAID",
  "amount": "2000",
  "status": "COMPLETED",
  "providerRef": "17416102247366731230557150",
  "providerToken": "Token : 26362054405982757802",
  "providerResponse": {
    "status": "success",
    "transactionId": "17416102247366731230557150",
    "token": "VTU_ELEC_1731234567890ABC",
    "productName": "Ikeja Electric Payment - IKEDC",
    "amount": 2000,
    "commission": 30
  },
  "createdAt": "2025-11-11T10:00:00.000Z",
  "completedAt": "2025-11-11T10:00:05.000Z"
}
```

---

## ✅ Testing Checklist

### Basic Functionality

- [ ] Get electricity providers list
- [ ] Verify prepaid meter number (IKEDC)
- [ ] Verify postpaid meter number (IKEDC)
- [ ] Pay prepaid electricity bill (IKEDC)
- [ ] Pay postpaid electricity bill (IKEDC)

### Multiple DISCOs

- [ ] Pay with Eko Electric (EKEDC)
- [ ] Pay with Abuja Electric (AEDC)
- [ ] Pay with Kano Electric (KEDCO)

### Validation

- [ ] Invalid meter number (too short)
- [ ] Invalid meter number (non-numeric)
- [ ] Meter not found
- [ ] Amount below minimum
- [ ] Insufficient wallet balance
- [ ] Invalid phone number

### Integration

- [ ] Wallet debited correctly (amount + ₦50 fee)
- [ ] Transaction created in wallet history
- [ ] Order stored with correct details
- [ ] Prepaid: Token displayed in response
- [ ] Postpaid: No token in response
- [ ] Order can be retrieved by reference

### Response Fields (Prepaid)

- [ ] `meterToken` is present and valid
- [ ] `units` shows kWh purchased
- [ ] `tokenAmount` shows token value
- [ ] `tariff` shows tariff class

### Response Fields (Postpaid)

- [ ] `customerName` is present
- [ ] `customerAddress` is present
- [ ] `utilityName` is present
- [ ] No `meterToken` (postpaid doesn't generate tokens)

---

## 🚨 Critical Fields to Verify

### Prepaid Meter Payment

**MUST HAVE:**

- ✅ `meterToken` - The actual token to load on meter (e.g., "Token : 26362054405982757802")
- ✅ `units` - kWh purchased (e.g., "79.9 kWh")
- ✅ `tokenAmount` - Token value (e.g., 1860.47)
- ✅ `tariff` - Tariff class (e.g., "R2 SINGLE PHASE RESIDENTIAL")

### Postpaid Meter Payment

**MUST HAVE:**

- ✅ `customerName` - Customer's name
- ✅ `customerAddress` - Customer's address
- ✅ `exchangeReference` - Payment reference from DISCO
- ❌ `meterToken` - Should be empty/null (postpaid doesn't use tokens)

---

## 📝 Notes

1. **VTPass Sandbox:** Use the test meter numbers provided above
2. **Meter Token Display:** For prepaid, ALWAYS display the token prominently to users
3. **Transaction Fees:** Electricity payments have a flat ₦50 fee
4. **Minimum Amount:** ₦1,000 for all DISCOs
5. **Wallet Refund:** If payment fails, wallet is automatically refunded
6. **Order Status:** Check order status via reference for tracking

---

## 🔧 Quick Test Script

### Localhost Full Test

```bash
#!/bin/bash

export URL="http://localhost:3001/api"
export ACCESSTOKEN="your-token-here"

echo "1. Get DISCOs..."
curl -X GET "$URL/vtu/electricity/providers" \
  -H "Authorization: Bearer $ACCESSTOKEN" | python3 -m json.tool

echo "\n2. Verify Prepaid Meter..."
curl -X POST "$URL/vtu/electricity/verify" \
  -H "Authorization: Bearer $ACCESSTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disco":"ikeja-electric","meterNumber":"1111111111111","meterType":"prepaid"}' | python3 -m json.tool

echo "\n3. Pay Prepaid Electricity..."
curl -X POST "$URL/vtu/electricity/pay" \
  -H "Authorization: Bearer $ACCESSTOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disco":"ikeja-electric","meterNumber":"1111111111111","meterType":"prepaid","amount":2000,"phone":"08011111111"}' | python3 -m json.tool

echo "\n✅ All tests completed!"
```

---

**Testing Date:** November 11, 2025  
**Status:** Ready to Test ✅  
**Priority:** HIGH - Critical electricity fixes

---

**🎉 Happy Testing!**

---
