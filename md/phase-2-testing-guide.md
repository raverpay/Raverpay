# Phase 2: VTU Services - Testing Guide

**Complete guide for testing all VTU endpoints**

---

## 📋 Prerequisites

- ✅ Server running on `http://localhost:3001/api`
- ✅ User account created and logged in
- ✅ Access token exported as `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U`
- ✅ Wallet funded with at least ₦10,000
- ✅ VTPass API keys configured in `.env`

---

## 🔐 Setup

### 1. Start Server

```bash
cd /Users/joseph/Desktop/mularpay/apps/mularpay-api
pnpm run start:dev
```

### 2. Login & Get Token

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "ngrok.test@mularpay.com",
    "password": "Test@12345"
  }'

# Export token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg2NjU0LCJleHAiOjE3NjI3ODc1NTR9.KZH1-gLJjnwFT3vVH1khVYbaemQ4RUp118I9qrRylSc"
```

### 3. Check Wallet Balance

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected:**

```json
{
  "id": "...",
  "balance": "10000",
  "currency": "NGN"
}
```

---

## 📱 Test 1: Airtime Purchase

### Get Airtime Providers

```bash
curl -X GET http://localhost:3001/api/vtu/airtime/providers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  { "code": "mtn", "name": "MTN", "logo": "🟡" },
  { "code": "glo", "name": "GLO", "logo": "🟢" },
  { "code": "airtel", "name": "AIRTEL", "logo": "🔴" },
  { "code": "9mobile", "name": "9MOBILE", "logo": "🟢" }
]
```

### Purchase MTN Airtime

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg2NjU0LCJleHAiOjE3NjI3ODc1NTR9.KZH1-gLJjnwFT3vVH1khVYbaemQ4RUp118I9qrRylSc" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "mtn",
    "phone": "08011111111",
    "amount": 500
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_AIR_1731234567890ABC",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 500,
  "fee": 10,
  "totalAmount": 510,
  "provider": "MTN",
  "recipient": "08012345678",
  "message": "Airtime purchased successfully"
}
```

### Save Reference

```bash
export AIRTIME_REF="VTU_AIR_1731234567890ABC"
```

### Verify Wallet Debited

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg2NjU0LCJleHAiOjE3NjI3ODc1NTR9.KZH1-gLJjnwFT3vVH1khVYbaemQ4RUp118I9qrRylSc" | python3 -m json.tool
```

**Expected:**

```json
{
  "balance": "5490" // 5000 - 510
}
```

---

## 📶 Test 2: Data Bundle Purchase

### Get MTN Data Plans

```bash
curl -X GET http://localhost:3001/api/vtu/data/plans/MTN \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg2NjU0LCJleHAiOjE3NjI3ODc1NTR9.KZH1-gLJjnwFT3vVH1khVYbaemQ4RUp118I9qrRylSc" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "variation_code": "mtn-10mb-100",
    "name": "10MB",
    "variation_amount": "100",
    "fixedPrice": "Yes"
  },
  {
    "variation_code": "mtn-1gb-1000",
    "name": "1GB - 30 Days",
    "variation_amount": "1000",
    "fixedPrice": "Yes"
  },
  {
    "variation_code": "mtn-2gb-2000",
    "name": "2GB - 30 Days",
    "variation_amount": "2000",
    "fixedPrice": "Yes"
  }
]
```

### Purchase 1GB MTN Data

```bash
curl -X POST http://localhost:3001/api/vtu/data/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "productCode": "mtn-1gb-1000"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_DATA_1731234567890XYZ",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 1000,
  "fee": 20,
  "totalAmount": 1020,
  "provider": "MTN",
  "recipient": "08012345678",
  "productName": "1GB - 30 Days",
  "message": "Data bundle purchased successfully"
}
```

### Test Other Networks

**GLO Data:**

```bash
# Get GLO plans
curl -X GET http://localhost:3001/api/vtu/data/plans/GLO \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool

# Purchase GLO data
curl -X POST http://localhost:3001/api/vtu/data/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "GLO",
    "phone": "08012345678",
    "productCode": "glo-1gb-1000"
  }' | python3 -m json.tool
```

**AIRTEL Data:**

```bash
curl -X GET http://localhost:3001/api/vtu/data/plans/AIRTEL \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**9MOBILE Data:**

