# Phase 2: Electricity Payment - Required Fixes

**Based on Official VTPass Electricity API Documentation**

---

## 🔍 Issues Found

After comparing the existing implementation with the official VTPass documentation (`electricity.md`), the following critical issues were identified:

### 1. ❌ **CRITICAL: Incorrect ServiceID Format**

**Current Implementation (WRONG):**

```
serviceID = "ikeja-electric-prepaid" or "ikeja-electric-postpaid"
```

**Correct Implementation (per VTPass docs):**

```
serviceID = "ikeja-electric"
variation_code = "prepaid" or "postpaid"
```

**Location:**

- `vtpass.service.ts` - Line 234 (verifyMeterNumber)
- `vtpass.service.ts` - Line 434 (payElectricity)

**Impact:**

- Meter verification will fail
- Electricity payments will fail
- API will return invalid serviceID errors

---

### 2. ❌ **CRITICAL: Missing 'type' Parameter in Verification**

**Current Implementation (WRONG):**
The verification endpoint concatenates meter type to serviceID instead of passing it as a separate parameter.

**Correct Implementation (per VTPass docs):**
The verification endpoint should send:

- `billersCode`: meter number
- `serviceID`: disco name (e.g., "ikeja-electric")
- `type`: "prepaid" or "postpaid" (separate field)

**Location:**

- `vtpass.service.ts` - `verifyCustomer` method (Line 208-222)

**Impact:**

- Meter number validation will always fail
- Users cannot verify their meters before payment

---

### 3. ⚠️ **Minor: Meter Number Validation**

**Current Status:** No specific validation for meter numbers

**Recommended:**
Add meter number length validation (typically 11-13 digits for Nigerian DISCOs)

**Location:**

- `vtu.service.ts` - `validateMeterNumber` method
- `verify-meter.dto.ts` and `pay-electricity.dto.ts`

---

### 4. ⚠️ **Enhancement: Response Field Mapping**

**Current Implementation:**
The electricity payment response uses generic fields and may not capture all electricity-specific data from VTPass.

**VTPass Returns (Prepaid):**

- `token` - Meter token (most important!)
- `units` - kWh units purchased
- `tokenAmount` - Actual token amount
- `tariff` - Tariff class
- `customerName`, `customerAddress`, `meterNumber`
- Plus many other fields (see electricity.md lines 164-190)

**VTPass Returns (Postpaid):**

- `customerName`, `customerAddress`
- `utilityName`, `exchangeReference`, `balance`
- No token (postpaid doesn't generate tokens)

**Recommended:**
Return more detailed electricity-specific fields in the response, especially the meter token for prepaid.

---

### 5. ⚠️ **Enhancement: Minimum Amount Validation**

**Current Implementation:**
Fixed minimum of ₦1,000 for all DISCOs

**From VTPass Response:**
The verification response includes `Minimum_Purchase_Amount` which varies by customer type (MD vs NMD).

**Recommended:**
Consider validating against the actual minimum amount returned from verification.

---

## 📝 Changes Required

### Change 1: Fix Verification Method

**File:** `apps/raverpay-api/src/vtu/services/vtpass.service.ts`

**Method:** `verifyCustomer` (Lines 208-222)

**Change:**
Add support for passing `type` as a separate parameter for electricity verification.

---

### Change 2: Fix Meter Verification ServiceID

**File:** `apps/raverpay-api/src/vtu/services/vtpass.service.ts`

**Method:** `verifyMeterNumber` (Lines 229-236)

**Change:**

- ServiceID should be just the disco name (e.g., "ikeja-electric")
- Pass meterType as separate `type` parameter

---

### Change 3: Fix Electricity Payment ServiceID

**File:** `apps/raverpay-api/src/vtu/services/vtpass.service.ts`

**Method:** `payElectricity` (Lines 426-461)

**Change:**

- ServiceID should be just the disco name (e.g., "ikeja-electric")
- variation_code should be just the meterType ("prepaid" or "postpaid")
- Do NOT concatenate them

---

### Change 4: Enhance Response Handling

**File:** `apps/raverpay-api/src/vtu/vtu.service.ts`

**Method:** `payElectricityBill` (Lines 923-1071)

**Change:**

- Capture and return more electricity-specific fields from VTPass response
- Include: units, tokenAmount, tariff, customerName, customerAddress for prepaid
- Include: customerName, customerAddress, utilityName for postpaid

---

### Change 5: Add Meter Number Validation

**File:** `apps/raverpay-api/src/vtu/dto/verify-meter.dto.ts`
**File:** `apps/raverpay-api/src/vtu/dto/pay-electricity.dto.ts`

**Change:**
Add validation decorator to ensure meter numbers are numeric and have appropriate length (11-13 digits).

---

### Change 6: Update Validation Response

**File:** `apps/raverpay-api/src/vtu/vtu.service.ts`

**Method:** `validateMeterNumber` (Lines 119-142)

**Change:**
Return additional fields from verification response:

- `meterNumber` - Actual meter number from VTPass
- `customerType` - MD or NMD
- `minimumAmount` - Minimum purchase amount
- Additional arrears info if available

---

## 🧪 Testing Scenarios

After fixes, test the following:

### Test 1: Verify Prepaid Meter

- Should successfully verify meter number
- Should return customer name and address
- Should return minimum purchase amount

### Test 2: Verify Postpaid Meter

- Should successfully verify meter number
- Should return customer details
- Should return any arrears if applicable

### Test 3: Pay Prepaid Meter

- Should successfully purchase electricity
- **MUST return meter token**
- Should return units (kWh)
- Should return tariff information

### Test 4: Pay Postpaid Meter

- Should successfully pay bill
- Should NOT return token (postpaid doesn't have tokens)
- Should return confirmation details

### Test 5: Different DISCOs

Test with at least 3 different DISCOs:

- ikeja-electric (Lagos)
- eko-electric (Lagos)
- abuja-electric (Abuja)

---

## 📊 Expected API Structure

### Correct VTPass Verify Request

```json
{
  "billersCode": "1111111111111",
  "serviceID": "ikeja-electric",
  "type": "prepaid"
}
```

### Correct VTPass Payment Request

```json
{
  "request_id": "VTU_ELEC_...",
  "serviceID": "ikeja-electric",
  "billersCode": "1111111111111",
  "variation_code": "prepaid",
  "amount": 2000,
  "phone": "08011111111"
}
```

---

## 🚨 Priority

**HIGH PRIORITY** - Electricity payments will not work at all without these fixes!

The serviceID format issue will cause all electricity transactions to fail with VTPass API errors.

---

## 📚 Reference

Official VTPass Documentation: `md/electricity.md`

- Lines 27-76: Meter Verification
- Lines 77-191: Prepaid Payment
- Lines 193-263: Postpaid Payment

---

**Status:** Ready to Implement
**Estimated Time:** 30-45 minutes
**Risk:** Low (fixes are straightforward)

---