```bash
curl -X GET http://localhost:3001/api/vtu/data/plans/9MOBILE \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### GLO SME Data Plans

```bash
# Get GLO SME data plans
curl -X GET http://localhost:3001/api/vtu/data/sme-plans/glo \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "variation_code": "glo-dg-50",
    "name": "Glo Data (SME) N50 - 200MB - 14 days",
    "variation_amount": "50.00",
    "fixedPrice": "Yes"
  },
  {
    "variation_code": "glo-dg-125-14",
    "name": "Glo Data (SME) N125 - 500MB 14 days",
    "variation_amount": "125.00",
    "fixedPrice": "Yes"
  }
]
```

### Purchase GLO SME Data

```bash
curl -X POST http://localhost:3001/api/vtu/data/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "GLO",
    "phone": "08011111111",
    "productCode": "glo-dg-125-14",
    "isSME": true
  }' | python3 -m json.tool
```

**Note:** Set `isSME: true` to purchase SME data bundles (currently only available for GLO).

---

## 🌍 Test 3: International Airtime/Data

### Get International Countries

```bash
curl -X GET http://localhost:3001/api/vtu/international/countries \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "code": "GH",
    "name": "Ghana",
    "currency": "GHS",
    "prefix": "233",
    "flag": "https://sandbox.vtpass.com/resources/images/flags/GH.png"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "currency": "NGN",
    "prefix": "234",
    "flag": "https://sandbox.vtpass.com/resources/images/flags/NG.png"
  }
]
```

### Get Product Types for Country

```bash
curl -X GET "http://localhost:3001/api/vtu/international/product-types/GH" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "product_type_id": 1,
    "name": "Mobile Top Up"
  },
  {
    "product_type_id": 4,
    "name": "Mobile Data"
  }
]
```

### Get Operators for Country and Product Type

```bash
curl -X GET "http://localhost:3001/api/vtu/international/operators/GH/4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "operator_id": "5",
    "name": "Ghana MTN",
    "operator_image": "https://sandbox.vtpass.com/resources/images/operators/80.png"
  }
]
```

### Get Variations for Operator

```bash
curl -X GET "http://localhost:3001/api/vtu/international/variations/5/1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "variation_code": "13076",
    "name": "900 MTN & 100 Local Mins, 1000 SMS, 1GB, & 1GB WTF Mobile Bundle",
    "variation_amount": "0.00",
    "fixedPrice": "Yes"
  }
]
```

### Purchase International Airtime/Data

```bash
curl -X POST http://localhost:3001/api/vtu/international/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "billersCode": "08011111111",
    "variationCode": "13076",
    "operatorId": "5",
    "countryCode": "GH",
    "productTypeId": "1",
    "phone": "08011111111"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_INTL_1731234567890XYZ",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 2,
  "fee": 50,
  "totalAmount": 52,
  "provider": "INTERNATIONAL",
  "recipient": "08011111111",
  "productName": "International Airtime",
  "message": "International airtime purchased successfully"
}
```

**Important Notes:**

- `billersCode`: The recipient's phone number in international format
- `operatorId`: The operator ID from the Get Operators endpoint
- `countryCode`: The country code (e.g., GH, NG)
- `productTypeId`: 1 for Mobile Top Up, 4 for Mobile Data
- `phone`: Your phone number (user's phone)
- `email`: Optional - will use user's email if not provided

---

## 📺 Test 4: Cable TV Subscription

### Get DSTV Plans

```bash
curl -X GET http://localhost:3001/api/vtu/cable-tv/plans/dstv \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  {
    "variation_code": "dstv-padi",
    "name": "DStv Padi N1,850",
    "variation_amount": "1850.00",
    "fixedPrice": "Yes"
  },
  {
    "variation_code": "dstv-yanga",
    "name": "DStv Yanga N2,565",
    "variation_amount": "2565.00",
    "fixedPrice": "Yes"
  }
]
```

### Verify Smartcard Number

```bash
curl -X POST http://localhost:3001/api/vtu/cable-tv/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1212121212"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "valid": true,
  "customerName": "TEST METER",
  "status": "ACTIVE",
  "dueDate": "2025-02-06T00:00:00"
}
```

**Note:** In sandbox, use `1212121212` as the smartcard number for successful verification.

### Pay DSTV Subscription (Change Bouquet)

```bash
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1212121212",
    "subscriptionType": "change",
    "productCode": "dstv-padi",
    "phone": "08011111111"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_CABLE_1731234567890DEF",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 1850,
  "fee": 50,
  "totalAmount": 1900,
  "provider": "DSTV",
  "recipient": "1212121212",
  "productName": "DStv Padi N1,850",
  "message": "Cable TV subscription successful"
}
```

### Pay DSTV Subscription (Renew Current Bouquet)

```bash
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1212121212",
    "subscriptionType": "renew",
    "productCode": "dstv-padi",
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Pay Multi-Month DSTV Subscription

```bash
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DSTV",
    "smartcardNumber": "1212121212",
    "subscriptionType": "change",
    "productCode": "dstv-padi",
    "quantity": 3,
    "phone": "08011111111"
  }' | python3 -m json.tool
```

**Note:** `quantity` parameter allows multi-month subscriptions (DSTV/GOTV only).

### Test GOtv

```bash
# Get GOtv plans
curl -X GET http://localhost:3001/api/vtu/cable-tv/plans/gotv \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool

# Pay GOtv (Change subscription)
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GOTV",
    "smartcardNumber": "1212121212",
    "subscriptionType": "change",
    "productCode": "gotv-lite",
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Test Startimes

```bash
# Get Startimes plans
curl -X GET http://localhost:3001/api/vtu/cable-tv/plans/startimes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool

# Pay Startimes (Always use 'renew')
curl -X POST http://localhost:3001/api/vtu/cable-tv/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "STARTIMES",
    "smartcardNumber": "1212121212",
    "subscriptionType": "renew",
    "productCode": "nova",
    "phone": "08011111111"
  }' | python3 -m json.tool
```

### Test Showmax

```bash
# Pay Showmax (uses phone number as billersCode)
curl -X POST http://localhost:3001/api/vtu/showmax/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "08011111111",
    "productCode": "full_3"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_SHOWMAX_1731234567890ABC",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 8400,
  "fee": 50,
  "totalAmount": 8450,
  "provider": "SHOWMAX",
  "recipient": "08011111111",
  "productName": "Full - N8,400 - 3 Months",
  "voucher": "SHMVHXQ9L3RXGPU",
  "message": "Showmax subscription successful"
}
```

**Important Notes:**

- **Subscription Types:**
  - `change`: For new subscription or changing bouquet (requires `productCode`)
  - `renew`: For renewing current subscription (requires `productCode` for verification)
- **Provider Names:** Must be UPPERCASE (DSTV, GOTV, STARTIMES)
- **Sandbox Testing:** Use `1212121212` as smartcard number and `08011111111` as phone number

---

## ⚡ Test 5: Electricity Payment

### Get Electricity Providers (DISCOs)

```bash
curl -X GET http://localhost:3001/api/vtu/electricity/providers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
[
  { "code": "ikeja-electric", "name": "Ikeja Electric (IKEDC)", "region": "Lagos" },
  { "code": "eko-electric", "name": "Eko Electric (EKEDC)", "region": "Lagos" },
  { "code": "abuja-electric", "name": "Abuja Electric (AEDC)", "region": "Abuja" },
  { "code": "kano-electric", "name": "Kano Electric (KEDCO)", "region": "Kano" }
]
```

### Verify Meter Number

```bash
curl -X POST http://localhost:3001/api/vtu/electricity/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "12345678901",
    "meterType": "prepaid"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "valid": true,
  "customerName": "JOHN DOE",
  "address": "123 LAGOS STREET",
  "customerType": "PREPAID",
  "minimumAmount": "1000"
}
```

**Note:** Sandbox may return an error. Proceed anyway.

### Pay Electricity Bill (Prepaid)

```bash
curl -X POST http://localhost:3001/api/vtu/electricity/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "ikeja-electric",
    "meterNumber": "12345678901",
    "meterType": "prepaid",
    "amount": 5000,
    "phone": "08012345678"
  }' | python3 -m json.tool
```

**Expected response:**

```json
{
  "reference": "VTU_ELEC_1731234567890GHI",
  "orderId": "uuid-here",
  "status": "COMPLETED",
  "amount": 5000,
  "fee": 50,
  "totalAmount": 5050,
  "provider": "IKEJA-ELECTRIC",
  "recipient": "12345678901",
  "meterToken": "1234-5678-9012-3456",
  "message": "Electricity payment successful"
}
```

### Test Postpaid Meter

```bash
curl -X POST http://localhost:3001/api/vtu/electricity/pay \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "disco": "eko-electric",
    "meterNumber": "98765432109",
    "meterType": "postpaid",
    "amount": 10000,
    "phone": "08012345678"
  }' | python3 -m json.tool
```

---

## 📊 Test 6: Order Management

### Get All Orders

```bash
curl -X GET http://localhost:3001/api/vtu/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Expected response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "VTU_AIR_1731234567890ABC",
      "serviceType": "AIRTIME",
      "provider": "MTN",
      "recipient": "08012345678",
      "productCode": "mtn",
      "productName": "MTN Airtime",
      "amount": "500",
      "status": "COMPLETED",
      "providerRef": "VTP123456789",
      "createdAt": "2025-11-10T12:00:00.000Z",
      "completedAt": "2025-11-10T12:00:05.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "summary": {
    "totalSpent": "19070.00",
    "completedOrders": 8,
    "pendingOrders": 0,
    "failedOrders": 2
  }
}
```

### Filter by Service Type

**Airtime only:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?serviceType=AIRTIME" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Data only:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?serviceType=DATA" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Cable TV only:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?serviceType=CABLE_TV" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Electricity only:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?serviceType=ELECTRICITY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### Filter by Status

**Completed:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?status=COMPLETED" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Pending:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?status=PENDING" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Failed:**

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?status=FAILED" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### Filter by Date Range

```bash
curl -X GET "http://localhost:3001/api/vtu/orders?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### Pagination

```bash
# Page 2, 10 items per page
curl -X GET "http://localhost:3001/api/vtu/orders?page=2&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### Get Order by ID

```bash
export ORDER_ID="your-order-uuid"

curl -X GET http://localhost:3001/api/vtu/orders/$ORDER_ID \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

### Get Order by Reference

```bash
curl -X GET http://localhost:3001/api/vtu/orders/reference/$AIRTIME_REF \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

---

## 🧪 Test 7: Error Handling

### Test Insufficient Balance

```bash
# Try to buy ₦100,000 airtime (more than wallet balance)
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100000
  }' | python3 -m json.tool
```

**Expected:**

```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance. Available: ₦9,490, Required: ₦102,000",
  "error": "Bad Request"
}
```

### Test Invalid Phone Number

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "12345",
    "amount": 500
  }' | python3 -m json.tool
```

**Expected:**

```json
{
  "statusCode": 400,
  "message": ["Invalid Nigerian phone number"],
  "error": "Bad Request"
}
```

### Test Invalid Network

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "INVALID",
    "phone": "08012345678",
    "amount": 500
  }' | python3 -m json.tool
```

**Expected:**

```json
{
  "statusCode": 400,
  "message": ["Network must be MTN, GLO, AIRTEL, or 9MOBILE"],
  "error": "Bad Request"
}
```

### Test Amount Limits

**Below minimum:**

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 10
  }' | python3 -m json.tool
```

**Expected:**

```json
{
  "statusCode": 400,
  "message": ["Minimum airtime is ₦50"],
  "error": "Bad Request"
}
```

**Above maximum:**

```bash
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100000
  }' | python3 -m json.tool
```

**Expected:**

```json
{
  "statusCode": 400,
  "message": ["Maximum airtime is ₦50,000"],
  "error": "Bad Request"
}
```

### Test Duplicate Order

```bash
# Purchase same airtime twice within 1 minute
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 500
  }' | python3 -m json.tool

# Immediately retry
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 500
  }' | python3 -m json.tool
```

**Expected on second request:**

```json
{
  "statusCode": 409,
  "message": "Duplicate order detected. Please wait before retrying.",
  "error": "Conflict"
}
```

### Test Concurrent Transactions

```bash
# Run two purchases at the same time (in different terminals)
# Terminal 1:
curl -X POST http://localhost:3001/api/vtu/airtime/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "amount": 1000
  }'

# Terminal 2 (immediately):
curl -X POST http://localhost:3001/api/vtu/data/purchase \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" \
  -H "Content-Type: application/json" \
  -d '{
    "network": "MTN",
    "phone": "08012345678",
    "productCode": "mtn-1gb-1000"
  }'
```

**Expected on second request:**

```json
{
  "statusCode": 409,
  "message": "Another transaction is in progress. Please wait.",
  "error": "Conflict"
}
```

---

## 📈 Test 8: Transaction History

### Check Wallet Transactions

```bash
curl -X GET http://localhost:3001/api/wallet/transactions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJhYTM1Mi02ZmIxLTQzOWYtODgxMS01ZmNmZDQyYzZiNjEiLCJlbWFpbCI6Im5ncm9rLnRlc3RAbXVsYXJwYXkuY29tIiwicGhvbmUiOiIwODAxMTIyMzM0NCIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzYyNzg1MDI0LCJleHAiOjE3NjI3ODU5MjR9.jhT2dJmXsneRpTU6KyDgUZGsRIvmL3wuAdq417FH19U" | python3 -m json.tool
```

**Should show VTU purchases:**

```json
{
  "data": [
    {
      "reference": "VTU_AIR_1731234567890ABC",
      "type": "VTU_PURCHASE",
      "status": "COMPLETED",
      "amount": "500.00",
      "fee": "10.00",
      "description": "MTN Airtime - 08012345678"
    },
    {
      "reference": "VTU_DATA_1731234567890XYZ",
      "type": "VTU_PURCHASE",
      "status": "COMPLETED",
      "amount": "1000.00",
      "fee": "20.00",
      "description": "MTN Data - 1GB - 30 Days"
    }
  ]
}
```

---

## ✅ Testing Checklist

### Product Catalog

- [ ] Get airtime providers ✅
- [ ] Get MTN data plans ✅
- [ ] Get GLO data plans ✅
- [ ] Get AIRTEL data plans ✅
- [ ] Get 9MOBILE data plans ✅
- [ ] Get GLO SME data plans ✅
- [ ] Get international countries ✅
- [ ] Get international product types ✅
- [ ] Get international operators ✅
- [ ] Get international variations ✅
- [ ] Get DSTV plans ✅
- [ ] Get GOtv plans ✅
- [ ] Get Startimes plans ✅
- [ ] Get electricity providers ✅

### Validation

- [ ] Verify DSTV smartcard ✅
- [ ] Verify GOtv smartcard ✅
- [ ] Verify prepaid meter ✅
- [ ] Verify postpaid meter ✅

### Purchases

- [ ] Buy MTN airtime ✅
- [ ] Buy GLO airtime ✅
- [ ] Buy AIRTEL airtime ✅
- [ ] Buy 9MOBILE airtime ✅
- [ ] Buy MTN data ✅
- [ ] Buy GLO data ✅
- [ ] Buy GLO SME data ✅
- [ ] Buy international airtime/data ✅
- [ ] Pay DSTV subscription (change) ✅
- [ ] Pay DSTV subscription (renew) ✅
- [ ] Pay DSTV multi-month subscription ✅
- [ ] Pay GOtv subscription ✅
- [ ] Pay Startimes subscription ✅
- [ ] Pay Showmax subscription ✅
- [ ] Pay IKEDC electricity ✅
- [ ] Pay EKEDC electricity ✅

### Order Management

- [ ] Get all orders ✅
- [ ] Filter by service type ✅
- [ ] Filter by status ✅
- [ ] Filter by date range ✅
- [ ] Pagination ✅
- [ ] Get order by ID ✅
- [ ] Get order by reference ✅

### Error Handling

- [ ] Insufficient balance ✅
- [ ] Invalid phone number ✅
- [ ] Invalid network ✅
- [ ] Amount below minimum ✅
- [ ] Amount above maximum ✅
- [ ] Duplicate order ✅
- [ ] Concurrent transactions ✅

### Integration

- [ ] Wallet debited correctly ✅
- [ ] Fees calculated correctly ✅
- [ ] Transactions recorded ✅
- [ ] Refund on failure ✅

---

## 🎯 Success Criteria

All tests should pass with:

- ✅ Correct status codes
- ✅ Wallet balance updates
- ✅ Transaction records created
- ✅ Orders stored in database
- ✅ Proper error messages
- ✅ No race conditions
- ✅ Atomic operations

---

## 🚨 Known Issues (Sandbox)

### VTPass Sandbox Limitations

1. **Limited test data** - Some product codes may not exist
2. **Verification may fail** - Smartcard/meter validation often returns errors
3. **Delayed responses** - API may be slow
4. **Service unavailable** - Some services don't work in sandbox

### Workarounds

- **If verification fails:** Skip verification and proceed with purchase (for testing)
- **If purchase fails:** Check VTPass dashboard for error details
- **If API is slow:** Increase timeout or use production keys
- **If service unavailable:** Try a different service type

---

## 📝 Notes

- **VTPass API keys required** - Get from https://sandbox.vtpass.com
- **Wallet must be funded** - At least ₦10,000 for all tests
- **Test phone numbers** - Use your real number or test numbers
- **Sandbox limitations** - Not all features work in test mode
- **Refunds are automatic** - Failed orders refund immediately

---

**Testing Date:** November 10, 2025  
**Environment:** Local  
**Status:** Ready to Test ✅

---

**Happy Testing! 🎉**

All endpoints are now functional and ready for production deployment after successful local testing.
